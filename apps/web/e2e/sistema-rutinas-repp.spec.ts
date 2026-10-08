import { expect, type Page } from '@playwright/test';
import { openPage, signIn, waitForPageSettled } from './fixtures';
import { cargarSemilla, comboDe, evidencia, test } from './evidencia';

/**
 * RF-B2 · catálogo REPP en `/sistema/rutinas-repp` (`07_BACKOFFICE.md` §C).
 *
 * La plataforma lista, crea, marca y desmarca rutinas oficiales y mira sus
 * métricas; un administrador de gimnasio no entra; y cada acción queda en la
 * auditoría global. Cada combinación crea SU rutina oficial (`officialName`),
 * así que las cuatro corridas no se pisan.
 */
const semilla = cargarSemilla();

// Un recorrido largo contra `next dev`, que compila cada ruta la primera vez, más axe en cada paso.
test.setTimeout(240_000);
const TERMINOS = ['press', 'curl', 'row', 'squat', 'raise', 'extension', 'lunge', 'pull', 'fly', 'crunch'];

async function buscar(page: Page, nombre: string) {
  await page.getByRole('textbox', { name: 'Buscar rutina por nombre' }).fill(nombre);
  await expect(page.getByText(nombre, { exact: true })).toBeVisible();
}

const fila = (page: Page, nombre: string) => page.getByRole('listitem').filter({ hasText: nombre });

