import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const betaAthlete = {
  email: process.env.E2E_ATHLETE_EMAIL ?? 'active.mock@gymsheet.local',
  password: process.env.E2E_ATHLETE_PASSWORD ?? 'GymSheet-Demo_2026!',
};

async function loginAsBetaAthlete(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(betaAthlete.email);
  await page.getByLabel('Contraseña').fill(betaAthlete.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u, { timeout: 15_000 });
}

test('unauthenticated users are redirected to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/u);
});

test('login screen has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Vuelve al trabajo.' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('beta athlete can log in and reach the dashboard', async ({ context, page }) => {
  await loginAsBetaAthlete(page);

  await expect(page.getByRole('heading', { name: 'Precisión antes que ruido.' })).toBeVisible({ timeout: 15_000 });
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'gymsheet_session');
  expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
});

test('authenticated athlete can browse the imported exercise catalog', async ({ page }) => {
  await loginAsBetaAthlete(page);
  await page.getByRole('link', { name: 'Ejercicios' }).click();

  await expect(page).toHaveURL(/\/exercises$/u, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Ejercicios' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('3/4 sit-up', { exact: true })).toBeVisible();
});
