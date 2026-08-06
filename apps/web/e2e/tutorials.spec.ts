import { expect, test, type Page } from '@playwright/test';

// These specs exercise the interactive tutorial engine over the real UI. They
// require the NestJS backend + PostgreSQL to be running (see project README);
// they are not asserted to pass without that infrastructure.

const password = process.env.E2E_ATHLETE_PASSWORD ?? 'GymSheet-Demo_2026!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).not.toHaveURL(/\/login/u, { timeout: 15_000 });
}

async function dismissAnyTour(page: Page) {
  // The intro tour may auto-launch on first login; close it if present.
  const close = page.getByRole('button', { name: 'Cerrar tutorial' });
  if (await close.isVisible().catch(() => false)) await close.click();
}

test('the help center lists tutorials and shows progress', async ({ page }) => {
  await login(page, 'active.mock@gymsheet.local');
  await dismissAnyTour(page);
  await page.goto('/tutorials');
  await expect(page.getByRole('heading', { name: 'Centro de ayuda' })).toBeVisible();
  await expect(page.getByText('Avance general')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bienvenido a GymSheet' })).toBeVisible();
});

test('a tutorial can be started and advanced over the real UI', async ({ page }) => {
  await login(page, 'active.mock@gymsheet.local');
  await dismissAnyTour(page);
  await page.goto('/tutorials');

  // Start the navigation tour from its card.
  const card = page
    .locator('[data-tutorial-id="tutorial-card:main-navigation"]')
    .first();
  await card.getByRole('button', { name: /Comenzar|Continuar|Repetir|Retomar/ }).click();

  // The tour dialog appears anchored to the real navigation.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Panel')).toBeVisible();

  // Advance and then close.
  await dialog.getByRole('button', { name: /Siguiente/ }).click();
  await page.keyboard.press('Escape');
});

test('filters narrow the tutorial list', async ({ page }) => {
  await login(page, 'active.mock@gymsheet.local');
  await dismissAnyTour(page);
  await page.goto('/tutorials');
  await page.getByLabel('Buscar').fill('perfil');
  await expect(page.getByRole('heading', { name: 'Tu perfil' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Panel de operaciones' })).toHaveCount(0);
});
