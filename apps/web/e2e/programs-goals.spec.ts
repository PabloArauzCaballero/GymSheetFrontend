/**
 * Metas de marca (plan Rutinas REPP · F5 · RF-16) en las cuatro combinaciones de 06
 * (390 y 1440 px, claro y oscuro): marca actual → 1RM estimado, meta con sugerencia
 * «realista», avance hacia la meta y meta lograda.
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, crearRutina, diasDe, ejercicioId, etiquetaUnica, sesionConSeries, terminarSesion } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect, esperarResumen } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`metas de marca · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(480_000);

    test('RF-16: 1RM estimado, meta, avance y meta lograda', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', `Ana ${tag}`);
      const a = apiDe(ana);
      const bench = await ejercicioId(a, 'barbell bench press');
      const hoy = ((new Date().getDay() + 6) % 7) + 1;
      const rutina = await crearRutina(a, {
        nombre: `Banca metas ${tag}`,
        duracionSemanas: 12,
        dias: [{ diaSemana: hoy, nombre: 'Banca', ejercicios: [{ nombre: 'barbell bench press', series: 3, repsMin: 3, repsMax: 5 }] }],
      });
      const [dia] = await diasDe(a, rutina.id);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      await page.goto(`/routines/${rutina.id}/activate`);
      const siguiente = page.getByTestId('activation-actions').getByRole('button', { name: 'Siguiente' });
      await siguiente.click();
      await page.getByRole('radio', { name: /Metas de marca/u }).check();
      await siguiente.click();
      const lift = page.getByTestId(`lift-${bench}`);

      // RF-16 · p01: marca actual 100 kg × 5 → «1RM estimado: 116,7 kg».
      await lift.getByLabel('Marca actual (kg)').fill('100');
      await lift.getByLabel('Repeticiones', { exact: true }).fill('5');
      await expect(lift.getByTestId('e1rm')).toContainText('1RM estimado: 116,7 kg');
      await evidencia(page, 'RF-16', '01', 'e1rm-116-7');

      // RF-16 · p02: la meta de 125 kg en 12 semanas con la sugerencia «realista».
      await lift.getByLabel('Meta (kg)').fill('125');
      await expect(lift.getByTestId('goal-hint')).toContainText('entre 123 y 128 kg');
      await evidencia(page, 'RF-16', '02', 'meta-125-sugerencia-realista');
      await siguiente.click();
      await expect(page.getByTestId('step-summary')).toContainText('125 kg');
      await page.getByRole('button', { name: 'Activar', exact: true }).click();
      await expect(page.getByTestId('program-card-fuerza')).toContainText('Metas de marca');
      const programa = (await a<{ fuerza: { id: string } }>('GET', '/programs/active')).data.fuerza.id;

      // RF-16 · p03: a mitad de camino, la barra hacia la meta (110 × 5 ≈ 128,3 > 125, así que se usa 105 × 5).
      const media = await sesionConSeries(a, rutina.id, dia!.id, [
        { ejercicioId: bench, reps: 5, pesoKg: 105 },
        { ejercicioId: bench, reps: 5, pesoKg: 105 },
        { ejercicioId: bench, reps: 5, pesoKg: 105 },
      ]);
      expect((await terminarSesion(a, media)).status).toBeLessThan(300);
      await page.goto(`/programs/${programa}`);
      const metas = page.getByTestId('goals');
      await expect(metas).toContainText('barbell bench press');
      await expect(metas.getByRole('progressbar')).toBeVisible();
      await evidencia(page, 'RF-16', '03', 'avance-hacia-la-meta');

      // RF-16 · p04: una serie con e1RM ≥ meta → resumen con la meta lograda y aviso en la bandeja.
      const logro = await sesionConSeries(a, rutina.id, dia!.id, [
        { ejercicioId: bench, reps: 5, pesoKg: 110 },
        { ejercicioId: bench, reps: 5, pesoKg: 110 },
        { ejercicioId: bench, reps: 5, pesoKg: 110 },
      ]);
      await page.goto(`/workouts/${logro}`);
      await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
      await expect(page.getByTestId('program-session')).toContainText('Nueva marca');
      await esperarResumen(page);
      await evidencia(page, 'RF-16', '04', 'meta-lograda-en-el-resumen');
      await page.getByRole('button', { name: 'Seguir' }).click();
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('goals')).toContainText('Meta lograda');
      await evidencia(page, 'RF-16', '04b', 'meta-lograda-en-el-programa');
      await page.goto('/notifications');
      await expect(page.getByText(/Nueva marca/u).first()).toBeVisible();
      await evidencia(page, 'RF-16', '04c', 'aviso-meta-alcanzada');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
