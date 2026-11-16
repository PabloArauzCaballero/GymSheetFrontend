import { expect, test, type Page } from '@playwright/test';

/**
 * Signup with the mandatory birth date, sex and current terms version.
 * Needs the backend and PostgreSQL running (creates a real account per run).
 */

function isoYearsAgo(years: number, extraDays = 0) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() + extraDays);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function fillSignup(page: Page, birthDate: string) {
  await page.goto('/register');
  await page.getByLabel('Nombre completo').fill('Ana Prueba');
  await page.getByLabel('Correo electrónico').fill(`signup.${Date.now()}@gymsheet.local`);
  await page.getByLabel('Contraseña', { exact: true }).fill('SignupLocal2026!');
  await page.getByLabel('Confirmar contraseña').fill('SignupLocal2026!');
  await page.getByLabel('Fecha de nacimiento').fill(birthDate);
  await page.getByRole('radio', { name: 'Mujer' }).check();
  await page.getByRole('checkbox').check();
}

test('signup with birth date, sex and terms lands on onboarding', async ({ page }) => {
  await fillSignup(page, '1996-03-15');
  const registered = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/register') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  const response = await registered;
  expect(response.status()).toBe(201);
  const sent = response.request().postDataJSON() as Record<string, unknown>;
  expect(sent).toMatchObject({ fechaNacimiento: '1996-03-15', genero: 'FEMALE', acceptedTerms: true });
  expect(typeof sent.termsVersion).toBe('string');

  await expect(page).toHaveURL(/\/onboarding$/u, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: '¿Qué quieres conseguir?' })).toBeVisible({ timeout: 15_000 });
});

test('an under-18 birth date is rejected before reaching the server', async ({ page }) => {
  await fillSignup(page, isoYearsAgo(18, 1));
  let sentRegister = false;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/register')) sentRegister = true;
  });
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByText('Debes tener al menos 18 años.')).toBeVisible();
  await expect(page.getByLabel('Fecha de nacimiento')).toHaveAttribute('aria-invalid', 'true');
  expect(sentRegister).toBe(false);
  await expect(page).toHaveURL(/\/register$/u);
});
