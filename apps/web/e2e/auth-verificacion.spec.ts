import { expect, test } from '@playwright/test';
import { fillSignupForm } from './alta-datos';
import { dismissTour } from './fixtures';

/**
 * Email verification after a web signup. Needs the backend and PostgreSQL
 * running (creates a real account per run). The PIN itself only travels by
 * email and the browser cannot read it, so this covers the UI states around
 * it: the persistent banner, a wrong PIN and the resend cooldown.
 */
test('a new account sees the banner, a wrong PIN error and the resend cooldown', async ({
  page,
}) => {
  await page.goto('/register');
  await fillSignupForm(page, {
    nombreCompleto: 'Verifica Prueba',
    email: `verifica.${Date.now()}@gymsheet.local`,
    password: 'SignupLocal2026!',
  });
  const registered = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/register') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const signup = await registered;
  expect(signup.status()).toBe(201);
  expect(typeof (signup.request().postDataJSON() as Record<string, unknown>).ticket).toBe('string');
  await expect(page).toHaveURL(/\/onboarding$/u, { timeout: 20_000 });

  // Persistent banner in the portal while the email is unverified.
  const banner = page.getByRole('complementary', { name: 'Verifica tu correo' });
  await expect(banner).toBeVisible({ timeout: 15_000 });
  // A new account sees the welcome tour first; a person closes it before anything else.
  await dismissTour(page);
  await banner.getByRole('link', { name: 'Verificar ahora' }).click();
  await expect(page).toHaveURL(/\/verificar-correo$/u);
  await expect(page.getByRole('heading', { name: 'Verifica tu correo' })).toBeVisible();
  await expect(banner).toBeHidden();

  // A wrong PIN: a 1-in-a-million chance of being the real one.
  const pin = page.getByLabel('Código de verificación');
  await expect(pin).toHaveAttribute('autocomplete', 'one-time-code');
  await pin.fill('000000');
  const confirmed = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/email/verify/confirm'),
  );
  await page.getByRole('button', { name: 'Verificar' }).click();
  expect((await confirmed).status()).toBe(400);
  await expect(page.getByText(/^El código no es correcto\./u)).toBeVisible();

  // Signup just sent a PIN, so an immediate resend answers 429 with its cooldown.
  const resent = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/email/verify/request'),
  );
  await page.getByRole('button', { name: 'Reenviar código' }).click();
  expect((await resent).status()).toBe(429);
  await expect(page.getByRole('button', { name: /^Reenviar en \d+ s$/u })).toBeDisabled();
  await expect(page.getByText('Espera un momento antes de pedir otro código.')).toBeVisible();
});