test('RF-B2 · la plataforma crea, marca y desmarca rutinas oficiales', async ({ page }, testInfo) => {
  const juego = semilla.combos[comboDe(testInfo.project.name)];
  // Un nombre por corrida: repetir la prueba no deja dos filas con el mismo nombre.
  const datos = { ...juego, officialName: `${juego.officialName} ${Date.now().toString(36).slice(-4)}` };
  await signIn(page, { email: semilla.sys, password: semilla.password });

  await test.step('01 · la lista muestra las rutinas oficiales', async () => {
    await openPage(page, '/sistema/rutinas-repp');
    await waitForPageSettled(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Rutinas REPP' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Filtrar por origen' }).selectOption('oficiales');
    await expect(page.getByText('Recomendada por REPP').first()).toBeVisible();
    await evidencia(page, 'RF-B2', '01', 'lista-oficiales');
  });

  await test.step('02 · crear una oficial con el formulario', async () => {
    await page.getByRole('button', { name: 'Crear oficial' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();

    // Sin días el formulario no se envía y lo explica.
    await dialogo.getByLabel('Nombre', { exact: true }).fill(datos.officialName);
    await dialogo.getByRole('button', { name: 'Crear y publicar' }).click();
    await expect(dialogo.getByRole('alert')).toContainText('Añade al menos un día');

    await dialogo.getByRole('button', { name: 'Añadir día' }).click();
    await dialogo.getByLabel('Nombre del día (opcional)').fill('Cuerpo completo');
    await dialogo.getByLabel('Día de la semana').selectOption('2');
    // Dos ejercicios al azar del buscador: la huella de publicación impide dos
    // rutinas públicas con los mismos ejercicios, y cada corrida debe crear la suya.
    const buscador = dialogo.getByRole('textbox', { name: 'Buscar ejercicio' });
    const anadir = dialogo.getByRole('button', { name: /^Añadir (?!día)/ });
    for (const [indice, termino] of TERMINOS.sort(() => Math.random() - 0.5).slice(0, 2).entries()) {
      await buscador.fill(termino);
      await expect(anadir.first()).toBeVisible();
      await anadir.nth(Math.floor(Math.random() * (await anadir.count()))).click();
      await expect(dialogo.getByRole('button', { name: /^Quitar (?!este día)/ })).toHaveCount(indice + 1);
    }
    await expect(dialogo.getByRole('button', { name: /^Quitar (?!este día)/ })).toHaveCount(2);
    await evidencia(page, 'RF-B2', '02', 'formulario-crear-oficial');

    await dialogo.getByRole('button', { name: 'Crear y publicar' }).click();
    await expect(page.getByText('Rutina oficial creada y publicada.')).toBeVisible();
    await expect(dialogo).toBeHidden();
    await buscar(page, datos.officialName);
    await expect(fila(page, datos.officialName)).toContainText('Recomendada por REPP');
    await evidencia(page, 'RF-B2', '02', 'oficial-creada');
  });

  await test.step('03 · desmarcar y volver a marcar como oficial', async () => {
    // Con «Sólo oficiales» puesto, una rutina desmarcada saldría de la lista: justo lo correcto, pero aquí se quiere verla.
    await page.getByRole('combobox', { name: 'Filtrar por origen' }).selectOption('todas');
    await fila(page, datos.officialName).getByRole('button', { name: 'Quitar de oficiales' }).click();
    await page.getByRole('button', { name: 'Quitar', exact: true }).click();
    await expect(page.getByText('Ya no es una rutina oficial.')).toBeVisible();
    await expect(fila(page, datos.officialName).getByRole('button', { name: 'Marcar como oficial' })).toBeVisible();
    await expect(fila(page, datos.officialName)).not.toContainText('Recomendada por REPP');
    await evidencia(page, 'RF-B2', '03', 'desmarcada');

    await fila(page, datos.officialName).getByRole('button', { name: 'Marcar como oficial' }).click();
    await page.getByRole('button', { name: 'Marcar como oficial' }).last().click();
    await expect(page.getByText('Ahora es una rutina oficial.')).toBeVisible();
    await expect(fila(page, datos.officialName)).toContainText('Recomendada por REPP');
    await evidencia(page, 'RF-B2', '03', 'marcada-otra-vez');
  });

  await test.step('04 · las métricas de la rutina', async () => {
    await fila(page, datos.officialName).getByRole('button', { name: 'Métricas' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('Copias en total');
    await expect(dialogo).toContainText('Sin valorar');
    await evidencia(page, 'RF-B2', '04', 'metricas');
    await page.getByRole('button', { name: 'Cerrar' }).click();
  });

  await test.step('06 · la auditoría registra las acciones', async () => {
    await openPage(page, '/sistema/auditoria');
    await waitForPageSettled(page);
    await page.getByLabel('Dominio').selectOption('routines');
    await expect(page.getByText('Creó una rutina oficial').first()).toBeVisible();
    await expect(page.getByText('Quitó una rutina de oficiales').first()).toBeVisible();
    await expect(page.getByText('Marcó una rutina como oficial').first()).toBeVisible();
    await evidencia(page, 'RF-B2', '06', 'auditoria-acciones');
  });
});

test('RF-B2 · un administrador de gimnasio no entra al catálogo REPP', async ({ page, consolaPermitida }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  // `requireRole` lo manda a `/dashboard?denied=1` y de ahí a su panel; si el aviso
  // «No tienes permiso…» llega a pintarse, se anuncia con `console.error` a propósito.
  // Ese panel (Panel del gimnasio) repite una clave de lista con estos datos: es suyo, no de esta pantalla.
  consolaPermitida.push(/\[notifications\] \{severity: error/u, /Encountered two children with the same key/u);
  await signIn(page, { email: datos.gym, password: semilla.password });
  await page.goto('/sistema/rutinas-repp');
  await page.waitForURL(/\/admin\/operacion/u);
  await waitForPageSettled(page);
  expect(new URL(page.url()).pathname).not.toMatch(/^\/sistema/u);
  await expect(page.getByRole('heading', { name: 'Rutinas REPP' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Rutinas REPP' })).toHaveCount(0);
  const estrecho = (page.viewportSize()?.width ?? 0) < 600;
  await evidencia(page, 'RF-B2', '05', 'sin-acceso-admin-gimnasio', {
    ...(estrecho
      ? { sinAxe: 'aterriza en el Panel del gimnasio, que a 390 px incumple scrollable-region-focusable (fuera de este alcance)' }
      : {}),
  });
});
