/**
 * «¿Actualizar la rutina con estos cambios?» al terminar una sesión (plan Rutinas
 * REPP · F5 · RF-20) en las cuatro combinaciones de 06 (390 y 1440 px, claro y oscuro).
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, crearRutina, diasDe, ejercicioId, etiquetaUnica, sesionConSeries } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect, esperarResumen } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`actualizar la rutina desde la sesión · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(480_000);

    test('RF-20: hoja con la lista de cambios, Actualizar y Solo esta vez', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', `Ana ${tag}`);
      const a = apiDe(ana);
      const bench = await ejercicioId(a, 'barbell bench press');
      const press = await ejercicioId(a, 'barbell seated overhead press');
      const lunge = await ejercicioId(a, 'barbell lunge');
      const hoy = ((new Date().getDay() + 6) % 7) + 1;
      const rutina = await crearRutina(a, {
        nombre: `Empuje editable ${tag}`,
        duracionSemanas: 8,
        dias: [
          {
            diaSemana: hoy,
            nombre: 'Empuje',
            ejercicios: [
              { nombre: 'barbell bench press', series: 3, repsMin: 8, repsMax: 12, pesoKg: 60 },
              { nombre: 'barbell seated overhead press', series: 3, repsMin: 8, repsMax: 10, pesoKg: 40 },
            ],
          },
        ],
      });
      const [dia] = await diasDe(a, rutina.id);
      expect((await a('POST', '/programs/strength/activate', { routineId: rutina.id, modo: 'NONE', duracionSemanas: 8 })).status).toBe(201);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // Una sesión que cambia el peso del press de banca (60 → 65) y añade zancadas.
      const sesionConCambios = async () => {
        const id = await sesionConSeries(a, rutina.id, dia!.id, [
          { ejercicioId: bench, reps: 8, pesoKg: 65 },
          { ejercicioId: bench, reps: 8, pesoKg: 65 },
          { ejercicioId: bench, reps: 8, pesoKg: 65 },
          { ejercicioId: press, reps: 8, pesoKg: 40 },
          { ejercicioId: press, reps: 8, pesoKg: 40 },
          { ejercicioId: press, reps: 8, pesoKg: 40 },
        ]);
        const extra = await a<{ id: string }>('POST', `/workouts/${id}/exercises`, { ejercicioId: lunge, orden: 3 });
        expect(extra.status).toBeLessThan(300);
        for (const n of [1, 2]) {
          expect((await a('POST', `/workouts/session-exercises/${extra.data.id}/sets`, { tipoSerie: 'FUERZA', numeroSerie: n, repeticiones: 10, pesoKg: 30, rir: 2, descansoSegAnterior: 60 })).status).toBeLessThan(300);
        }
        return id;
      };

      // RF-20 · p01: la hoja con la lista de cambios.
      const primera = await sesionConCambios();
      await page.goto(`/workouts/${primera}`);
      await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
      const hoja = page.getByTestId('update-routine');
      await expect(hoja).toContainText('¿Actualizar la rutina con estos cambios?');
      await expect(hoja).toContainText('barbell bench press: peso 65 kg');
      await expect(hoja).toContainText('Se añade barbell lunge');
      await esperarResumen(page);
      await evidencia(page, 'RF-20', '01', 'hoja-con-cambios');

      // RF-20 · p02: Actualizar → la rutina refleja los cambios.
      await hoja.getByRole('button', { name: 'Actualizar' }).click();
      await expect(page.getByText('Rutina actualizada con los cambios de esta sesión.')).toBeVisible();
      await esperarResumen(page);
      await evidencia(page, 'RF-20', '02a', 'rutina-actualizada-aviso');
      await page.getByRole('button', { name: 'Seguir' }).click();
      await page.goto(`/routines/${rutina.id}`);
      await expect(page.getByTestId('day-sheet')).toContainText('barbell lunge');
      await expect(page.getByTestId('day-sheet')).toContainText('65 kg');
      await evidencia(page, 'RF-20', '02', 'rutina-refleja-los-cambios');

      // RF-20 · p03: otra sesión con otro cambio y «Solo esta vez» → la rutina no cambia.
      const segunda = await a<{ id: string }>('POST', `/routines/${rutina.id}/start`, { routineDayId: dia!.id });
      expect(segunda.status).toBe(201);
      const sesionId = segunda.data.id;
      const detalle = await a<{ ejercicios: Array<{ id: string; ejercicio: { id: string } | null }> }>('GET', `/workouts/${sesionId}`);
      const fila = detalle.data.ejercicios.find((item) => item.ejercicio?.id === bench)!;
      for (const n of [1, 2, 3]) {
        await a('POST', `/workouts/session-exercises/${fila.id}/sets`, { tipoSerie: 'FUERZA', numeroSerie: n, repeticiones: 6, pesoKg: 70, rir: 2, descansoSegAnterior: 60 });
      }
      const press2 = detalle.data.ejercicios.find((item) => item.ejercicio?.id === press)!;
      for (const n of [1, 2, 3]) {
        await a('POST', `/workouts/session-exercises/${press2.id}/sets`, { tipoSerie: 'FUERZA', numeroSerie: n, repeticiones: 8, pesoKg: 40, rir: 2, descansoSegAnterior: 60 });
      }
      const lunge2 = detalle.data.ejercicios.find((item) => item.ejercicio?.id === lunge)!;
      for (const n of [1, 2]) {
        await a('POST', `/workouts/session-exercises/${lunge2.id}/sets`, { tipoSerie: 'FUERZA', numeroSerie: n, repeticiones: 10, pesoKg: 30, rir: 2, descansoSegAnterior: 60 });
      }
      await (await import('./rutinas-datos')).sql(`UPDATE public.sesiones_entrenamiento SET fecha_inicio = now() - interval '30 minutes' WHERE id='${sesionId}'`);
      await page.goto(`/workouts/${sesionId}`);
      await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
      const otraHoja = page.getByTestId('update-routine');
      await expect(otraHoja).toContainText('peso 70 kg');
      await otraHoja.getByRole('button', { name: 'Solo esta vez' }).click();
      await expect(page.getByText('Listo: la rutina no cambia.')).toBeVisible();
      await esperarResumen(page);
      await evidencia(page, 'RF-20', '03a', 'solo-esta-vez-aviso');
      await page.getByRole('button', { name: 'Seguir' }).click();
      await page.goto(`/routines/${rutina.id}`);
      await expect(page.getByTestId('day-sheet')).toContainText('65 kg');
      await expect(page.getByTestId('day-sheet')).not.toContainText('70 kg');
      await evidencia(page, 'RF-20', '03', 'rutina-no-cambia');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
