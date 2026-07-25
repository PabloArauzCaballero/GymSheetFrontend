import { expect, test, type Page } from '@playwright/test';

const password = process.env.E2E_ATHLETE_PASSWORD ?? 'GymSheet-Demo_2026!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).not.toHaveURL(/\/login/u, { timeout: 15_000 });
}

test('new clients are required to continue onboarding', async ({ page }) => {
  await login(page, 'new.mock@gymsheet.local');
  await expect(page).toHaveURL(/\/onboarding$/u, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Personaliza tu experiencia' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
});

test('active members see their plan, entitlements and extension action in Mi perfil', async ({
  page,
}) => {
  await login(page, 'active.mock@gymsheet.local');
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Mi membresía y accesos' })).toBeVisible();
  await expect(page.getByText('Plan mensual · Desarrollo').first()).toBeVisible();
  await expect(page.getByText('Biblioteca de ejercicios').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir meses' }).first()).toBeVisible();
});

test('expired members can open an idempotent WhatsApp renewal without gaining access', async ({
  page,
}) => {
  await login(page, 'expired.mock@gymsheet.local');
  await page.goto('/membership');
  await expect(page.getByText('EXPIRED', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tienda de membresías' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  const popupPromise = page.waitForEvent('popup');
  await page
    .getByRole('button', { name: /Renovar por WhatsApp/u })
    .first()
    .click();
  const popup = await popupPromise;
  await expect.poll(() => new URL(popup.url()).searchParams.get('phone')).toBe('59177377232');
  expect(new URL(popup.url()).searchParams.get('text')).toBe('Hola, quisiera renovar mi membresía');
  const response = await page.request.get('/api/backend/me/membership');
  const payload = await response.json();
  expect(payload.data.membership.estado).toBe('EXPIRED');
  expect(payload.data.paymentStatus).toBe('PENDING_PAYMENT');
});
