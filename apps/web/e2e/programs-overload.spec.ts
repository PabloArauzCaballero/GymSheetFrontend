/**
 * Sobrecarga progresiva (plan Rutinas REPP · F5 · RF-15) en las cuatro combinaciones
 * de 06 (390 y 1440 px, claro y oscuro): datos de partida, la sesión que sube el peso,
 * la carga sugerida para la próxima y la que baja tras dos fallos seguidos.
 *
 * Las sesiones se preparan por API con 30 minutos de duración (el programa pide al
 * menos 10) y se terminan por pantalla, que es donde se ve el resumen.
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import {
  apiDe,
  crearCuenta,
  crearRutina,
  diasDe,
  ejercicioId,
  etiquetaUnica,
  sesionConSeries,
  sql,
  terminarSesion,
} from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect, esperarResumen } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`sobrecarga progresiva · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(480_000);

    test('RF-15: datos de partida, sube a 62,5, sugerido y baja tras dos fallos', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', `Ana ${tag}`);
      const a = apiDe(ana);
      const bench = await ejercicioId(a, 'barbell bench press');
      const hoy = ((new Date().getDay() + 6) % 7) + 1;
      const rutina = await crearRutina(a, {
        nombre: `Empuje sobrecarga ${tag}`,
        duracionSemanas: 8,
        descargaCada: null,
        dias: [{ diaSemana: hoy, nombre: 'Empuje', ejercicios: [{ nombre: 'barbell bench press', series: 3, repsMin: 8, repsMax: 12 }] }],
      });
      const [dia] = await diasDe(a, rutina.id);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // RF-15 · p01: A4 con press banca 60 kg, 8–12, RIR 2, y el resumen.
      await page.goto(`/routines/${rutina.id}/activate`);
      const siguiente = page.getByTestId('activation-actions').getByRole('button', { name: 'Siguiente' });
      await siguiente.click();
      await page.getByRole('radio', { name: /Sobrecarga progresiva/u }).check();
      await siguiente.click();
      await expect(page.getByText('Paso 3 de 4 · Datos del modo')).toBeVisible();
      const lift = page.getByTestId(`lift-${bench}`);
      await lift.getByLabel('Peso de trabajo (kg)').fill('60');
      await lift.getByLabel('Reps mín.').fill('8');
      await lift.getByLabel('Reps máx.').fill('12');
      await lift.getByLabel('RIR').fill('2');
      await evidencia(page, 'RF-15', '01a', 'a4-datos-sobrecarga');
      await siguiente.click();
      await expect(page.getByTestId('step-summary')).toContainText('Sobrecarga progresiva');
      await expect(page.getByTestId('step-summary')).toContainText('60 kg');
      await evidencia(page, 'RF-15', '01', 'a5-resumen');
      await page.getByRole('button', { name: 'Activar', exact: true }).click();
      await expect(page.getByTestId('program-card-fuerza')).toContainText('Sobrecarga progresiva');
      const programa = (await a<{ fuerza: { id: string } }>('GET', '/programs/active')).data.fuerza.id;

      // RF-15 · p02: tres series de 12 a 60 kg → «Sube a 62,5 kg».
      const sesion = await sesionConSeries(a, rutina.id, dia!.id, [
        { ejercicioId: bench, reps: 12, pesoKg: 60 },
        { ejercicioId: bench, reps: 12, pesoKg: 60 },
        { ejercicioId: bench, reps: 12, pesoKg: 60 },
      ]);
      await page.goto(`/workouts/${sesion}`);
      await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
      const panel = page.getByTestId('program-session');
      await expect(panel).toBeVisible();
      await expect(panel.getByTestId('mode-bonus')).toBeVisible();
      await expect(panel).toContainText('62,5 kg');
      await esperarResumen(page);
      await evidencia(page, 'RF-15', '02', 'resumen-sube-a-62-5');
      await page.getByRole('button', { name: 'Seguir' }).click();

      // RF-15 · p03: la carga sugerida para la próxima sesión.
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('next-loads')).toContainText('Sugerido: 62,5 kg × 8–12');
      await evidencia(page, 'RF-15', '03', 'sugerido-62-5');

      // RF-15 · p03b: durante la sesión, cada ejercicio muestra «Sugerido: 62,5 kg × 8–12».
      const enVivo = await a<{ id: string }>('POST', `/routines/${rutina.id}/start`, { routineDayId: dia!.id });
      await page.goto(`/workouts/${enVivo.data.id}`);
      await expect(page.getByTestId('suggested-load')).toContainText('Sugerido: 62,5 kg × 8–12');
      await evidencia(page, 'RF-15', '03b', 'sugerido-durante-la-sesion');
      await a('PATCH', `/workouts/${enVivo.data.id}/cancel`);

      // RF-15 · p04: dos sesiones seguidas por debajo del mínimo bajan la carga (62,5 × 0,95 ≈ 60).
      for (let vez = 0; vez < 2; vez += 1) {
        const fallida = await sesionConSeries(a, rutina.id, dia!.id, [
          { ejercicioId: bench, reps: 6, pesoKg: 62.5 },
          { ejercicioId: bench, reps: 6, pesoKg: 62.5 },
          { ejercicioId: bench, reps: 6, pesoKg: 62.5 },
        ]);
        expect((await terminarSesion(a, fallida)).status).toBeLessThan(300);
      }
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('next-loads')).toContainText('Sugerido: 60 kg × 8–12');
      await evidencia(page, 'RF-15', '04', 'baja-tras-dos-fallos');

      // RF-15 · p05: en una semana de descarga la carga sugerida va al 90 % (60 × 0,9 = 54, al disco de 1,25: 53,75).
      await sql(`UPDATE training.program_weeks SET es_descarga = true WHERE program_id='${programa}' AND semana_numero=1`);
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('next-loads')).toContainText('descarga');
      await expect(page.getByTestId('next-loads')).toContainText('53,75 kg');
      await evidencia(page, 'RF-15', '05', 'semana-de-descarga');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
