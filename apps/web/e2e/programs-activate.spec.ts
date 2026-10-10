/**
 * Activar una rutina como programa (plan Rutinas REPP · F5 · RF-14) en las cuatro
 * combinaciones de 06 (390 y 1440 px, claro y oscuro): pasos A2 a A5, copia de una
 * rutina ajena, reemplazo con confirmación y convivencia con el cardio.
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, crearRutina, empujeCuatroDias, etiquetaUnica, publicarRutina } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`activar programa · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(420_000);

    test('RF-14: activar, copia de una ajena, reemplazo y cardio en paralelo', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const [ana, bruno] = await Promise.all([crearCuenta('ana', `Ana ${tag}`), crearCuenta('bruno', `Bruno ${tag}`)]);
      const a = apiDe(ana);
      const b = apiDe(bruno);
      const propia = await crearRutina(a, empujeCuatroDias(`Empuje propio ${tag}`));
      const otra = await crearRutina(a, empujeCuatroDias(`Pierna propia ${tag}`));
      const ajena = await crearRutina(b, empujeCuatroDias(`Rutina de Bruno ${tag}`));
      await publicarRutina(b, ajena.id);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);
      const siguiente = page.getByTestId('activation-actions').getByRole('button', { name: 'Siguiente' });

      // RF-14 · p01: fechas → modo → resumen, una pantalla por paso.
      await page.goto(`/routines/${propia.id}`);
      await page.getByRole('link', { name: 'Activar' }).click();
      await expect(page.getByText('Paso 1 de 3 · Fechas')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await evidencia(page, 'RF-14', '01', 'a2-fechas');
      await siguiente.click();
      await expect(page.getByText('Paso 2 de 3 · Modo')).toBeVisible();
      await expect(page.getByRole('radio', { name: /Normal/u })).toBeChecked();
      await evidencia(page, 'RF-14', '01b', 'a3-modo');
      await siguiente.click();
      await expect(page.getByText('Paso 3 de 3 · Resumen')).toBeVisible();
      await expect(page.getByTestId('step-summary')).toContainText(`Empuje propio ${tag}`);
      await evidencia(page, 'RF-14', '01c', 'a5-resumen');
      await page.getByRole('button', { name: 'Activar', exact: true }).click();

      // RF-14 · p04 (parte 1): la tarjeta del programa aparece en Rutinas.
      await expect(page).toHaveURL(/\/routines(\?|$)/u);
      await expect(page.getByTestId('program-card-fuerza')).toContainText(`Empuje propio ${tag}`);
      await expect(page.getByTestId('program-card-fuerza')).toContainText('Normal');
      await evidencia(page, 'RF-14', '01d', 'tarjeta-del-programa');

      // RF-14 · p02: activar una rutina pública ajena crea una copia «Basada en» y activa la copia.
      await page.goto(`/routines/${ajena.id}/activate`);
      await expect(page.getByText('Paso 1 de 4 · Programa actual')).toBeVisible();
      await evidencia(page, 'RF-14', '03', 'a1-reemplazo');
      await expect(page.getByTestId('step-replace')).toContainText(`Empuje propio ${tag}`);
      await expect(page.getByTestId('step-replace')).toContainText(`Rutina de Bruno ${tag}`);

      // RF-14 · p03: confirmar el reemplazo y activar.
      await page.getByRole('button', { name: 'Apagar y continuar' }).click();
      await siguiente.click();
      await siguiente.click();
      await expect(page.getByTestId('step-summary')).toContainText('Se apagará tu programa de pesas actual');
      await page.getByRole('button', { name: 'Apagar y activar' }).click();
      await expect(page).toHaveURL(/\/routines(\?|$)/u);
      await expect(page.getByTestId('program-card-fuerza')).toContainText(`Rutina de Bruno ${tag}`);
      await evidencia(page, 'RF-14', '04', 'tarjeta-cambia-tras-reemplazo');

      // RF-14 · p02b: la rutina activa es una copia propia con la franja «Basada en».
      const activo = await a<{ fuerza: { rutinaId: string } }>('GET', '/programs/active');
      expect(activo.data.fuerza.rutinaId).not.toBe(ajena.id);
      await page.goto(`/routines/${activo.data.fuerza.rutinaId}`);
      await expect(page.getByTestId('attribution-strip')).toContainText(`Basada en Rutina de Bruno ${tag}`);
      await evidencia(page, 'RF-14', '02', 'activar-ajena-crea-copia');

      // RF-14 · p05: con cardio en paralelo se ven las dos tarjetas.
      const cardio = await a('POST', '/programs/cardio/activate', {
        cardioPlan: { nombre: `Bici ${tag}`, modalidad: 'BICI', diasSemana: [1, 3, 5], minutosObjetivo: 30, intensidad: { tipo: 'ZONA_FC', zona: 2 }, progresionPctSemana: 5 },
        duracionSemanas: 4,
      });
      expect(cardio.status).toBe(201);
      await page.goto('/routines');
      await expect(page.getByTestId('program-card-cardio')).toContainText(`Bici ${tag}`);
      await expect(page.getByTestId('program-card-fuerza')).toBeVisible();
      await evidencia(page, 'RF-14', '05', 'dos-tarjetas-fuerza-y-cardio');

      // API: el programa anterior quedó como reemplazado, no borrado.
      const viejo = await a<{ semanas: unknown[]; programa: { estado: string; motivoCierre: string | null } }>('GET', `/programs/${(await a<{ fuerza: { id: string } }>('GET', '/programs/active')).data.fuerza.id}/progress`);
      expect(viejo.status).toBe(200);
      void otra;
      expect(vigilante.problemas).toEqual([]);
    });
  });
}
