/**
 * Catálogo de rutinas (plan Rutinas REPP · F3 · RF-01) en la web, con captura en
 * cada paso en las cuatro combinaciones de 06 (390 y 1440 px, claro y oscuro).
 * Corre contra el backend real; cada prueba crea sus cuentas y rutinas.
 *
 * Las rutinas públicas de otras pruebas conviven en la misma base, así que los
 * pasos sobre «Públicas» filtran por una etiqueta única de la ejecución.
 */
import { test } from '@playwright/test';
import { evidencia } from './evidencia';
import {
  apiDe,
  crearCuenta,
  crearRutina,
  empujeCuatroDias,
  etiquetaUnica,
  ejercicioAlAzar,
  ejerciciosAlAzar,
  huellaPropia,
  promoverASistema,
  publicarRutina,
  ejercicioId,
} from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

for (const combo of combos) {
  test.describe(`catálogo de rutinas · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(300_000);

    test('RF-01: pestañas, filtros, invitaciones, vacío, sin conexión y error', async ({
      page,
      context,
      baseURL,
    }) => {
      const tag = etiquetaUnica();
      const [ana, bruno, sistemaBase] = await Promise.all([
        crearCuenta('ana', 'Ana Autora'),
        crearCuenta('bruno', 'Bruno Beta'),
        crearCuenta('sis', 'Equipo REPP'),
      ]);
      const a = apiDe(ana);
      const b = apiDe(bruno);
      const sistema = await promoverASistema(sistemaBase);
      const s = apiDe(sistema);

      // Ana: dos públicas (una de fuerza), una privada y un programa activo.
      const empuje = await crearRutina(a, empujeCuatroDias(`Empuje 4 días ${tag}`));
      await publicarRutina(a, empuje.id);
      const fuerza = await crearRutina(a, {
        nombre: `Fuerza 3 días ${tag}`,
        descripcion: 'Tres días de básicos pesados.',
        objetivo: 'FUERZA',
        duracionSemanas: 8,
        dias: [
          { diaSemana: 1, nombre: 'Sentadilla', ejercicios: [{ nombre: ejercicioAlAzar(), ...huellaPropia() }] },
          { diaSemana: 3, nombre: 'Banca', ejercicios: [{ nombre: 'barbell bench press', repsMin: 3, repsMax: 5 }] },
          { diaSemana: 5, nombre: 'Peso muerto', ejercicios: [{ nombre: 'barbell deadlift', repsMin: 3, repsMax: 5 }] },
        ],
      });
      await publicarRutina(a, fuerza.id);
      await crearRutina(a, empujeCuatroDias(`Pierna privada ${tag}`, { objetivo: 'RESISTENCIA' }));
      const activa = await a('POST', '/programs/strength/activate', {
        routineId: empuje.id,
        modo: 'PROGRESSIVE_OVERLOAD',
        liftTargets: [
          { ejercicioId: await ejercicioId(a, 'barbell bench press'), pesoTrabajoKg: 60, repsMin: 6, repsMax: 8, rirObjetivo: 2 },
        ],
      });
      expect(activa.status).toBe(201);

      // Bruno: una pública de resistencia y una privada que comparte con Ana (invitación pendiente).
      const resistencia = await crearRutina(b, {
        nombre: `Resistencia 2 días ${tag}`,
        objetivo: 'RESISTENCIA',
        duracionSemanas: 4,
        dias: [
          { diaSemana: 2, nombre: 'Circuito A', ejercicios: ejerciciosAlAzar(2).map((nombre) => ({ nombre, ...huellaPropia() })) },
          { diaSemana: 6, nombre: 'Circuito B', ejercicios: [{ nombre: 'barbell romanian deadlift', repsMin: 15, repsMax: 20 }] },
        ],
      });
      await publicarRutina(b, resistencia.id);
      const compartida = await crearRutina(b, empujeCuatroDias(`Torso de Bruno ${tag}`));
      expect((await b('POST', `/routines/${compartida.id}/shares`, { usuarioIds: [ana.id] })).status).toBe(201);

      // REPP: una rutina oficial.
      const oficial = await crearRutina(s, empujeCuatroDias(`Full body REPP ${tag}`, { objetivo: 'SALUD_GENERAL' }));
      await publicarRutina(s, oficial.id);
      expect((await s('POST', `/admin/routines/${oficial.id}/official`)).status).toBeLessThan(300);

      const vigilante = await abrirComo(page, context, baseURL, combo, ana);
      const lista = page.getByTestId('routine-list');

      // RF-01 · p01: el programa activo arriba y las tres pestañas.
      await page.goto('/routines');
      await expect(page.getByRole('heading', { name: 'Rutinas', level: 1 })).toBeVisible();
      await expect(page.getByTestId('program-card-fuerza')).toContainText(`Empuje 4 días ${tag}`);
      await expect(page.getByRole('tab', { name: 'Públicas' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name: /Mías/u })).toContainText('1 invitación pendiente');
      await evidencia(page, 'RF-01', '01', 'programa-y-pestanas');

      // RF-01 · p02: Públicas, ordenadas por popularidad, con autor, valoración y copias.
      await page.getByRole('searchbox', { name: 'Buscar rutinas' }).fill(tag);
      await expect(lista.getByRole('listitem')).toHaveCount(3);
      await expect(lista).toContainText('Tuya');
      await expect(lista).toContainText('Bruno Beta');
      await expect(lista).toContainText('Sin valoraciones');
      await expect(lista).not.toContainText(`Pierna privada ${tag}`);
      await evidencia(page, 'RF-01', '02', 'publicas-populares');

      // RF-01 · p03: el filtro de objetivo y días deja solo la que coincide.
      if (combo.width < 640) await page.getByRole('button', { name: /^Filtros/u }).click();
      await page.getByLabel('Objetivo').selectOption('FUERZA');
      await page.getByLabel('Días por semana').selectOption('3');
      await expect(lista.getByRole('listitem')).toHaveCount(1);
      await expect(lista).toContainText(`Fuerza 3 días ${tag}`);
      await expect(page.getByText('3 filtros activos')).toBeVisible();
      await evidencia(page, 'RF-01', '03', 'filtro-fuerza-3-dias');

      // RF-01 · p04: sin resultados, con «Limpiar filtros».
      await page.getByLabel('Objetivo').selectOption('REHABILITACION');
      await expect(page.getByRole('heading', { name: 'Ninguna rutina coincide' })).toBeVisible();
      await evidencia(page, 'RF-01', '04', 'filtro-sin-resultados');
      await page.getByRole('button', { name: 'Limpiar filtros' }).first().click();
      await expect(page.getByText('filtros activos')).toHaveCount(0);

      // RF-01 · p05: Recomendadas por REPP, con el sello en todas.
      await page.getByRole('tab', { name: 'Recomendadas por REPP' }).click();
      await page.getByRole('searchbox', { name: 'Buscar rutinas' }).fill(tag);
      await expect(lista.getByRole('listitem')).toHaveCount(1);
      await expect(lista.getByRole('listitem').first()).toContainText('REPP');
      await expect(lista).toContainText(`Full body REPP ${tag}`);
      await evidencia(page, 'RF-01', '05', 'repp');

      // RF-01 · p06: Mías › Yo creé, solo las de Ana.
      await page.getByRole('tab', { name: /Mías/u }).click();
      await expect(page.getByRole('button', { name: 'Yo creé' })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('searchbox', { name: 'Buscar rutinas' }).fill(tag);
      await expect(lista.getByRole('listitem')).toHaveCount(3);
      await expect(lista).toContainText(`Pierna privada ${tag}`);
      await expect(lista).not.toContainText('Bruno Beta');
      await evidencia(page, 'RF-01', '06', 'mias-creadas');

      // RF-01 · p07: Compartidas conmigo — la invitación primero, sin ejercicios.
      await page.getByRole('button', { name: /^Compartidas conmigo/u }).click();
      const invitacion = page.getByTestId('invitation-card');
      await expect(invitacion).toHaveCount(1);
      await expect(invitacion).toContainText(`Torso de Bruno ${tag}`);
      await expect(invitacion).toContainText('Bruno Beta te compartió esta rutina');
      await expect(invitacion).toContainText('Verás los ejercicios cuando la aceptes');
      await expect(invitacion.getByRole('button', { name: 'Aceptar' })).toBeVisible();
      await expect(invitacion.getByRole('button', { name: 'Rechazar' })).toBeVisible();
      await evidencia(page, 'RF-01', '07', 'mias-compartidas-invitacion');

      // RF-01 · p08: sin conexión — vuelve a Públicas desde la caché y avisa que no pudo actualizar.
      await page.getByRole('tab', { name: 'Públicas' }).click();
      await expect(lista.getByRole('listitem').first()).toBeVisible();
      await page.getByRole('tab', { name: /Mías/u }).click();
      await expect(page.getByRole('button', { name: 'Yo creé' })).toBeVisible();
      await context.setOffline(true);
      await page.getByRole('tab', { name: 'Públicas' }).click();
      await expect(page.getByText('Sin conexión. Te mostramos lo último que cargamos.')).toBeVisible();
      await expect(lista.getByRole('listitem').first()).toBeVisible();
      await evidencia(page, 'RF-01', '08', 'sin-conexion-con-cache');
      await context.setOffline(false);

      // RF-01 · p09: error 500 — el estado de error con «Reintentar», y vuelve al reintentar.
      vigilante.permitir({ status: 500, url: /\/api\/backend\/routines\?/u });
      // El aviso global de la app registra el fallo simulado.
      vigilante.permitirConsola(/\[notifications\]/u);
      await page.route(/\/api\/backend\/routines\?.*scope=official/u, (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Fallo simulado.' }) }),
      );
      await page.getByRole('tab', { name: 'Recomendadas por REPP' }).click();
      await page.getByRole('searchbox', { name: 'Buscar rutinas' }).fill(`${tag}x`);
      await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText('No se pudo cargar la información');
      await evidencia(page, 'RF-01', '09', 'error-500');
      await page.unroute(/\/api\/backend\/routines\?.*scope=official/u);
      await page.getByRole('searchbox', { name: 'Buscar rutinas' }).fill(tag);
      await expect(lista.getByRole('listitem')).toHaveCount(1);

      expect(vigilante.problemas).toEqual([]);
    });
  });
}
