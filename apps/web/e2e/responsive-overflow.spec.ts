import { expect, test, type Page } from '@playwright/test';
import { athlete, signIn } from './fixtures';

/**
 * Regresión responsiva: barre la matriz de anchos obligatoria (320 → 2560) sobre
 * las rutas autenticadas principales y afirma que NINGUNA produce scroll
 * horizontal accidental (`scrollWidth <= innerWidth`). Complementa a
 * `media-responsive.spec.ts` (que valida carga de imágenes) ampliando la
 * cobertura de anchos y rutas.
 *
 * Requiere backend + PostgreSQL activos (usuario mock `active.mock`). Sin ellos
 * el login falla: es una prueba E2E, no unitaria.
 */

/** Matriz de anchos (px) de la auditoría; altura fija razonable para móvil/desktop. */
const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920, 2560] as const;

/** Rutas visibles para el rol atleta (todas deben existir tras el login). */
const ROUTES = [
  '/dashboard',
  '/workouts',
  '/exercises',
  '/routines',
  '/plans',
  '/membership',
  '/access',
  '/notifications',
  '/profile',
] as const;

async function login(page: Page) {
  await signIn(page, athlete);
}

async function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

test('authenticated routes never overflow horizontally across the width matrix', async ({
  page,
}) => {
  // Nueve rutas por cada anchura de la matriz, y una de ellas es el catálogo
  // completo de ejercicios. No es una prueba lenta por descuido: mide muchas
  // pantallas de verdad, y el límite por defecto de treinta segundos la cortaba
  // a mitad de recorrido con un error de navegación que no tenía que ver.
  test.setTimeout(180_000);
  await login(page);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 780 : 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      // Basta con que la página haya pintado: lo que se mide es el ancho del
      // documento, y durante la transición conviven dos `main`, así que aquí se
      // mira el primero en vez de exigir que quede uno solo. Hay rutas de esta
      // matriz que ni siquiera montan el armazón del portal.
      await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 });
      await expect
        .poll(() => hasNoHorizontalOverflow(page), {
          message: `Overflow horizontal en ${route} @ ${width}px`,
          timeout: 10_000,
        })
        .toBe(true);
    }
  }
});

test('the mobile navigation scroller does not push the page wider than the viewport', async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/dashboard');
  // La barra de navegación compacta (píldoras con scroll horizontal propio) no
  // debe empujar el ancho del documento por encima del viewport.
  await expect.poll(() => hasNoHorizontalOverflow(page)).toBe(true);
});
