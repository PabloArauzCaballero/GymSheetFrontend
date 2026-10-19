/**
 * Plan de cardio y registro de sesiones (plan Rutinas REPP · F6 · RF-17) en las
 * cuatro combinaciones de 06 (390 y 1440 px, claro y oscuro).
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, ejercicioId, etiquetaUnica, sesionDeCardio } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`cardio · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(480_000);

    test('RF-17: asistente con zonas, registro, progreso semanal y plan por esfuerzo', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', `Ana ${tag}`);
      const a = apiDe(ana);
      const bici = await ejercicioId(a, 'stationary bike walk');
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // RF-17 · p01: Bici, L-X-V, 30 min, zonas con su FC (máx. 180, reposo 60 → Z2 132–144).
      await page.goto('/cardio/new');
      await expect(page.getByRole('button', { name: 'Bici', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Lunes' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Miércoles' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Viernes' })).toHaveAttribute('aria-pressed', 'true');
      await page.getByLabel('Pulso en reposo (lpm)').fill('60');
      await page.getByLabel('FC máxima (lpm)').fill('180');
      const zonas = page.getByTestId('zones');
      await expect(zonas).toContainText('132–144 lpm');
      await expect(zonas).toContainText('Z2 · Suave');
      await evidencia(page, 'RF-17', '01', 'asistente-zonas-con-su-fc');
      await page.getByRole('button', { name: 'Activar plan de cardio' }).click();
      await expect(page).toHaveURL(/\/routines/u);
      await expect(page.getByTestId('program-card-cardio')).toContainText('Bici 30 min');

      // RF-17 · p02: registrar 32 min, zona 2, esfuerzo 4.
      await page.goto('/cardio/registrar');
      await page.getByLabel('Actividad').selectOption({ label: 'stationary bike walk' });
      await page.getByLabel('Minutos').fill('32');
      await page.getByLabel('Distancia (km)').fill('8,4');
      await page.getByLabel('Pulso medio (lpm)').fill('140');
      await page.getByLabel('Esfuerzo (1–10)').fill('4');
      await evidencia(page, 'RF-17', '02a', 'registro-de-la-sesion');
      await page.getByRole('button', { name: 'Guardar sesión' }).click();
      const resultado = page.getByTestId('cardio-result');
      await expect(resultado).toContainText('Cuentan 32 min');
      // La primera semana es parcial (solo cuentan los días que faltan), así que el objetivo depende del día en que se corra.
      await expect(resultado).toContainText(/32 \/ \d+ min esta semana/u);
      await evidencia(page, 'RF-17', '02', 'sesion-guardada');

      // RF-17 · p03: con dos sesiones más, el progreso semanal «96 / N min» en el programa (N = minutos objetivo de la semana parcial).
      expect((await sesionDeCardio(a, bici, { minutos: 32, fcMedia: 140 })).status).toBeLessThan(300);
      expect((await sesionDeCardio(a, bici, { minutos: 32, fcMedia: 140 })).status).toBeLessThan(300);
      const programa = (await a<{ cardio: { id: string } }>('GET', '/programs/active')).data.cardio.id;
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('week-1')).toContainText(/96 \/ \d+ min/u);
      await evidencia(page, 'RF-17', '03', 'progreso-semanal-96-minutos');

      // RF-17 · p04: un plan por esfuerzo percibido (sin pulsómetro) se crea igual.
      await page.goto('/cardio/new');
      await page.getByRole('button', { name: 'Por sensación (1–10)' }).click();
      await page.getByRole('button', { name: 'Esfuerzo 5' }).click();
      await expect(page.getByTestId('rpe-hint')).toContainText('zona 3');
      await evidencia(page, 'RF-17', '04a', 'plan-por-esfuerzo');
      // Con un plan ya activo el servidor pide confirmar el reemplazo (409): es parte del flujo.
      vigilante.permitir({ status: 409, url: /\/programs\/cardio\/activate$/u });
      vigilante.permitirConsola(/\[notifications\]/u);
      await page.getByRole('button', { name: 'Activar plan de cardio' }).click();
      await page.getByRole('button', { name: 'Apagar y activar' }).click();
      await expect(page.getByTestId('program-card-cardio')).toContainText('Bici 30 min');
      await evidencia(page, 'RF-17', '04', 'plan-sin-pulsometro-activo');

      // Validación: sin días no se puede activar.
      await page.goto('/cardio/new');
      for (const dia of ['Lunes', 'Miércoles', 'Viernes']) await page.getByRole('button', { name: dia }).click();
      await page.getByRole('button', { name: 'Activar plan de cardio' }).click();
      await expect(page.getByText('Elige al menos un día.')).toBeVisible();
      await evidencia(page, 'RF-17', '05', 'sin-dias-no-activa');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
