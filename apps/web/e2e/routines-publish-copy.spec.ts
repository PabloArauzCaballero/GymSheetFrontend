/**
 * Publicar, copiar con atribución y rutinas recomendadas por REPP (plan Rutinas
 * REPP · F4 · RF-09, RF-10 y RF-11) con dos cuentas reales, en las cuatro
 * combinaciones de 06 (390 y 1440 px, claro y oscuro).
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import {
  apiDe,
  crearCuenta,
  crearRutina,
  editarEstructura,
  empujeCuatroDias,
  etiquetaUnica,
  promoverASistema,
  publicarRutina,
} from './rutinas-datos';
import { abrirComo, abrirSegundo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`publicar y copiar · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(420_000);

    test('RF-09 y RF-10: publicar, duplicado, copiar, versión nueva', async ({ page, context, browser, baseURL }) => {
      const tag = etiquetaUnica();
      const [ana, bruno] = await Promise.all([crearCuenta('ana', 'Ana Autora'), crearCuenta('bruno', 'Bruno Beta')]);
      const a = apiDe(ana);
      const b = apiDe(bruno);
      const semilla = empujeCuatroDias(`Empuje 4 días ${tag}`);
      const original = await crearRutina(a, semilla);
      const vigilanteAna = await abrirComo(page, context, baseURL, combo, ana);

      // RF-09 · p01: publicar pide confirmación y deja la rutina pública.
      await page.goto(`/routines/${original.id}`);
      await page.getByRole('button', { name: 'Publicar' }).click();
      await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toContainText('Cualquiera podrá verla');
      await evidencia(page, 'RF-09', '01', 'confirmar-publicacion');
      await page.getByRole('button', { name: 'Publicar', exact: true }).last().click();
      await expect(page.getByRole('button', { name: 'Despublicar' })).toBeVisible();
      await expect(page.getByText('Pública', { exact: true })).toBeVisible();

      // RF-09 · p02: Bruno la ve en Públicas con su autora.
      const bruna = await abrirSegundo(browser, baseURL, combo, bruno);
      await bruna.page.goto(`/routines?q=${tag}`);
      const lista = bruna.page.getByTestId('routine-list');
      await expect(lista.getByRole('listitem')).toHaveCount(1);
      await expect(lista).toContainText('Ana Autora');
      await evidencia(bruna.page, 'RF-09', '02', 'aparece-en-publicas');

      // RF-09 · p03: Bruno crea una idéntica y al publicar sale «Ya existe una rutina idéntica».
      const identica = await crearRutina(b, { ...semilla, nombre: `Mi empuje ${tag}` });
      bruna.vigilante.permitir({ status: 409, url: /\/publish$/u });
      bruna.vigilante.permitirConsola(/\[notifications\]/u);
      await bruna.page.goto(`/routines/${identica.id}`);
      await bruna.page.getByRole('button', { name: 'Publicar' }).click();
      await bruna.page.getByRole('button', { name: 'Publicar', exact: true }).last().click();
      const duplicado = bruna.page.getByRole('dialog', { name: 'Ya existe una rutina idéntica' });
      await expect(duplicado).toBeVisible();
      await expect(duplicado.getByTestId('duplicate-of')).toContainText(`Empuje 4 días ${tag}`);
      await expect(duplicado.getByTestId('duplicate-of')).toContainText('Ana Autora');
      await evidencia(bruna.page, 'RF-09', '03', 'duplicado-bloqueado');
      await duplicado.getByRole('link', { name: 'Ver rutina' }).click();
      await bruna.page.waitForURL(new RegExp(`/routines/${original.id}`, 'u'), { timeout: 120_000 });

      // RF-09 · p04: cambiar una repetición permite publicar.
      await editarEstructura(b, identica.id, (dias) => {
        dias[0]!.ejercicios[0]!.repsMax = Number(dias[0]!.ejercicios[0]!.repsMax) + 1;
      });
      await bruna.page.goto(`/routines/${identica.id}`);
      await bruna.page.getByRole('button', { name: 'Publicar' }).click();
      await bruna.page.getByRole('button', { name: 'Publicar', exact: true }).last().click();
      await expect(bruna.page.getByRole('button', { name: 'Despublicar' })).toBeVisible();
      await evidencia(bruna.page, 'RF-09', '04', 'cambia-una-repeticion-publica');

      // RF-09 · p05: cambiar solo el nombre sigue bloqueado.
      const soloNombre = await crearRutina(b, { ...semilla, nombre: `Otro nombre ${tag}` });
      await bruna.page.goto(`/routines/${soloNombre.id}`);
      await bruna.page.getByRole('button', { name: 'Publicar' }).click();
      await bruna.page.getByRole('button', { name: 'Publicar', exact: true }).last().click();
      await expect(bruna.page.getByRole('dialog', { name: 'Ya existe una rutina idéntica' })).toBeVisible();
      await evidencia(bruna.page, 'RF-09', '05', 'solo-nombre-sigue-bloqueada');
      await bruna.page.getByRole('button', { name: 'Seguir editando' }).click();

      // RF-10 · p01: Bruno copia la pública de Ana y sale «Copiada a Mías».
      await bruna.page.goto(`/routines/${original.id}`);
      await bruna.page.getByRole('button', { name: 'Copiar a mis rutinas' }).click();
      await expect(bruna.page.getByText('Copiada a Mías')).toBeVisible();
      await evidencia(bruna.page, 'RF-10', '01', 'copiada-a-mias');

      // RF-10 · p02: la copia lleva la franja «Basada en … de Ana Autora».
      // El aviso dura unos segundos y la captura puede tardar: si ya se fue, se abre la copia por su id.
      const copia = await b<{ items: Array<{ id: string; nombre: string }> }>('GET', `/routines?scope=mine&q=${tag}&limit=5`);
      const copiaApi = copia.data.items.find((item) => item.nombre === `Empuje 4 días ${tag}`);
      expect(copiaApi).toBeTruthy();
      await bruna.page.goto(`/routines/${copiaApi!.id}`);
      await expect(bruna.page.getByTestId('attribution-strip')).toContainText(`Basada en Empuje 4 días ${tag} de Ana Autora`);
      await evidencia(bruna.page, 'RF-10', '02', 'franja-de-atribucion');
      const copiaId = bruna.page.url().split('/routines/')[1]!.split('?')[0]!;

      // RF-10 · p03: Bruno edita su copia; el original de Ana no cambia.
      await editarEstructura(b, copiaId, (dias) => {
        dias[0]!.nombre = 'Empuje de Bruno';
      });
      await bruna.page.goto(`/routines/${original.id}`);
      await expect(bruna.page.getByTestId('day-sheet')).toContainText('Empuje');
      await expect(bruna.page.getByTestId('day-sheet')).not.toContainText('Empuje de Bruno');
      await evidencia(bruna.page, 'RF-10', '03', 'original-no-cambia');

      // RF-10 · p04: Ana edita su pública (versión 2) y la copia de Bruno avisa.
      await editarEstructura(a, original.id, (dias) => {
        dias[0]!.ejercicios.push({ ...dias[0]!.ejercicios[0]!, ejercicioId: dias[2]!.ejercicios[0]!.ejercicioId, repsMin: 8, repsMax: 11 });
      });
      await bruna.page.goto(`/routines/${copiaId}`);
      const banner = bruna.page.getByTestId('version-banner');
      await expect(banner).toContainText('Hay una versión nueva');
      await evidencia(bruna.page, 'RF-10', '04', 'hay-version-nueva');

      // RF-10 · p05: Ver cambios y Aplicar; conserva el nombre de Bruno.
      await banner.getByRole('button', { name: 'Ver cambios' }).click();
      await expect(banner.getByRole('list', { name: 'Cambios de la versión nueva' })).toContainText('se añade');
      await evidencia(bruna.page, 'RF-10', '05', 'ver-cambios');
      await banner.getByRole('button', { name: 'Aplicar' }).click();
      await expect(bruna.page.getByTestId('version-banner')).toHaveCount(0);
      await expect(bruna.page.getByRole('heading', { name: `Empuje 4 días ${tag}`, level: 1 })).toBeVisible();
      await evidencia(bruna.page, 'RF-10', '06', 'version-aplicada');

      // RF-10 · p07: una rutina creada desde cero no lleva franja de atribución.
      await page.goto(`/routines/${original.id}`);
      await expect(page.getByTestId('attribution-strip')).toHaveCount(0);
      await evidencia(page, 'RF-10', '07', 'sin-atribucion-desde-cero');

      expect(vigilanteAna.problemas).toEqual([]);
      expect(bruna.vigilante.problemas).toEqual([]);
      await bruna.context.close();
    });

    test('RF-11: Recomendadas por REPP aparece con sello y desaparece al desmarcar', async ({ page, context, baseURL }) => {
      const tag = etiquetaUnica();
      const [ana, sis] = await Promise.all([crearCuenta('ana', 'Ana Autora'), crearCuenta('sis', 'Equipo REPP')]);
      const s = apiDe(await promoverASistema(sis));
      const oficial = await crearRutina(s, empujeCuatroDias(`Full body REPP ${tag}`, { objetivo: 'SALUD_GENERAL' }));
      await publicarRutina(s, oficial.id);
      expect((await s('POST', `/admin/routines/${oficial.id}/official`)).status).toBeLessThan(300);
      const vigilante = await abrirComo(page, context, baseURL, combo, ana);

      // RF-11 · p02: en la pestaña REPP con el sello.
      await page.goto(`/routines?tab=repp&q=${tag}`);
      const lista = page.getByTestId('routine-list');
      await expect(lista.getByRole('listitem')).toHaveCount(1);
      await expect(lista).toContainText('REPP');
      await evidencia(page, 'RF-11', '02', 'repp-con-sello');
      await lista.getByRole('link').first().click();
      await expect(page.getByText('Recomendada por REPP')).toBeVisible();
      await evidencia(page, 'RF-11', '02b', 'detalle-oficial');

      // RF-11 · p03: al desmarcarla desaparece de REPP.
      expect((await s('DELETE', `/admin/routines/${oficial.id}/official`)).status).toBeLessThan(300);
      await page.goto(`/routines?tab=repp&q=${tag}`);
      await expect(page.getByRole('heading', { name: 'Ninguna rutina coincide' })).toBeVisible();
      await evidencia(page, 'RF-11', '03', 'repp-desmarcada');
      expect(vigilante.problemas).toEqual([]);
    });
  });
}
