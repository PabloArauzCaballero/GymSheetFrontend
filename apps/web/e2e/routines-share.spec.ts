/**
 * Compartir una rutina privada con invitación (plan Rutinas REPP · F4 · RF-13) con
 * dos cuentas reales y cada una en su navegador, en las cuatro combinaciones de 06
 * (390 y 1440 px, claro y oscuro).
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, crearRutina, empujeCuatroDias, etiquetaUnica } from './rutinas-datos';
import { abrirComo, abrirSegundo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`compartir rutinas · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(480_000);

    test('RF-13: invitar, aceptar, rechazar y revocar entre dos cuentas', async ({ page, context, browser, baseURL }) => {
      const tag = etiquetaUnica();
      // El nombre de Bruno lleva la etiqueta: la búsqueda del directorio lo encuentra solo a él.
      const [ana, bruno] = await Promise.all([
        crearCuenta('ana', 'Ana Autora'),
        crearCuenta('bruno', `Bruno${tag} Beta`),
      ]);
      const a = apiDe(ana);
      const privada = await crearRutina(a, empujeCuatroDias(`Empuje privado ${tag}`));
      const otra = await crearRutina(a, empujeCuatroDias(`Pierna privada ${tag}`));
      const tercera = await crearRutina(a, empujeCuatroDias(`Torso privado ${tag}`));

      const vigAna = await abrirComo(page, context, baseURL, combo, ana);
      const bruna = await abrirSegundo(browser, baseURL, combo, bruno);

      // RF-13 · p01: Ana busca a Bruno en «Compartir con…»; el resultado no enseña su email.
      await page.goto(`/routines/${privada.id}`);
      await page.getByRole('button', { name: 'Compartir' }).click();
      const dialogo = page.getByRole('dialog', { name: 'Compartir rutina' });
      await dialogo.getByLabel('Buscar personas').fill(`Bruno${tag}`);
      const resultados = dialogo.getByTestId('share-results');
      await expect(resultados).toContainText(`Bruno${tag}`);
      await expect(resultados).not.toContainText('@');
      await resultados.getByRole('checkbox').check();
      await expect(dialogo.getByTestId('share-picked')).toContainText(`Bruno${tag}`);
      await evidencia(page, 'RF-13', '01', 'buscar-persona');

      // RF-13 · p02: Enviar → «Compartida con: Bruno · Pendiente».
      await dialogo.getByRole('button', { name: 'Enviar invitación' }).click();
      const compartida = page.getByTestId('shared-with');
      await expect(compartida).toContainText(`Bruno${tag}`);
      await expect(compartida).toContainText('Pendiente');
      await evidencia(page, 'RF-13', '02', 'compartida-con-pendiente');

      // RF-13 · p03: Bruno la ve en su bandeja de avisos con el texto exacto.
      await bruna.page.goto('/notifications');
      await expect(bruna.page.getByText(`Ana Autora te compartió la rutina "Empuje privado ${tag}"`)).toBeVisible();
      await evidencia(bruna.page, 'RF-13', '03', 'aviso-de-invitacion');

      // RF-13 · p04: en Mías › Compartidas conmigo, la invitación sin ejercicios.
      await bruna.page.goto(`/routines?tab=mias&sub=compartidas&q=${tag}`);
      const invitacion = bruna.page.getByTestId('invitation-card').filter({ hasText: `Empuje privado ${tag}` });
      await expect(invitacion).toBeVisible();
      await expect(invitacion).toContainText('Verás los ejercicios cuando la aceptes');
      await evidencia(bruna.page, 'RF-13', '04', 'tarjeta-de-invitacion');

      // RF-13 · p05: abrir el detalle por URL antes de aceptar está bloqueado (SHARE_PENDING).
      bruna.vigilante.permitir({ status: 403, url: new RegExp(`/routines/${privada.id}$`, 'u') });
      bruna.vigilante.permitirConsola(/\[notifications\]/u);
      await bruna.page.goto(`/routines/${privada.id}`);
      const pendiente = bruna.page.getByTestId('pending-invitation');
      await expect(pendiente).toContainText('Acepta la invitación para ver sus ejercicios');
      await expect(bruna.page.getByTestId('day-sheet')).toHaveCount(0);
      await evidencia(bruna.page, 'RF-13', '05', 'detalle-bloqueado-antes-de-aceptar');

      // RF-13 · p06: aceptar muestra la rutina completa.
      await pendiente.getByRole('button', { name: 'Aceptar' }).click();
      await expect(bruna.page.getByRole('heading', { name: `Empuje privado ${tag}`, level: 1 })).toBeVisible();
      await expect(bruna.page.getByTestId('day-sheet')).toBeVisible();
      await evidencia(bruna.page, 'RF-13', '06', 'aceptada-ve-todo');

      // RF-13 · p07: Ana recibe «Bruno aceptó tu rutina».
      await page.goto('/notifications');
      await expect(page.getByText(`Bruno${tag} Beta aceptó tu rutina "Empuje privado ${tag}"`)).toBeVisible();
      await evidencia(page, 'RF-13', '07', 'aviso-de-aceptacion');

      // RF-13 · p08: con Rechazar, Ana recibe «no aceptó» y Bruno no la ve.
      expect((await a('POST', `/routines/${otra.id}/shares`, { usuarioIds: [bruno.id] })).status).toBe(201);
      await bruna.page.goto(`/routines?tab=mias&sub=compartidas&q=${tag}`);
      const segunda = bruna.page.getByTestId('invitation-card').filter({ hasText: `Pierna privada ${tag}` });
      await segunda.getByRole('button', { name: 'Rechazar' }).click();
      await expect(segunda).toHaveCount(0);
      await expect(bruna.page.getByText('Invitación rechazada.')).toBeVisible();
      await evidencia(bruna.page, 'RF-13', '08', 'rechazada-bruno-no-la-ve');
      await page.goto('/notifications');
      await expect(page.getByText(`Bruno${tag} Beta no aceptó tu rutina "Pierna privada ${tag}"`)).toBeVisible();
      await evidencia(page, 'RF-13', '08b', 'aviso-de-rechazo');

      // RF-13 · p09: Ana revoca la que Bruno aceptó y Bruno deja de verla.
      await page.goto(`/routines/${privada.id}`);
      await page.getByRole('button', { name: new RegExp(`Revocar la invitación de Bruno${tag}`, 'u') }).click();
      await page.getByRole('button', { name: 'Revocar', exact: true }).last().click();
      await expect(page.getByTestId('shared-with')).toContainText('Revocada');
      await evidencia(page, 'RF-13', '09', 'revocada');
      bruna.vigilante.permitir({ status: 404, url: new RegExp(`/routines/${privada.id}$`, 'u') });
      bruna.vigilante.permitirConsola(/\[notifications\]/u);
      await bruna.page.goto(`/routines/${privada.id}`);
      await expect(bruna.page.getByRole('alert').filter({ hasText: 'No se pudo cargar la información' })).toBeVisible();
      await evidencia(bruna.page, 'RF-13', '09b', 'bruno-ya-no-la-ve');

      // API: invitar dos veces se omite y compartir una pública se rechaza.
      expect((await a('POST', `/routines/${tercera.id}/shares`, { usuarioIds: [bruno.id] })).status).toBe(201);
      const repetida = await a<{ creados: unknown[]; omitidos: Array<{ motivo: string }> }>('POST', `/routines/${tercera.id}/shares`, { usuarioIds: [bruno.id, ana.id] });
      expect(repetida.data.creados).toHaveLength(0);
      expect(repetida.data.omitidos.map((item) => item.motivo).sort()).toEqual(['ES_EL_AUTOR', 'YA_INVITADO']);

      expect(vigAna.problemas).toEqual([]);
      expect(bruna.vigilante.problemas).toEqual([]);
      await bruna.context.close();
    });
  });
}
