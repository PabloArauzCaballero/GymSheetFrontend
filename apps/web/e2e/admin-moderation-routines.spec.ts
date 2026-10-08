import { expect, type Page } from '@playwright/test';
import { openPage, signIn, waitForPageSettled } from './fixtures';
import { backendComo, cargarSemilla, comboDe, evidencia, test } from './evidencia';

/**
 * RF-B1 · moderación de los tipos nuevos (`07_BACKOFFICE.md` §C).
 *
 * Un administrador de gimnasio recorre la cola con rutinas, ejercicios y
 * comentarios denunciados mezclados con los tipos de siempre, abre cada caso,
 * oculta una rutina, restaura otra y comprueba que un administrador de OTRO
 * gimnasio no ve nada. Cada paso del plan deja su captura (DoD-3).
 *
 * Los datos salen de `scripts/seed-evidencia-rutinas.mjs`: un juego por
 * combinación, que estos pasos gastan (ocultar y restaurar cierran casos), así
 * que repetir la corrida exige sembrar de nuevo.
 */
const semilla = cargarSemilla();

// Un recorrido largo contra `next dev`, que compila cada ruta la primera vez, más axe en cada paso.
test.setTimeout(240_000);

type AdminRoutinePage = { items: Array<{ nombre: string; estadoModeracion: string }> };

async function estadoDeLaRutina(page: Page, nombre: string): Promise<string | undefined> {
  const response = await page.request.get(`/api/backend/admin/routines?q=${encodeURIComponent(nombre)}&limit=5`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { data: AdminRoutinePage };
  return body.data.items.find((item) => item.nombre === nombre)?.estadoModeracion;
}

const fila = (page: Page, texto: string) => page.getByRole('button').filter({ hasText: texto }).first();

test('RF-B1 · la cola entiende rutinas, ejercicios y comentarios', async ({ page }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  await signIn(page, { email: datos.gym, password: semilla.password });

  await test.step('01 · la cola mezcla los tipos nuevos con los de siempre', async () => {
    await openPage(page, '/admin/moderacion');
    await waitForPageSettled(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Moderación' })).toBeVisible();
    for (const etiqueta of ['Rutina', 'Ejercicio', 'Comentario', 'Perfil']) {
      await expect(page.getByRole('button').filter({ hasText: etiqueta }).first()).toBeVisible();
    }
    for (const motivo of ['Ejercicio peligroso', 'Información engañosa', 'Plagio', 'Acoso o intimidación']) {
      await expect(page.getByText(motivo).first()).toBeVisible();
    }
    await evidencia(page, 'RF-B1', '01', 'cola-tipos-nuevos');
  });

  await test.step('02 · cada caso enseña una vista previa de su tipo', async () => {
    await fila(page, 'Ejercicio peligroso').click();
    const previa = page.getByTestId('vista-previa');
    await expect(previa).toContainText(datos.dangerous.nombre);
    await expect(previa.getByTestId('alcance')).toContainText('2 con una copia activa');
    await expect(previa).toContainText('2 días');
    await expect(page.getByText('Contenido retirado')).toBeVisible();
    await evidencia(page, 'RF-B1', '02', 'vista-previa-rutina');

    await fila(page, 'Información engañosa').click();
    await expect(page.getByTestId('vista-previa')).toContainText(datos.privateExercise.nombre);
    await evidencia(page, 'RF-B1', '02', 'vista-previa-ejercicio');

    await fila(page, 'Acoso o intimidación').filter({ hasText: 'Comentario' }).click();
    await expect(page.getByTestId('vista-previa')).toContainText('Insulta al autor de la rutina.');
    await evidencia(page, 'RF-B1', '02', 'vista-previa-comentario');
  });

  await test.step('03 · tomar el caso y ocultar la rutina avisa al autor', async () => {
    await fila(page, 'Plagio').click();
    await expect(page.getByTestId('vista-previa')).toContainText(datos.plagiarized.nombre);
    await page.getByRole('button', { name: 'Tomar el caso' }).click();
    await expect(page.getByText('Caso asignado a ti.')).toBeVisible();
    await page.getByRole('button', { name: 'Ocultar contenido' }).click();
    await expect(page.getByText('Caso resuelto.')).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: 'Plagio' })).toHaveCount(0);
    await evidencia(page, 'RF-B1', '03', 'rutina-ocultada');

    expect(await estadoDeLaRutina(page, datos.plagiarized.nombre)).toBe('OCULTA_MODERACION');
    const autor = await backendComo(datos.author, semilla.password);
    const avisos = await autor.get<{ items: Array<{ subject?: string; asunto?: string }> }>('/notifications/me');
    expect(JSON.stringify(avisos)).toContain('Ocultamos tu contenido');
  });

  await test.step('04 · restaurar una rutina oculta la deja visible otra vez', async () => {
    expect(await estadoDeLaRutina(page, datos.dangerous.nombre)).toBe('OCULTA_AUTO');
    await fila(page, 'Ejercicio peligroso').click();
    const restaurar = page.getByRole('button', { name: 'Restaurar contenido' });
    await expect(restaurar).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ocultar contenido' })).toHaveCount(0);
    await evidencia(page, 'RF-B1', '04', 'boton-restaurar');
    await restaurar.click();
    await expect(page.getByText('Caso resuelto.')).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: 'Ejercicio peligroso' })).toHaveCount(0);
    await evidencia(page, 'RF-B1', '04', 'rutina-restaurada');
    expect(await estadoDeLaRutina(page, datos.dangerous.nombre)).toBe('VISIBLE');
  });
});

test('RF-B1 · el administrador de otro gimnasio no ve los casos', async ({ page }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  await signIn(page, { email: semilla.other, password: semilla.password });
  await openPage(page, '/admin/moderacion');
  await waitForPageSettled(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Moderación' })).toBeVisible();
  await expect(page.getByText('Ana Autora')).toHaveCount(0);
  await expect(page.getByText(datos.memberB.nombre)).toHaveCount(0);
  await evidencia(page, 'RF-B1', '05', 'otro-gimnasio-sin-casos');
});

test('RF-B1 · la plataforma modera lo público desde /sistema/moderacion', async ({ page }) => {
  await signIn(page, { email: semilla.sys, password: semilla.password });
  await openPage(page, '/sistema/moderacion');
  await waitForPageSettled(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Moderación' })).toBeVisible();
  await evidencia(page, 'RF-B1', '06', 'sistema-moderacion-global');
});
