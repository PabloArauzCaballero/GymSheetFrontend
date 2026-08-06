import { expect, test, type Page } from '@playwright/test';

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
const athlete = {
  email: process.env.E2E_ATHLETE_EMAIL ?? 'active.mock@gymsheet.local',
  password: process.env.E2E_ATHLETE_PASSWORD ?? 'GymSheet-Demo_2026!',
};

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
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(athlete.email);
  await page.getByLabel('Contraseña').fill(athlete.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u, { timeout: 15_000 });
}

async function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

test('authenticated routes never overflow horizontally across the width matrix', async ({
  page,
}) => {
  await login(page);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 780 : 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
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
