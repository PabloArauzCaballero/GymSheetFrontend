import { expect, test, type Page } from '@playwright/test';
import { dismissTour, mockPassword, openPage, signIn } from './fixtures';


async function login(page: Page, email: string) {
  await signIn(page, { email, password: mockPassword });
  await dismissTour(page);
}

test('new clients are required to continue onboarding', async ({ page }) => {
  await login(page, 'new.mock@gymsheet.local');
  await expect(page).toHaveURL(/\/onboarding$/u, { timeout: 40_000 });
  await expect(page.getByRole('heading', { name: 'Personaliza tu experiencia' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
});

test('active members see their plan, entitlements and extension action in Mi perfil', async ({
  page,
}) => {
  await login(page, 'active.mock@gymsheet.local');
  await openPage(page, '/profile');
  await expect(page.getByRole('heading', { name: 'Mi membresía y accesos' })).toBeVisible();
  await expect(page.getByText('Plan mensual · Desarrollo').first()).toBeVisible();
  await expect(page.getByText('Biblioteca de ejercicios').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir meses' }).first()).toBeVisible();
});

test('expired members can open an idempotent WhatsApp renewal without gaining access', async ({
  page,
}) => {
  await login(page, 'expired.mock@gymsheet.local');
  await openPage(page, '/membership');
  await expect(page.getByText('EXPIRED', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tienda de membresías' })).toBeVisible();
  // La confirmación es un diálogo propio de la aplicación, no el `confirm()` del
  // navegador: la prueba esperaba el evento nativo, que nunca llega, mientras la
  // capa del modal —ya abierto— se comía los reintentos del clic.
  await page
    .getByRole('button', { name: /Renovar por WhatsApp/u })
    .first()
    .click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continuar' }).click();
  const popup = await popupPromise;
  await expect.poll(() => new URL(popup.url()).searchParams.get('phone')).toBe('59177377232');
  expect(new URL(popup.url()).searchParams.get('text')).toBe('Hola, quisiera renovar mi membresía');
  const response = await page.request.get('/api/backend/me/membership');
  const payload = await response.json();
  expect(payload.data.membership.estado).toBe('EXPIRED');
  expect(payload.data.paymentStatus).toBe('PENDING_PAYMENT');
});
