import { expect, type Page } from '@playwright/test';
import { openPage, signIn, waitForPageSettled } from './fixtures';
import { backendComo, cargarSemilla, comboDe, evidencia, test } from './evidencia-admin';

/**
 * RF-B3 · soporte de entrenamiento en `/admin/usuarios/[id]/entrenamiento`
 * (`07_BACKOFFICE.md` §C).
 *
 * Soporte abre la ficha de un socio desde la lista de usuarios, recalcula una
 * semana vencida (con confirmación y resultado), comprueba que repetirlo no
 * paga dos veces, y quien sólo puede leer ve el botón desactivado. Los datos
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
  await signIn(page, { email: datos.gym, password: semilla.password });

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

test('RF-B3 · quien sólo puede leer ve el botón desactivado', async ({ page }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  await signIn(page, { email: datos.reader, password: semilla.password });
  await openPage(page, `/admin/usuarios/${datos.memberA.id}/entrenamiento?nombre=${encodeURIComponent(datos.memberA.nombre)}`);
  await waitForPageSettled(page);
  await expect(page.getByRole('heading', { level: 1, name: `Entrenamiento de ${datos.memberA.nombre}` })).toBeVisible();
  const boton = page.getByRole('button', { name: 'Recalcular la semana 1' });
  await expect(boton).toBeDisabled();
  await expect(boton).toHaveAttribute('title', /support:respond/u);
  await evidencia(page, 'RF-B3', '03', 'boton-desactivado-sin-permiso');
});

test('RF-B3 · sin support:read no se abre la ficha', async ({ page, consolaPermitida }, testInfo) => {
  const datos = semilla.combos[comboDe(testInfo.project.name)];
  // `redirect('/admin?denied=1')` deja a esta cuenta, que no tiene permisos de soporte, en
  // `/admin`; si el aviso «No tienes permiso…» llega a pintarse, se anuncia con `console.error` a propósito.
  consolaPermitida.push(/\[notifications\] \{severity: error/u);
  // El administrador del OTRO gimnasio no tiene permisos de soporte.
  await signIn(page, { email: semilla.other, password: semilla.password });
  await page.goto(`/admin/usuarios/${datos.memberA.id}/entrenamiento`);
  await page.waitForURL((url) => url.pathname === '/admin' && url.searchParams.get('denied') === '1');
  await waitForPageSettled(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Entrenamiento de/u })).toHaveCount(0);
  await evidencia(page, 'RF-B3', '04', 'sin-permiso-de-lectura');
});
