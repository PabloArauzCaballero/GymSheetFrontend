/**
 * Detalle de rutina con vista Semana / Mes (plan Rutinas REPP · F3 · RF-02), con
 * captura en cada paso en las cuatro combinaciones (390 y 1440 px, claro y oscuro).
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import { apiDe, crearCuenta, crearRutina, empujeCuatroDias, ejercicioId, etiquetaUnica } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`detalle de rutina · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(300_000);

    test('RF-02: Semana, Mes, hoja del día, ficha, volver y rutina antigua', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', 'Ana Autora');
      const a = apiDe(ana);
      const rutina = await crearRutina(a, empujeCuatroDias(`Empuje 4 días ${tag}`));
      const antigua = await a<{ id: string }>('POST', '/routines', { nombre: `Rutina antigua ${tag}`, visibilidad: 'PRIVATE', objetivo: 'FUERZA' });
      await a('POST', `/routines/${antigua.data.id}/exercises`, { ejercicioId: await ejercicioId(a, 'barbell lunge'), orden: 1, seriesObjetivo: 3 });

      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // RF-02 · p01: cabecera y vista Semana.
      await page.goto(`/routines/${rutina.id}`);
      await expect(page.getByRole('heading', { name: `Empuje 4 días ${tag}`, level: 1 })).toBeVisible();
      await expect(page.getByText('Hipertrofia · 4 días/sem · 3 meses')).toBeVisible();
      await expect(page.getByText('Semana 1 de 12')).toBeVisible();
      await expect(page.getByTestId('day-sheet')).toContainText('Empuje');
      await evidencia(page, 'RF-02', '01', 'detalle-semana');

      // RF-02 · p02: Mes — doce semanas, con S4, S8 y S12 de descarga.
      await page.getByRole('radio', { name: 'Mes' }).click();
      await expect(page.getByRole('table', { name: 'Vista Mes' })).toBeVisible();
      for (const n of [4, 8, 12]) await expect(page.getByTestId(`month-week-${n}`)).toContainText('Descarga');
      await expect(page.getByTestId('month-week-3')).not.toContainText('Descarga');
      await evidencia(page, 'RF-02', '02', 'mes-con-descargas');

      // RF-02 · p03: S2 › martes abre la hoja con las series de esa semana.
      await page.getByRole('button', { name: /^Semana 2, martes/u }).click();
      const hoja = page.getByTestId('day-sheet');
      await expect(hoja).toContainText('Semana 2');
      await expect(hoja).toContainText('Tirón');
      await expect(hoja).toContainText('barbell deadlift');
      await expect(page).toHaveURL(/vista=mes/u);
      await evidencia(page, 'RF-02', '03', 'hoja-del-dia-s2-martes');

      // RF-02 · p04: un ejercicio abre su ficha.
      await hoja.getByRole('link', { name: /barbell deadlift/u }).click();
      await expect(page).toHaveURL(/\/exercises\//u);
      await expect(page.getByRole('heading', { name: /barbell deadlift/iu }).first()).toBeVisible();
      await evidencia(page, 'RF-02', '04', 'ficha-del-ejercicio');

      // RF-02 · p05: volver cae en Mes, semana 2 y el mismo día.
      await page.goBack();
      await expect(page.getByRole('table', { name: 'Vista Mes' })).toBeVisible();
      await expect(page.getByTestId('day-sheet')).toContainText('Semana 2');
      await expect(page.getByTestId('day-sheet')).toContainText('Tirón');
      await evidencia(page, 'RF-02', '05', 'volver-conserva-mes');

      // RF-02 · p06: la rutina anterior a los días se dice «de un día (cualquier día)».
      await page.goto(`/routines/${antigua.data.id}`);
      await expect(page.getByRole('heading', { name: 'Rutina de un día (cualquier día)' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Mes' })).toHaveCount(0);
      await expect(page.getByTestId('day-sheet')).toContainText('barbell lunge');
      await evidencia(page, 'RF-02', '06', 'rutina-antigua-un-dia');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
