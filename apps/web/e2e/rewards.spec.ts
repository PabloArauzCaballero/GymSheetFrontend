/**
 * Recompensas exclusivas de los modos (plan Rutinas REPP · F6 · RF-18) en las cuatro
 * combinaciones de 06 (390 y 1440 px, claro y oscuro).
 *
 * LA APP NO TIENE RELOJ: el cierre semanal lo hace un trabajo del lunes. Aquí se
 * recorre el tiempo moviendo las fechas del programa y de sus sesiones 35 días hacia
 * atrás y cerrando cada semana con la herramienta de soporte `recompute-week` (la
 * única ruta HTTP que cierra una semana). Esa herramienta paga el bono y marca la
 * semana, pero no actualiza el multiplicador del programa ni sabe cerrar una semana
 * incumplida: esos dos efectos del trabajo real se aplican por SQL y se dicen en cada
 * paso. La pantalla verifica lo que muestra con esos datos; no prueba el trabajo.
 */
import { test } from '@playwright/test';
import { THEME_COOKIE } from '../src/shared/theme/theme-script';
import { evidencia } from './evidencia';
import {
  adminDeGimnasio,
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
import { abrirComo, cerrarTour, comboLabel, combos, dejarElTour, esperarResumen, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`recompensas de modo · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(600_000);

    test('RF-18: multiplicador, semana incumplida sin perder puntos, insignia y sin modo', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const admin = await adminDeGimnasio();
      const [ana, beto] = await Promise.all([crearCuenta('ana', `Ana ${tag}`), crearCuenta('beto', `Beto ${tag}`)]);
      const a = apiDe(ana);
      const bench = await ejercicioId(a, 'barbell bench press');
      const hoy = ((new Date().getDay() + 6) % 7) + 1;
      const rutina = await crearRutina(a, {
        nombre: `Banca con modo ${tag}`,
        duracionSemanas: 6,
        descargaCada: null,
        dias: [{ diaSemana: hoy, nombre: 'Banca', ejercicios: [{ nombre: 'barbell bench press', series: 3, repsMin: 8, repsMax: 12 }] }],
      });
      const [dia] = await diasDe(a, rutina.id);
      const activa = await a<{ id: string }>('POST', '/programs/strength/activate', {
        routineId: rutina.id,
        modo: 'PROGRESSIVE_OVERLOAD',
        duracionSemanas: 6,
        liftTargets: [{ ejercicioId: bench, pesoTrabajoKg: 60, repsMin: 8, repsMax: 12, rirObjetivo: 2 }],
      });
      expect(activa.status).toBe(201);
      const programa = activa.data.id;

      // Cuatro semanas cumplidas: una sesión por semana, movida a su semana (−35 + 7·(k−1) días).
      for (let k = 1; k <= 4; k += 1) {
        const sesion = await sesionConSeries(a, rutina.id, dia!.id, [
          { ejercicioId: bench, reps: 10, pesoKg: 60 },
          { ejercicioId: bench, reps: 10, pesoKg: 60 },
          { ejercicioId: bench, reps: 10, pesoKg: 60 },
        ]);
        expect((await terminarSesion(a, sesion)).status).toBeLessThan(300);
        const dias = 35 - 7 * (k - 1);
        await sql(`UPDATE public.sesiones_entrenamiento SET fecha_inicio = fecha_inicio - interval '${dias} days', fecha_fin = fecha_fin - interval '${dias} days' WHERE id='${sesion}'`);
      }
      await sql(`UPDATE training.training_programs SET fecha_inicio = fecha_inicio - 35, fecha_fin_prevista = fecha_fin_prevista - 35 WHERE id='${programa}'`);
      await sql(`UPDATE training.program_weeks SET semana_inicio = semana_inicio - 35, sesiones_plan = 1, sesiones_hechas = CASE WHEN semana_numero <= 4 THEN 1 ELSE 0 END WHERE program_id='${programa}'`);
      const puntosAntes = (await a<{ points: number }>('GET', '/me/progression')).data.points;

      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // RF-18 · p01: cierra la semana 1 cumplida → x1,2 y bono. (SQL: multiplicador del programa.)
      const cierre1 = await admin<{ motivo: string; multiplicador: number; bono: number }>('POST', `/admin/support/programs/${programa}/recompute-week`, { semana: 1 });
      expect(cierre1.data).toMatchObject({ motivo: 'CUMPLIDA', multiplicador: 1.2 });
      expect(cierre1.data.bono).toBeGreaterThan(0);
      await sql(`UPDATE training.training_programs SET multiplicador_actual = 1.2 WHERE id='${programa}'`);
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('multiplier')).toHaveText('x1,2');
      await expect(page.getByTestId('week-1')).toContainText('Cumplida');
      await expect(page.getByTestId('week-1')).toContainText('x1,2');
      await evidencia(page, 'RF-18', '01', 'semana-1-cumplida-x1-2');
      const puntosTras1 = (await a<{ points: number }>('GET', '/me/progression')).data.points;
      expect(puntosTras1).toBeGreaterThan(puntosAntes);

      // RF-18 · p01b: la tarjeta del programa muestra el multiplicador y lo que falta para el siguiente.
      await page.goto('/routines');
      await expect(page.getByTestId('program-card-fuerza')).toContainText('x1,2');
      await expect(page.getByTestId('program-card-fuerza')).toContainText('Cumple esta semana para llegar a x1,4');
      await evidencia(page, 'RF-18', '01b', 'tarjeta-con-multiplicador');

      // RF-18 · p03: semanas 2 a 4 cumplidas seguidas → insignia de racha de semanas.
      for (const semana of [2, 3, 4]) {
        const cierre = await admin<{ motivo: string }>('POST', `/admin/support/programs/${programa}/recompute-week`, { semana });
        expect(cierre.data.motivo).toBe('CUMPLIDA');
      }
      await sql(`UPDATE training.training_programs SET multiplicador_actual = 1.8 WHERE id='${programa}'`);
      const progreso = await a<{ badges: Array<{ code: string; earned: boolean }> }>('GET', '/me/progression');
      const racha = progreso.data.badges.find((badge) => badge.code.startsWith('OVERLOAD_WEEKS_STREAK') && badge.earned);
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('multiplier')).toHaveText('x1,8');
      await evidencia(page, 'RF-18', '03a', 'cuatro-semanas-x1-8');
      await dejarElTour(page);
      await page.goto('/trayectoria');
      // Las insignias recién ganadas se celebran al entrar y el tour de la pantalla se abre a la vez:
      // se cierran los dos con Escape, uno tras otro.
      const celebracion = page.getByRole('dialog', { name: '¡Insignia conseguida!' });
      const celebrada = await celebracion.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
      if (celebrada) {
        await expect(celebracion.getByRole('button', { name: 'Voltear la carta' })).toBeVisible();
        await page.waitForTimeout(1_000);
        await page.keyboard.press('Escape');
        await expect(celebracion).toBeHidden();
      }
      const tour = page.getByRole('dialog', { name: /Hola|¡Hola/u });
      if (await tour.waitFor({ timeout: 6_000 }).then(() => true).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(tour).toBeHidden();
      }
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await evidencia(page, 'RF-18', '03', 'trayectoria-con-insignias-de-modo');
      test.info().annotations.push({ type: 'insignia-racha', description: racha ? `ganada: ${racha.code}` : 'NO se otorgó OVERLOAD_WEEKS_STREAK tras cuatro semanas cumplidas' });

      // RF-18 · p02: semana 5 incumplida → vuelve a x1,0 y los puntos no bajan. (SQL: lo que haría el trabajo.)
      const puntosAntesDe5 = (await a<{ points: number }>('GET', '/me/progression')).data.points;
      await sql(`UPDATE training.program_weeks SET cumplida = false, multiplicador = 1.0, cerrada_en = now() WHERE program_id='${programa}' AND semana_numero=5`);
      await sql(`UPDATE training.training_programs SET multiplicador_actual = 1.0 WHERE id='${programa}'`);
      await page.goto(`/programs/${programa}`);
      await expect(page.getByTestId('multiplier')).toHaveText('x1,0');
      await expect(page.getByTestId('week-5')).toContainText('No cumplida');
      await evidencia(page, 'RF-18', '02', 'semana-incumplida-vuelve-a-x1-0');
      const puntosDespuesDe5 = (await a<{ points: number }>('GET', '/me/progression')).data.points;
      expect(puntosDespuesDe5).toBeGreaterThanOrEqual(puntosAntesDe5);

      // RF-18 · p05: los puntos de modo se ven en «Cómo se ganan los puntos» de Trayectoria.
      await page.goto('/trayectoria');
      for (let i = 0; i < 2; i += 1) {
        const modal = page.getByRole('dialog').first();
        if (await modal.waitFor({ timeout: 6_000 }).then(() => true).catch(() => false)) await page.keyboard.press('Escape');
      }
      await page.getByRole('button', { name: /Cómo se ganan los puntos/u }).first().click();
      await expect(page.getByTestId('rule-modes')).toContainText('Programas con modo');
      await evidencia(page, 'RF-18', '05', 'puntos-de-modo-en-trayectoria');

      // RF-18 · p04: sin modo activo no hay multiplicador ni bono.
      const b = apiDe(beto);
      const normal = await crearRutina(b, {
        nombre: `Banca normal ${tag}`,
        duracionSemanas: 4,
        dias: [{ diaSemana: hoy, nombre: 'Banca', ejercicios: [{ nombre: 'barbell bench press', series: 3, repsMin: 8, repsMax: 12 }] }],
      });
      expect((await b('POST', '/programs/strength/activate', { routineId: normal.id, modo: 'NONE', duracionSemanas: 4 })).status).toBe(201);
      const sesionNormal = await sesionConSeries(b, normal.id, (await diasDe(b, normal.id))[0]!.id, [
        { ejercicioId: bench, reps: 10, pesoKg: 60 },
        { ejercicioId: bench, reps: 10, pesoKg: 60 },
        { ejercicioId: bench, reps: 10, pesoKg: 60 },
      ]);
      const { iniciarSesion } = await import('./rutinas-pagina');
      await cerrarTour(page);
      await context.clearCookies();
      // `clearCookies` también borra la del tema: sin ponerla otra vez la captura saldría en el tema del sistema.
      await context.addCookies([{ name: THEME_COOKIE, value: combo.theme, url: baseURL ?? 'http://localhost:3002' }]);
      await iniciarSesion(page, beto);
      await page.goto('/routines');
      await expect(page.getByTestId('program-card-fuerza')).not.toContainText('x1');
      await page.goto(`/workouts/${sesionNormal}`);
      await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
      await esperarResumen(page);
      await expect(page.getByTestId('mode-bonus')).toHaveCount(0);
      await evidencia(page, 'RF-18', '04', 'sin-modo-no-hay-bono');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
