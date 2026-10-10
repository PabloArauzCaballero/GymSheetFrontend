/**
 * Cierre del programa (plan Rutinas REPP · F5 · RF-19) en las cuatro combinaciones
 * de 06 (390 y 1440 px, claro y oscuro). No hay reloj en la app: el fin del programa
 * se prepara moviendo sus fechas en la base (`fecha_inicio`/`fecha_fin_prevista`) y
 * dando por cumplidas tres semanas; la pantalla se verifica tal cual.
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, crearRutina, diasDe, ejercicioId, etiquetaUnica, sesionConSeries, sql, terminarSesion } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`cierre del programa · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(480_000);

    test('RF-19: pantalla de cierre, repetir con cargas nuevas y apagar con cardio vivo', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', `Ana ${tag}`);
      const a = apiDe(ana);
      const bench = await ejercicioId(a, 'barbell bench press');
      const hoy = ((new Date().getDay() + 6) % 7) + 1;
      const rutina = await crearRutina(a, {
        nombre: `Ciclo corto ${tag}`,
        duracionSemanas: 4,
        descargaCada: null,
        dias: [{ diaSemana: hoy, nombre: 'Banca', ejercicios: [{ nombre: 'barbell bench press', series: 3, repsMin: 8, repsMax: 12 }] }],
      });
      const [dia] = await diasDe(a, rutina.id);
      const activar = () =>
        a<{ id: string }>('POST', '/programs/strength/activate', {
          routineId: rutina.id,
          modo: 'PROGRESSIVE_OVERLOAD',
          duracionSemanas: 4,
          replace: true,
          liftTargets: [{ ejercicioId: bench, pesoTrabajoKg: 60, repsMin: 8, repsMax: 12, rirObjetivo: 2 }],
        });
      const cardio = await a('POST', '/programs/cardio/activate', {
        cardioPlan: { nombre: `Remo ${tag}`, modalidad: 'REMO', diasSemana: [2, 4], minutosObjetivo: 25, intensidad: { tipo: 'RPE', rpe: 5 }, progresionPctSemana: 5 },
        duracionSemanas: 4,
      });
      expect(cardio.status).toBe(201);
      const primero = (await activar()).data.id;
      const sesion = await sesionConSeries(a, rutina.id, dia!.id, [
        { ejercicioId: bench, reps: 12, pesoKg: 60 },
        { ejercicioId: bench, reps: 12, pesoKg: 60 },
        { ejercicioId: bench, reps: 12, pesoKg: 60 },
      ]);
      expect((await terminarSesion(a, sesion)).status).toBeLessThan(300);
      // El programa «terminó» ayer: cuatro semanas, tres cumplidas.
      await sql(`UPDATE training.training_programs SET fecha_inicio = current_date - 28, fecha_fin_prevista = current_date - 1 WHERE id='${primero}'`);
      await sql(`UPDATE training.program_weeks SET cumplida = true, multiplicador = 1.4 WHERE program_id='${primero}' AND semana_numero <= 3`);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // RF-19 · p02: la pantalla de cierre con el resumen y tres opciones.
      await page.goto(`/programs/${primero}`);
      const cierre = page.getByTestId('close-program');
      await expect(cierre).toContainText(`Terminaste «Ciclo corto ${tag}»`);
      for (const opcion of ['Repetir con las cargas nuevas', 'Elegir otra rutina', 'Apagar']) {
        await expect(cierre).toContainText(opcion);
      }
      await expect(page.getByTestId('week-1')).toContainText('Cumplida');
      await evidencia(page, 'RF-19', '02', 'pantalla-de-cierre');

      // RF-19 · p03: Repetir → programa nuevo que parte de las cargas actuales (62,5 kg).
      await cierre.getByRole('button', { name: 'Repetir', exact: true }).click();
      await expect(page).toHaveURL(/\/programs\//u);
      await expect(page).not.toHaveURL(new RegExp(primero, 'u'));
      await expect(page.getByTestId('next-loads')).toContainText('Sugerido: 62,5 kg × 8–12');
      await evidencia(page, 'RF-19', '03', 'repetir-con-cargas-nuevas');
      const viejo = await a<{ programa: { estado: string; motivoCierre: string | null } }>('GET', `/programs/${primero}/progress`);
      expect(viejo.data.programa.estado).toBe('FINISHED');

      // RF-19 · p04: Apagar → sin programa de pesas y el cardio sigue.
      const segundo = (await a<{ fuerza: { id: string } }>('GET', '/programs/active')).data.fuerza.id;
      await sql(`UPDATE training.training_programs SET fecha_inicio = current_date - 28, fecha_fin_prevista = current_date - 1 WHERE id='${segundo}'`);
      await page.goto(`/programs/${segundo}`);
      await page.getByTestId('close-program').getByRole('button', { name: 'Apagar', exact: true }).click();
      await expect(page).toHaveURL(/\/routines/u);
      await expect(page.getByTestId('program-card-fuerza')).toHaveCount(0);
      await expect(page.getByTestId('program-card-cardio')).toContainText(`Remo ${tag}`);
      await evidencia(page, 'RF-19', '04', 'apagar-el-cardio-sigue');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
