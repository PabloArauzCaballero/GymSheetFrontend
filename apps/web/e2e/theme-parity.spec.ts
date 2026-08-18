import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { THEME_COOKIE } from '../src/shared/theme/theme-script';

/**
 * Red de seguridad visual para el paso a temas configurables por inquilino.
 *
 * Captura cada pantalla en ambos temas y la compara contra una línea base
 * generada antes de abstraer los colores. Con la paleta por defecto el
 * resultado debe ser idéntico píxel a píxel: la refactorización mueve de dónde
 * salen los colores, no qué colores son ni cómo está compuesta la página.
 *
 * Regenerar la línea base: `--update-snapshots` (solo cuando el cambio visual
 * sea deliberado).
 */
const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin.dev@gymsheet.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'GymSheet-Admin_2026!',
};

/**
 * Pantallas representativas de cada familia de superficie, borde y acento.
 *
 * `/exercises` queda fuera a propósito: el catálogo devuelve los ejercicios en
 * un orden que varía entre peticiones, así que dos capturas consecutivas ya
 * difieren sin haber tocado nada y la comparación no distinguiría una
 * regresión de color de un simple reordenamiento.
 */
const routes = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/admin', name: 'admin-overview' },
  { path: '/admin/people', name: 'admin-people' },
  // Las pantallas que listan registros crecen cada vez que alguien da de alta
  // uno —incluidas las propias pruebas funcionales—, así que su captura
  // completa dejaría de coincidir por motivos ajenos al tema. Se compara su
  // encabezado, que reúne fondo, borde, título degradado y botón de acento sin
  // depender de cuántas filas o tarjetas haya.
  { path: '/admin/equipment', name: 'admin-equipment', region: 'header' },
  { path: '/admin/membership', name: 'admin-membership', region: 'header' },
  { path: '/profile', name: 'profile', region: 'header' },
] as const;

const themes = ['dark', 'light'] as const;

/**
 * Las tarjetas con media traen imágenes por el proxy del BFF y aparecen con una
 * transición de opacidad; sin esperar a que todas terminen, dos capturas
 * consecutivas difieren y la comparación nunca se estabiliza.
 */
async function waitForImages(page: Page) {
  await page
    .waitForFunction(
      () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => undefined);
}

async function dismissTutorial(page: Page) {
  const skip = page.getByRole('button', { name: 'Omitir' });
  await skip.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(skip).toBeHidden({ timeout: 15_000 });
  }
}

/**
 * Deja la pantalla en su estado final y estable.
 *
 * El tour arranca solo al terminar de cargar los datos, y su progreso no se
 * conserva entre visitas —el backend no expone todavía esa ruta—, así que hay
 * que descartarlo *después* de que la red quede en reposo: hacerlo antes lo deja
 * reaparecer justo encima de la captura.
 */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await dismissTutorial(page);
  await waitForImages(page);
  await expect(page.getByRole('button', { name: 'Omitir' })).toBeHidden();
}

test.describe.configure({ mode: 'serial' });

test.describe('paridad visual del tema', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, baseURL }) => {
    context = await browser.newContext({
      ...(baseURL ? { baseURL } : {}),
      // Sin animaciones el fotograma capturado es determinista.
      reducedMotion: 'reduce',
    });
    page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(admin.email);
    await page.getByLabel('Contraseña').fill(admin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/dashboard$/u, { timeout: 20_000 });
    await dismissTutorial(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  for (const theme of themes) {
    for (const route of routes) {
      test(`${route.name} · ${theme}`, async () => {
        // La cookie es la fuente de verdad del script anti-FOUC, así que fijarla
        // antes de navegar evita capturar un fotograma con el tema anterior.
        await context.addCookies([
          { name: THEME_COOKIE, value: theme, url: 'http://localhost:3002' },
        ]);
        await page.goto(route.path);
        await dismissTutorial(page);
        await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
        await settle(page);

        const region = 'region' in route ? route.region : null;
        const target = region ? page.locator(region).first() : page;
        await expect(target).toHaveScreenshot(`${route.name}-${theme}.png`, {
          ...(region ? {} : { fullPage: true }),
          animations: 'disabled',
          // Tolerancia cero: la refactorización no debe mover ni un píxel.
          maxDiffPixels: 0,
          timeout: 30_000,
        });
      });
    }

    // Un diálogo abierto con el foco puesto concentra los colores que hoy están
    // escritos a mano en los componentes: velo, sombra del panel, halo de foco,
    // relleno del botón primario y el texto que va encima de ese relleno.
    test(`diálogo y foco · ${theme}`, async () => {
      await context.addCookies([
        { name: THEME_COOKIE, value: theme, url: 'http://localhost:3002' },
      ]);
      await page.goto('/admin/equipment');
      await expect(page.getByRole('heading', { name: 'Equipamiento' })).toBeVisible({
        timeout: 30_000,
      });
      await settle(page);
      await page.getByRole('button', { name: 'Nuevo equipo' }).click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
      await page.locator('#equipment-name').focus();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`dialog-focus-${theme}.png`, {
        animations: 'disabled',
        maxDiffPixels: 0,
        timeout: 30_000,
      });
      await page.keyboard.press('Escape');
    });
  }
});
