import { expect, type Page } from '@playwright/test';
import { openPage, signIn, waitForPageSettled } from './fixtures';
import { backendComo, cargarSemilla, comboDe, evidencia, test } from './evidencia-admin';

/**
 * RF-B1 · moderación de los tipos nuevos (`07_BACKOFFICE.md` §C), hecha por el
 * equipo central de REPP (backend ADR-0018).
 *
 * Una cuenta `MODERATOR` (la de la combinación, que el administrador de
 * plataforma sumó al equipo por la API) recorre la cola central (todos los
 * gimnasios) con rutinas, ejercicios y comentarios denunciados mezclados con
 * los tipos de siempre, abre cada caso, oculta una rutina, restaura otra y ve
 * el veredicto; un `ADMIN` heredado del gimnasio ya no entra a la consola ni
 * puede tomar un caso: el backend le responde 403. Cada paso del plan deja su
 * captura (DoD-3).
 *
 * Los datos salen de `scripts/seed-evidencia-rutinas.mjs`: un juego por
 * combinación, en su propio gimnasio y con nombres que llevan la combinación
 * (la cola mezcla los cuatro), que estos pasos gastan (ocultar y restaurar
 * cierran casos), así que repetir la corrida exige sembrar de nuevo.
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

// The queue mixes every gym: a case is found by its reason AND the combo's own account.
const fila = (page: Page, texto: string, de: string) =>
  page.getByRole('button').filter({ hasText: texto }).filter({ hasText: de }).first();

test('RF-B1 · la cola entiende rutinas, ejercicios y comentarios', async ({ page }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  const autora = `Ana Autora ${comboDe(testInfo.project.name)}`;
  await signIn(page, { email: datos.moderator, password: semilla.password });

  await test.step('01 · la cola mezcla los tipos nuevos con los de siempre', async () => {
    await openPage(page, '/moderacion');
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
    await fila(page, 'Ejercicio peligroso', autora).click();
    const previa = page.getByTestId('vista-previa');
    await expect(previa).toContainText(datos.dangerous.nombre);
    await expect(previa.getByTestId('alcance')).toContainText('2 con una copia activa');
    await expect(previa).toContainText('2 días');
    await expect(page.getByText('Contenido retirado')).toBeVisible();
    await evidencia(page, 'RF-B1', '02', 'vista-previa-rutina');

    await fila(page, 'Información engañosa', autora).click();
    await expect(page.getByTestId('vista-previa')).toContainText(datos.privateExercise.nombre);
    await evidencia(page, 'RF-B1', '02', 'vista-previa-ejercicio');

    await fila(page, 'Acoso o intimidación', datos.memberB.nombre).filter({ hasText: 'Comentario' }).click();
    // The case file carries the comment itself (ADR-0018 §9); the reporter's words stay in the report list.
    await expect(page.getByTestId('vista-previa')).toContainText(datos.comment.texto);
    await expect(page.getByText('Insulta al autor de la rutina.')).toBeVisible();
    await evidencia(page, 'RF-B1', '02', 'vista-previa-comentario');
  });

  await test.step('03 · tomar el caso y ocultar la rutina avisa al autor', async () => {
    await fila(page, 'Plagio', autora).click();
    await expect(page.getByTestId('vista-previa')).toContainText(datos.plagiarized.nombre);
    await page.getByRole('button', { name: 'Tomar el caso' }).click();
    await expect(page.getByText('Caso asignado a ti.')).toBeVisible();
    await page.getByRole('button', { name: 'Ocultar contenido' }).click();
    await expect(page.getByText('Caso resuelto.')).toBeVisible();
    await expect(page.getByTestId('ultimo-veredicto')).toContainText('Contenido oculto');
    await expect(page.getByRole('button').filter({ hasText: 'Plagio' }).filter({ hasText: autora })).toHaveCount(0);
    await evidencia(page, 'RF-B1', '03', 'rutina-ocultada');

    expect(await estadoDeLaRutina(page, datos.plagiarized.nombre)).toBe('OCULTA_MODERACION');
    const autor = await backendComo(datos.author, semilla.password);
    const avisos = await autor.get<{ items: Array<{ subject?: string; asunto?: string }> }>('/notifications/me');
    expect(JSON.stringify(avisos)).toContain('Ocultamos contenido tuyo');
  });

  await test.step('04 · restaurar una rutina oculta la deja visible otra vez', async () => {
    expect(await estadoDeLaRutina(page, datos.dangerous.nombre)).toBe('OCULTA_AUTO');
    await fila(page, 'Ejercicio peligroso', autora).click();
    const restaurar = page.getByRole('button', { name: 'Restaurar contenido' });
    await expect(restaurar).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ocultar contenido' })).toHaveCount(0);
    await evidencia(page, 'RF-B1', '04', 'boton-restaurar');
    await restaurar.click();
    await expect(page.getByText('Caso resuelto.')).toBeVisible();
    await expect(page.getByTestId('ultimo-veredicto')).toContainText('Sin infracción');
    await expect(
      page.getByRole('button').filter({ hasText: 'Ejercicio peligroso' }).filter({ hasText: autora }),
    ).toHaveCount(0);
    await evidencia(page, 'RF-B1', '04', 'rutina-restaurada');
    expect(await estadoDeLaRutina(page, datos.dangerous.nombre)).toBe('VISIBLE');
  });
});

test('RF-B1 · el personal del gimnasio ya no modera', async ({ page }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  // An ADMIN of the very gym whose content was reported: being its staff gives no say.
  await signIn(page, { email: datos.legacyAdmin, password: semilla.password });
  await openPage(page, '/moderacion');
  await waitForPageSettled(page);
  // The client door sends it away; the backend is the authority and answers 403.
  await expect(page).not.toHaveURL(/\/moderacion/u);
  await expect(page.getByRole('heading', { level: 1, name: 'Moderación' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Moderación' })).toHaveCount(0);
  const cola = await page.request.get('/api/backend/admin/moderation/queue');
  expect(cola.status()).toBe(403);
  // Nor can it act on a case of its own gym (403 at the role guard, no side effect).
  const tomar = await page.request.post(`/api/backend/admin/moderation/cases/ROUTINE/${datos.dangerous.id}/claim`, {
    headers: { origin: new URL(page.url()).origin },
  });
  expect(tomar.status()).toBe(403);
  await evidencia(page, 'RF-B1', '05', 'gimnasio-sin-moderacion');
});

test('RF-B1 · la plataforma también modera, desde la misma consola', async ({ page }) => {
  await signIn(page, { email: semilla.sys, password: semilla.password });
  // The old platform address keeps working: it redirects to the shared console.
  await openPage(page, '/sistema/moderacion');
  await waitForPageSettled(page);
  await expect(page).toHaveURL(/\/moderacion$/u);
  await expect(page.getByRole('heading', { level: 1, name: 'Moderación' })).toBeVisible();
  await evidencia(page, 'RF-B1', '06', 'sistema-moderacion-global');
});
