import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Documentary evidence for the F0 auth work: registration, sign-out, and the
 * PIN-based password-reset round trip, all exercised through the real UI
 * against the real backend (not mocked) — proving `/api/auth/password-reset/*`
 * now works end to end, closing the gap the BFF route policy already had
 * routes prepared for but the backend did not yet implement.
 *
 * The PIN is read from the backend's dev-only log adapter
 * (`PASSWORD_RESET_DEV_LOG_ENABLED=true`, see `dev-log-password-reset.notifier.ts`)
 * rather than typed by a human, since nothing else can deliver it without a
 * real email provider.
 */

const EVIDENCE_DIR = process.env.EVIDENCE_OUTPUT_DIR ?? join(__dirname, '__evidence__');
const BACKEND_LOG_PATH = process.env.BACKEND_DEV_LOG_PATH ?? join(process.env.LOCALAPPDATA ?? '', 'Temp', 'backend-dev.log');

mkdirSync(EVIDENCE_DIR, { recursive: true });

function readLatestLoggedPin(email: string): string {
  const contents = readFileSync(BACKEND_LOG_PATH, 'utf8');
  // The dev-log adapter writes the notification as a multi-line pretty
  // object; find the last occurrence and pull `resetPin` from the block that
  // follows it, matching the exact console.log format Nest's Logger uses.
  const marker = 'auth.password_reset.dev_log_delivery';
  const lastIndex = contents.lastIndexOf(marker);
  if (lastIndex === -1) throw new Error(`No password-reset log entry found for ${email}`);
  const block = contents.slice(lastIndex, lastIndex + 400);
  const match = /resetPin:.*?'(\d{6})'/u.exec(block);
  if (!match?.[1]) throw new Error(`Could not parse resetPin from log block: ${block}`);
  return match[1];
}

test.use({ video: 'on' });

test('registration, logout, and PIN-based password reset work end to end', async ({ page }) => {
  const uniqueSuffix = Date.now();
  const email = `evidencia.web.${uniqueSuffix}@example.test`;
  const originalPassword = 'ClaveOriginalWeb123';
  const newPassword = 'ClaveNuevaWeb456';

  await test.step('register a fresh account', async () => {
    await page.goto('/register');
    await page.screenshot({ path: join(EVIDENCE_DIR, '01-register-empty.png'), fullPage: true });

    await page.getByLabel('Nombre completo').fill('Evidencia Web QA');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(originalPassword);
    await page.getByLabel('Confirmar contraseña').fill(originalPassword);
    await page.screenshot({ path: join(EVIDENCE_DIR, '02-register-filled.png'), fullPage: true });

    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/register'), { timeout: 20_000 });
    await page.screenshot({ path: join(EVIDENCE_DIR, '03-registered-landed.png'), fullPage: true });
  });

  await test.step('sign out', async () => {
    await page.goto('/api/auth/logout?returnTo=/login');
    await page.waitForURL(/\/login/u, { timeout: 15_000 });
    await page.screenshot({ path: join(EVIDENCE_DIR, '04-logged-out.png'), fullPage: true });
  });

  await test.step('request a reset PIN', async () => {
    await page.goto('/recover-password');
    await page.screenshot({ path: join(EVIDENCE_DIR, '05-recover-step0.png'), fullPage: true });

    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await expect(page.getByLabel('Código')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: join(EVIDENCE_DIR, '06-recover-step1-empty.png'), fullPage: true });
  });

  await test.step('confirm the PIN and set a new password', async () => {
    // Small settle window for the backend's log write to land before it's read.
    await page.waitForTimeout(500);
    const pin = readLatestLoggedPin(email);

    await page.getByLabel('Código').fill(pin);
    await page.getByLabel('Contraseña nueva').fill(newPassword);
    await page.screenshot({ path: join(EVIDENCE_DIR, '07-recover-step1-filled.png'), fullPage: true });

    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('Listo. Ya puedes entrar con tu contraseña nueva.')).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: join(EVIDENCE_DIR, '08-recover-done.png'), fullPage: true });
  });

  await test.step('the old password no longer works', async () => {
    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click();
    await page.waitForURL(/\/login/u);
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(originalPassword);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: join(EVIDENCE_DIR, '09-old-password-rejected.png'), fullPage: true });
  });

  await test.step('the new password signs in', async () => {
    await page.getByLabel('Contraseña', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
    await page.screenshot({ path: join(EVIDENCE_DIR, '10-new-password-accepted.png'), fullPage: true });
  });
});
