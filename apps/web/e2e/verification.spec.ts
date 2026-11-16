import { expect, test, type Page } from '@playwright/test';
import { BACKEND } from './alta-datos';
import { admin, dismissTour, openPage, signIn } from './fixtures';
import { apiDe, crearCuenta, sql, type Cuenta } from './rutinas-datos';

/**
 * Person verification by selfie (franja 6) against the real backend:
 * the member grants the VERIFICATION_SELFIE consent, gets a gesture with its
 * countdown, uploads a selfie through the file input and lands on «en
 * revisión»; a moderator approves it side by side with the profile photos and
 * the member's state turns verified, on the server and after a reload.
 *
 * Needs the backend (`E2E_BACKEND_URL`), PostgreSQL (`sql()` prepares what the
 * API does not let a test create: a verified email, the member in the seeded
 * admin's gym and the moderation grants) and writable (non-immutable) media
 * storage — on immutable storage the backend answers 503 by design.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

// 1×1 PNG: the backend checks magic bytes, not size.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let member: Cuenta;

async function uploadProfilePhoto(account: Cuenta, name: string) {
  const form = new FormData();
  form.append('file', new Blob([PNG], { type: 'image/png' }), name);
  const response = await fetch(`${BACKEND}/me/photos`, {
    method: 'POST',
    headers: { authorization: `Bearer ${account.token}` },
    body: form,
  });
  expect(response.status, 'profile photo upload').toBeLessThan(300);
}

function waitForBackend(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse(
    (response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd),
  );
}

test.beforeAll(async () => {
  member = await crearCuenta('verif', 'Verificación QA');
  const email = admin.email.replaceAll("'", "''");
  await sql(
    `UPDATE public.usuarios SET email_verified_at = now(),
       tenant_id = (SELECT tenant_id FROM public.usuarios WHERE email = '${email}')
     WHERE id = '${member.id}'`,
  );
  // The seeded admin moderates only with the grants the backend checks.
  for (const key of ['moderation:read', 'moderation:act']) {
    await sql(
      `INSERT INTO admin.user_permissions (id, user_id, permission_key, granted_at, created_at, updated_at)
       SELECT gen_random_uuid(), u.id, '${key}', now(), now(), now() FROM public.usuarios u
       WHERE u.email = '${email}' AND NOT EXISTS (
         SELECT 1 FROM admin.user_permissions p WHERE p.user_id = u.id AND p.permission_key = '${key}')`,
    );
  }
  // A moderator needs at least two visible photos to compare the selfie with.
  await uploadProfilePhoto(member, 'perfil-1.png');
  await uploadProfilePhoto(member, 'perfil-2.png');
});

test('member: consent → gesture with countdown → selfie by file → in review', async ({ page }) => {
  await signIn(page, member);
  await openPage(page, '/verificacion');
  await expect(page.getByRole('heading', { level: 1, name: 'Verifica tu perfil' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Pedir mi gesto' }).click();
  // The consent is asked with its purpose before any gesture or camera exists.
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
  await expect(dialog.getByText('Una persona de moderación compara tu selfie con tus fotos para darte la marca «Verificado». Borramos la selfie 30 días después de decidir.')).toBeVisible();
  await expect(page.getByTestId('selfie-file-input')).toHaveCount(0);
  const granted = waitForBackend(page, 'PUT', '/api/backend/me/consents/VERIFICATION_SELFIE');
  const challenged = waitForBackend(page, 'POST', '/api/backend/me/verification/challenge');
  await dialog.getByRole('button', { name: 'Aceptar y continuar' }).click();
  expect((await granted).status()).toBe(200);
  expect((await challenged).status()).toBeLessThan(300);
  await expect(page.getByTestId('verification-countdown')).toHaveText(/Te quedan \d+:\d{2}/u);

  await page.getByTestId('selfie-file-input').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Tu selfie antes de enviarla')).toBeVisible();
  const uploaded = waitForBackend(page, 'POST', '/selfie');
  await page.getByRole('button', { name: 'Enviar selfie' }).click();
  expect((await uploaded).status()).toBeLessThan(300);
  await expect(page.getByText('Tu selfie está en revisión')).toBeVisible();

  // Persistence: the server first, then the UI after a reload.
  const mine = await apiDe(member)<{ status: string }>('GET', '/me/verification');
  expect(mine.data.status).toBe('PENDING_REVIEW');
  await page.reload();
  await dismissTour(page);
  await expect(page.getByText('Tu selfie está en revisión')).toBeVisible({ timeout: 20_000 });
});

test('staff: approve next to the profile photos → the member is verified', async ({ page, browser }) => {
  await signIn(page, admin);
  await openPage(page, '/admin/verificaciones');
  await expect(page.getByRole('heading', { level: 1, name: 'Verificaciones' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button').filter({ hasText: member.nombre }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: member.nombre })).toBeFocused();
  await expect(page.getByAltText(`Selfie de ${member.nombre}`)).toBeVisible();
  await expect(page.getByTestId('compared-photos').getByRole('img')).toHaveCount(2);
  const decided = waitForBackend(page, 'POST', '/decide');
  await page.getByRole('button', { name: 'Aprobar' }).click();
  expect((await decided).status()).toBe(200);
  await expect(page.getByRole('button').filter({ hasText: member.nombre })).toHaveCount(0);

  const mine = await apiDe(member)<{ status: string; verifiedAt: string | null }>('GET', '/me/verification');
  expect(mine.data.status).toBe('APPROVED');
  expect(mine.data.verifiedAt).not.toBeNull();

  // The member sees it after a reload, and the CTA is gone from Conocer.
  const context = await browser.newContext();
  const memberPage = await context.newPage();
  await signIn(memberPage, member);
  await openPage(memberPage, '/settings');
  await expect(memberPage.getByTestId('verification-status')).toContainText('Perfil verificado', { timeout: 20_000 });
  await openPage(memberPage, '/comunidad');
  await expect(memberPage.getByTestId('verification-cta')).toHaveCount(0);
  await context.close();
});
