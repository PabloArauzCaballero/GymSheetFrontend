import { expect, type Page } from '@playwright/test';
import { openPage, operateGym, signIn, waitForPageSettled } from './fixtures';
import { backendComo, cargarSemilla, comboDe, evidencia, test } from './evidencia-admin';

/**
 * RF-B3 · soporte de entrenamiento en `/admin/usuarios/[id]/entrenamiento`
 * (`07_BACKOFFICE.md` §C).
 *
 * Soporte abre la ficha de un socio desde la lista de usuarios, recalcula una
 * semana vencida (con confirmación y resultado) y comprueba que repetirlo no
 * paga dos veces. Desde la franja 7a soporte es el administrador de plataforma
 * operando el gimnasio del socio; otra persona del gimnasio no entra. Los datos
 * salen de `scripts/seed-evidencia-rutinas.mjs`: el socio A entrenó la semana 1
 * sin que se contara (recalcular la cumple) y el socio B no entrenó (sigue sin
 * cumplirse).
 */
const semilla = cargarSemilla();

// Un recorrido largo contra `next dev`, que compila cada ruta la primera vez, más axe en cada paso.
test.setTimeout(240_000);

async function abrirFicha(page: Page, socio: { id: string; email: string; nombre: string }) {
  await openPage(page, '/admin/usuarios');
  await waitForPageSettled(page);
  await page.getByRole('textbox', { name: 'Buscar por nombre o correo' }).fill(socio.email);
  // Por id y no por nombre: las siembras anteriores dejaron socios con el mismo nombre.
  await page.locator(`a[href*="/admin/usuarios/${socio.id}/entrenamiento"]`).click();
  await page.waitForURL(/\/entrenamiento/u);
  await expect(page.getByRole('heading', { level: 1, name: `Entrenamiento de ${socio.nombre}` })).toBeVisible();
}

const confirmar = (page: Page) => page.getByRole('button', { name: 'Recalcular', exact: true }).click();

test('RF-B3 · soporte ve el entrenamiento de un socio y recalcula una semana', async ({ page }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  await signIn(page, { email: semilla.sys, password: semilla.password });
  await operateGym(page, datos.tenantId);

  await test.step('01 · la ficha reúne programas, semanas, invitaciones y sesiones', async () => {
    await abrirFicha(page, datos.memberA);
    await expect(page.getByRole('heading', { name: 'Programas' })).toBeVisible();
    await expect(page.getByText('Semana 1', { exact: true })).toBeVisible();
    await expect(page.getByText('No cumplida')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invitaciones recibidas' })).toBeVisible();
    await expect(page.getByText('Pendiente')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Últimas sesiones' })).toBeVisible();
    await expect(page.getByText('3 series')).toBeVisible();
    await evidencia(page, 'RF-B3', '01', 'ficha-entrenamiento');
  });

  await test.step('02 · recalcular la semana otorga el bono una sola vez', async () => {
    await page.getByRole('button', { name: 'Recalcular la semana 1' }).click();
    await expect(page.getByRole('dialog')).toContainText('nunca resta puntos');
    await evidencia(page, 'RF-B3', '02', 'confirmar-recalculo');
    await confirmar(page);
    await expect(page.getByRole('status').filter({ hasText: 'ahora cuenta como cumplida' })).toBeVisible();
    await expect(page.getByText('Semana cumplida')).toBeVisible();
    await evidencia(page, 'RF-B3', '02', 'semana-recalculada');

    // Repetirlo da el mismo resultado de fondo: no paga dos veces.
    await page.getByRole('button', { name: 'Recalcular la semana 1' }).click();
    await confirmar(page);
    await expect(page.getByRole('status').filter({ hasText: 'la semana ya estaba cumplida' })).toBeVisible();
    await expect(page.getByText('Semana cumplida')).toHaveCount(1);
    await evidencia(page, 'RF-B3', '02', 'recalculo-idempotente');
  });

  await test.step('02 · una semana sin sesiones sigue sin cumplirse', async () => {
    await abrirFicha(page, datos.memberB);
    await page.getByRole('button', { name: 'Recalcular la semana 1' }).click();
    await confirmar(page);
    await expect(page.getByRole('status').filter({ hasText: 'sigue sin cumplirse' })).toBeVisible();
    await evidencia(page, 'RF-B3', '02', 'semana-sigue-sin-cumplir');
  });

  await test.step('el backend lo guardó y lo auditó', async () => {
    const sistema = await backendComo(semilla.sys, semilla.password);
    const ficha = await sistema.get<{ programas: Array<{ semanas: Array<{ numero: number; cumplida: boolean | null }>; bonos: unknown[] }> }>(
      `/admin/support/users/${datos.memberA.id}/training`,
    );
    expect(ficha.programas[0]?.semanas[0]).toMatchObject({ numero: 1, cumplida: true });
    expect(ficha.programas[0]?.bonos).toHaveLength(1);
    const auditoria = await sistema.get<{ items: Array<{ action: string; targetId: string | null }> }>(
      '/admin/audit?domain=support&limit=50',
    );
    expect(auditoria.items.some((e) => e.action === 'recompute-week' && e.targetId === datos.memberA.programId)).toBe(true);
  });
});

/**
 * Support is the platform admin's alone. The seeded `gymMember` is another person
 * of the member's own gym (what a former staff account is since franja 7d, ADR-0029):
 * the role guard sends it back to the person portal with the denied notice, and the
 * backend answers 403 both to reading the training and to recomputing a week.
 */
test('RF-B3 · otra persona del gimnasio no ve ni recalcula el entrenamiento de un socio', async ({ page, consolaPermitida }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  // The «No tienes permiso…» notice is announced with `console.error` on purpose.
  consolaPermitida.push(/\[notifications\] \{severity: error/u);
  await signIn(page, { email: datos.gymMember, password: semilla.password });
  await page.goto(`/admin/usuarios/${datos.memberA.id}/entrenamiento`);
  await page.waitForURL((url) => !url.pathname.startsWith('/admin'));
  expect(new URL(page.url()).searchParams.get('denied')).toBe('1');
  await waitForPageSettled(page);
  await expect(page.getByRole('heading', { name: /Entrenamiento de/u })).toHaveCount(0);

  // The client door is not the authority: the backend refuses the same calls.
  const ficha = await page.request.get(`/api/backend/admin/support/users/${datos.memberA.id}/training`);
  expect(ficha.status()).toBe(403);
  const recalculo = await page.request.post(`/api/backend/admin/support/programs/${datos.memberB.programId}/recompute-week`, {
    data: { semana: 1 },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(recalculo.status()).toBe(403);
  await evidencia(page, 'RF-B3', '04', 'admin-de-gimnasio-sin-acceso');
});
