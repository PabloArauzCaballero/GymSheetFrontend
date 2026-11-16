import { expect, test, type Page } from '@playwright/test';
import { dismissTour, signIn } from './fixtures';
import { apiDe, crearCuenta } from './rutinas-datos';

/**
 * «Privacidad y datos» in Ajustes against the real backend (franja 4): a
 * consent toggled in the UI persists on the server and after a reload, the
 * data export starts as pending, and closing the account with the password
 * logs out to the goodbye page and the old credentials stop working.
 *
 * Needs the backend (`E2E_BACKEND_URL`) and PostgreSQL running; each test
 * creates its own member account.
 */
test.describe.configure({ mode: 'serial' });

async function openSettings(page: Page) {
  await page.goto('/settings');
  await dismissTour(page);
  await expect(page.getByRole('heading', { name: 'Privacidad y datos' })).toBeVisible({ timeout: 20_000 });
}

function waitForBackend(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse(
    (response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd),
  );
}

test('a granted consent persists after a reload, and revoking asks first', async ({ page }) => {
  const account = await crearCuenta('consent', 'Consentimiento QA');
  await signIn(page, account);
  await openSettings(page);

  const state = page.getByTestId('consent-state-ORIENTATION');
  await expect(state).toHaveText('Sin aceptar');
  const granted = waitForBackend(page, 'PUT', '/api/backend/me/consents/ORIENTATION');
  await page.getByRole('button', { name: 'Aceptar: Orientación' }).click();
  expect((await granted).status()).toBe(200);
  await expect(state).toHaveText('Aceptado');

  // Persistence: the server first, then the UI after a reload.
  const api = apiDe(account);
  const saved = await api<{ consents: Array<{ kind: string; granted: boolean }> }>('GET', '/me/consents');
  expect(saved.data.consents.find((entry) => entry.kind === 'ORIENTATION')?.granted).toBe(true);
  await page.reload();
  await dismissTour(page);
  await expect(page.getByTestId('consent-state-ORIENTATION')).toHaveText('Aceptado');

  // Revoking says what gets erased before doing it.
  await page.getByRole('button', { name: 'Retirar: Orientación' }).click();
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
  await expect(dialog.getByText('Borramos tu orientación y dejamos de mostrarla.')).toBeVisible();
  const revoked = waitForBackend(page, 'PUT', '/api/backend/me/consents/ORIENTATION');
  await dialog.getByRole('button', { name: 'Retirar y borrar' }).click();
  expect((await revoked).status()).toBe(200);
  await page.reload();
  await dismissTour(page);
  await expect(page.getByTestId('consent-state-ORIENTATION')).toHaveText('Sin aceptar');
});

test('asking for a copy of the data shows it as pending', async ({ page }) => {
  const account = await crearCuenta('export', 'Exportación QA');
  await signIn(page, account);
  await openSettings(page);

  await page.getByText('Descargar mis datos', { exact: true }).click();
  const requested = waitForBackend(page, 'POST', '/api/backend/me/export');
  await page.getByRole('button', { name: 'Preparar copia' }).click();
  expect((await requested).status()).toBe(202);
  // The worker may already have built it: pending or ready, never the request button again.
  await expect(
    page.getByText('Preparando tu copia. Puede tardar unos minutos.').or(page.getByRole('link', { name: 'Descargar copia' })),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preparar copia' })).toBeHidden();

  // After a reload the card resumes the same request from `GET /me/export/latest`.
  const resumed = waitForBackend(page, 'GET', '/api/backend/me/export/latest');
  await page.reload();
  await dismissTour(page);
  expect((await resumed).status()).toBe(200);
  await page.getByText('Descargar mis datos', { exact: true }).click();
  await expect(
    page.getByText('Preparando tu copia. Puede tardar unos minutos.').or(page.getByRole('link', { name: 'Descargar copia' })),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preparar copia' })).toBeHidden();
});

test('closing the account with the password logs out, and that login stops working', async ({ page }) => {
  const account = await crearCuenta('cierre', 'Cierre QA');
  await signIn(page, account);
  await openSettings(page);

  await page.getByText('Cerrar mi cuenta', { exact: true }).click();
  await page.getByRole('button', { name: 'Revisar qué se borra' }).click();
  await expect(page.getByText('Tu cuenta', { exact: true })).toBeVisible();
  // The email-change form on the same page has its own "Tu contraseña" field.
  await page.locator('#closure-password').fill(account.password);
  await page.getByRole('button', { name: 'Cerrar mi cuenta' }).click();

  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
  const closed = waitForBackend(page, 'DELETE', '/api/backend/me/account');
  await dialog.getByRole('button', { name: 'Cerrar para siempre' }).click();
  expect((await closed).status()).toBe(200);
  await expect(page).toHaveURL(/\/adios$/u, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Tu cuenta está cerrada' })).toBeVisible();

  // The session is gone and the credentials no longer open the account.
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login/u);
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password);
  const login = waitForBackend(page, 'POST', '/api/auth/login');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  expect((await login).status()).toBeGreaterThanOrEqual(400);
  await expect(page).toHaveURL(/\/login/u);
  await expect(page.getByRole('alert').first()).toBeVisible();
});
