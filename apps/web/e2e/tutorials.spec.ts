import { expect, test, type Page } from '@playwright/test';
import { mockPassword, signIn } from './fixtures';

// These specs exercise the interactive tutorial engine over the real UI. They
// require the NestJS backend + PostgreSQL to be running (see project README);
// they are not asserted to pass without that infrastructure.


async function login(page: Page, email: string) {
  await signIn(page, { email, password: mockPassword });
}

async function dismissAnyTour(page: Page) {
  // The intro tour may auto-launch on first login. It appears a moment after
  // the page mounts, so a single visibility check races it and leaves the
  // overlay swallowing the first click; wait for it, and treat its absence as
  // the normal case rather than a failure.
  const close = page.getByRole('button', { name: 'Cerrar tutorial' });
  await close.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(close).toBeHidden({ timeout: 15_000 });
  }
}

test('the help center lists tutorials and shows progress', async ({ page }) => {
  await login(page, 'active.mock@gymsheet.local');
  await page.goto('/tutorials');
  await dismissAnyTour(page);
  await expect(page.getByRole('heading', { name: 'Centro de ayuda', exact: true })).toBeVisible();
  await expect(page.getByText('Avance general')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bienvenido a GymSheet' })).toBeVisible();
});

test('a tutorial can be started and advanced over the real UI', async ({ page }) => {
  await login(page, 'active.mock@gymsheet.local');
  await page.goto('/tutorials');
  await dismissAnyTour(page);

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
  await page.goto('/tutorials');
  await dismissAnyTour(page);
  await page.getByLabel('Buscar').fill('perfil');
  await expect(page.getByRole('heading', { name: 'Tu perfil' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Panel de operaciones' })).toHaveCount(0);
});
