/**
 * Superseries en el editor web (correcciones del TestFlight · C3.d): se crea una
 * rutina con el asistente, se unen dos ejercicios en una superserie A1/A2 con
 * descanso entre ellos, un tercero pasa a «por tiempo», y el detalle del día los
 * muestra agrupados. Cuatro combinaciones de 06 (390 y 1440 px, claro y oscuro).
 */
import { test, type Page } from '@playwright/test';
import { evidencia } from './evidencia';
import { crearCuenta, etiquetaUnica } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

const PRESS = 'barbell bench press';
const INCLINADO = 'barbell incline bench press';
const MANCUERNAS = 'dumbbell bench press';

async function siguiente(page: Page) {
  const antes = page.url();
  await page.getByTestId('wizard-actions').getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).not.toHaveURL(antes);
}

async function anadir(page: Page, nombre: string) {
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(nombre);
  const boton = page.getByRole('button', { name: `Añadir ${nombre}`, exact: true });
  await expect(boton).toBeVisible({ timeout: 30_000 });
  await boton.click();
}

for (const combo of combos) {
  test.describe(`superseries · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(300_000);

    test('C3.d: crear una superserie A1/A2 con descanso y verla en el detalle', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const ana = await crearCuenta('ana', `Ana ${tag}`);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);
      const nombre = `Pecho superserie ${tag}`;

      await page.goto('/routines/new/nombre');
      await page.getByLabel('Nombre de la rutina').fill(nombre);
      await siguiente(page);
      await siguiente(page);
      await page.getByRole('button', { name: 'Hipertrofia' }).click();
      await siguiente(page);
      await siguiente(page);
      await page.getByRole('button', { name: 'Lunes', exact: true }).click();
      await page.goto('/routines/new/dia/1');
      for (const ejercicio of [PRESS, INCLINADO, MANCUERNAS]) await anadir(page, ejercicio);
      await expect(page.getByText('3 ejercicios', { exact: true })).toBeVisible();

      // C3.d · p01: Ver y ordenar, con «Unir con el siguiente» entre cada par.
      await page.getByRole('button', { name: 'Ver y ordenar' }).click();
      await expect(page).toHaveURL(/\/ordenar/u);
      await expect(page.getByRole('button', { name: /^Unir .* con /u })).toHaveCount(2);
      await evidencia(page, 'RF-C3', '01', 'ordenar-con-unir');

      // C3.d · p02: unir los dos primeros da «Superserie A» con A1 y A2.
      await page.getByRole('button', { name: `Unir ${PRESS} con ${INCLINADO}` }).click();
      const bloque = page.getByTestId('draft-block');
      await expect(bloque).toHaveCount(1);
      await expect(bloque).toContainText('Superserie A');
      await expect(bloque).toContainText(`A1. ${PRESS}`);
      await expect(bloque).toContainText(`A2. ${INCLINADO}`);
      await evidencia(page, 'RF-C3', '02', 'superserie-a1-a2');

      // C3.d · p03: descanso entre ejercicios de 20 s y el tercero por tiempo.
      const entre = bloque.getByLabel('Descanso entre ejercicios (s)');
      await entre.fill('');
      await entre.pressSequentially('20');
      await expect(entre).toHaveValue('20');
      await page.getByRole('button', { name: `Por tiempo · ${MANCUERNAS}` }).click();
      await expect(page.getByLabel('Duración (s)')).toHaveValue('30');
      await evidencia(page, 'RF-C3', '03', 'descanso-entre-y-por-tiempo');

      // C3.d · p04: unir el tercero al bloque lo convierte en circuito; separar lo deshace.
      await page.getByRole('button', { name: `Unir ${INCLINADO} con ${MANCUERNAS}` }).click();
      await expect(page.getByTestId('draft-block')).toContainText('Circuito A');
      await page.getByRole('button', { name: 'Separar circuito A' }).click();
      await expect(page.getByTestId('draft-block')).toHaveCount(0);
      await page.getByRole('button', { name: `Unir ${PRESS} con ${INCLINADO}` }).click();
      await expect(page.getByTestId('draft-block')).toContainText('Superserie A');
      await expect(page.getByLabel('Descanso entre ejercicios (s)')).toHaveValue('0');
      await page.getByLabel('Descanso entre ejercicios (s)').fill('');
      await page.getByLabel('Descanso entre ejercicios (s)').pressSequentially('20');
      await page.getByRole('button', { name: 'Listo' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/dia\/1$/u);
      await page.getByRole('button', { name: 'Listo' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/dias/u);

      // Guardar y abrir el detalle.
      await siguiente(page);
      await page.getByRole('button', { name: 'Guardar' }).click();
      await expect(page).toHaveURL(/\/routines\/(?!new)[0-9a-f-]{36}/u, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible();

      // C3.d · p05: el detalle del día muestra la superserie con A1/A2, vueltas y transición.
      const bloques = page.getByTestId('day-blocks');
      await expect(bloques).toContainText('Superserie A · 3 vueltas');
      const grupo = page.getByTestId('day-block');
      await expect(grupo).toHaveCount(1);
      await expect(grupo).toContainText('A1');
      await expect(grupo).toContainText('A2');
      await expect(grupo).toContainText('Transición · 20 s');
      await expect(grupo).toContainText(PRESS);
      await expect(grupo).toContainText(INCLINADO);
      await expect(bloques).toContainText('3 series · 30 s');
      await evidencia(page, 'RF-C3', '04', 'detalle-con-superserie');

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
