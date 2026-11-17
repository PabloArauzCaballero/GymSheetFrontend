import { expect, test, type Page } from '@playwright/test';
import { openPage, signIn } from './fixtures';
import { readablePhoto, runDigits } from './kyc-datos';
import { crearCuenta, promover, sql, type Cuenta } from './rutinas-datos';

/**
 * Business KYC, franja 8b (ADR-0021), against the real backend: a gym signs up
 * (steps 0–3, as in negocio-registro.spec), then «Tu teléfono» → «Datos
 * legales» (company + representative) → «Documentos» (CI both sides, consent →
 * gesture → selfie, public logo) → «Revisa y envía» → the result. Without an
 * OTP provider the backend answers `codeSent: false`, keeps the phone
 * unverified and the PHONE_VERIFIED check sends the attempt to IN_REVIEW
 * («Lo estamos revisando»). A REPP moderator then opens it in
 * /moderacion/negocios, sees the identity in clear and the private photo
 * (never cached), takes it and approves: the business reads «Verificado por
 * REPP» and its @handle goes public.
 *
 * Needs: backend with `BUSINESS_SIGNUP_ENABLED=true`, `KYC_ENCRYPTION_KEY` and
 * `IP_HASH_SECRET` set (else 503 KYC_UNAVAILABLE), no WhatsApp OTP provider,
 * writable media storage (documents and logo), PostgreSQL reachable by `psql`
 * (`E2E_PG*`) and directory categories seeded for the GYM scope.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

const run = Date.now().toString(36);
const account = { name: `Kyc Fit ${run}`, email: `negocio.kyc.${run}@gymsheet.local`, password: 'NegocioLocal2026!' };
const photo = { name: 'foto.png', mimeType: 'image/png', buffer: readablePhoto() };
let handle = '';
let submissionId = '';
let moderator: Cuenta;

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse(
    (response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd),
  );
}

async function signUpThroughStep3(page: Page): Promise<string> {
  await page.goto('/negocio/registro');
  // The radio is visually hidden inside its card: tap the card, as a person does.
  const gym = page.getByRole('radio', { name: /Gimnasio/u });
  await page.locator('label').filter({ has: gym }).click();
  await expect(gym).toBeChecked();
  await page.getByRole('button', { name: 'Seguir' }).click();
  await page.getByLabel('Nombre de tu negocio').fill(account.name);
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await page.getByRole('checkbox').check();
  const signedUp = waitForBff(page, 'POST', '/api/business/signup');
  await page.getByRole('button', { name: 'Crear cuenta de negocio' }).click();
  expect((await signedUp).status()).toBe(201);
  await expect(page.getByText('Paso 3 de 8')).toBeVisible();
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${account.email}'`);
  await page.reload();
  await expect(page.getByText('Paso 4 de 8')).toBeVisible({ timeout: 20_000 });
  const reserved = await page.getByLabel('Tu @usuario').inputValue();
  await expect(page.getByText(`@${reserved} está libre.`)).toBeVisible({ timeout: 15_000 });
  const category = page.getByLabel('Categoría');
  await expect(category.locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
  await category.selectOption({ index: 1 });
  await page.getByLabel('Ciudad').fill('Santa Cruz');
  const saved = waitForBff(page, 'PATCH', '/api/backend/business/me/profile');
  await page.getByRole('button', { name: 'Guardar y seguir' }).click();
  expect((await saved).status()).toBe(200);
  return reserved;
}

async function uploadTo(page: Page, slot: string) {
  const uploaded = waitForBff(page, 'POST', slot === 'LOGO' ? '/api/backend/business/me/media' : '/api/backend/business/me/kyc/documents');
  await page.getByTestId(`kyc-slot-${slot}`).locator('input[type=file]').setInputFiles(photo);
  expect((await uploaded).status(), `upload ${slot}`).toBe(201);
}

test.beforeAll(async () => {
  moderator = await promover(await crearCuenta('kyc-mod', 'Moderación KYC QA'), 'MODERATOR');
});

test('a gym goes through phone, legal data, documents and review, and lands in review without an OTP provider', async ({ page }) => {
  handle = await signUpThroughStep3(page);

  // Step 4: +591 and WhatsApp; no provider → the number is kept and the business goes on.
  await expect(page.getByText('Paso 5 de 8')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Tu celular')).toHaveAttribute('inputmode', 'tel');
  await page.getByLabel('Tu celular').fill(`7${runDigits(7)}`);
  const requested = waitForBff(page, 'POST', '/api/backend/business/me/phone/verify/request');
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  const phone = await requested;
  expect(phone.status()).toBe(202);
  expect(((await phone.json()) as { data: { codeSent: boolean } }).data.codeSent).toBe(false);
  await expect(page.getByText('Verificaremos tu número')).toBeVisible();
  await page.getByRole('button', { name: 'Seguir' }).click();

  // Step 5: company (four fields), then the representative; each part autosaves.
  await expect(page.getByText('Paso 6 de 8')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu empresa · 1 de 2' })).toBeVisible();
  await page.getByLabel('Razón social').fill(`${account.name} S.R.L.`);
  await page.getByLabel('NIT').fill(runDigits(10));
  await page.getByLabel('Dirección').fill('Av. Banzer 123, Santa Cruz');
  let draft = waitForBff(page, 'PUT', '/api/backend/business/me/kyc/draft');
  await page.getByRole('button', { name: /^Seguir/u }).click();
  expect((await draft).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Representante legal · 2 de 2' })).toBeVisible();
  await page.getByLabel('Nombre completo').fill('Ana Rojas Paz');
  await page.getByLabel('Número de carnet').fill(runDigits(7));
  await page.getByLabel('Expedido en').selectOption('SC');
  draft = waitForBff(page, 'PUT', '/api/backend/business/me/kyc/draft');
  await page.getByRole('button', { name: /^Seguir/u }).click();
  expect((await draft).status()).toBe(200);

  // A reload resumes at the exact step: the documents.
  await expect(page.getByText('Paso 7 de 8')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Paso 7 de 8')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^Seguir/u })).toBeDisabled();

  // Step 6: each photo says at once whether it reads; the selfie needs consent, then a gesture.
  await uploadTo(page, 'CI_FRONT');
  await expect(page.getByTestId('kyc-slot-CI_FRONT').getByText('Legible ✓')).toBeVisible();
  await uploadTo(page, 'CI_BACK');
  const selfie = page.getByTestId('kyc-slot-SELFIE');
  await expect(selfie.getByText('Borramos la selfie 30 días después de decidir.', { exact: false })).toBeVisible();
  const consent = waitForBff(page, 'PUT', '/api/backend/business/me/kyc/consent');
  await selfie.getByRole('button', { name: 'Aceptar y continuar' }).click();
  expect((await consent).status()).toBe(200);
  const challenge = waitForBff(page, 'POST', '/api/backend/business/me/kyc/selfie-challenge');
  await selfie.getByRole('button', { name: 'Pedir mi gesto' }).click();
  expect((await challenge).status()).toBe(201);
  await expect(page.getByTestId('kyc-gesture')).toBeVisible();
  await uploadTo(page, 'SELFIE');
  await expect(selfie.getByText('Legible ✓')).toBeVisible();
  await uploadTo(page, 'LOGO');
  await page.getByRole('button', { name: /^Seguir/u }).click();

  // Step 7: the summary, then the submit; the phone was never verified → review.
  await expect(page.getByText('Paso 8 de 8')).toBeVisible();
  await expect(page.getByText(`@${handle}`)).toBeVisible();
  await expect(page.getByText('+591 •••••', { exact: false })).toBeVisible();
  const submitted = waitForBff(page, 'POST', '/api/backend/business/me/kyc/submit');
  await page.getByRole('button', { name: /Enviar a verificación/u }).click();
  const result = await submitted;
  expect(result.status()).toBe(200);
  const body = (await result.json()) as { data: { submissionId: string; status: string; userFacingCodes: string[] } };
  expect(body.data.status).toBe('IN_REVIEW');
  expect(body.data.userFacingCodes).toContain('PHONE_VERIFIED');
  submissionId = body.data.submissionId;
  await expect(page.getByRole('heading', { name: 'Lo estamos revisando' })).toBeVisible();
  await expect(page.getByText(/Te respondemos antes del/u)).toBeVisible();
  await expect(page.getByText('Confirmamos tu teléfono a mano.')).toBeVisible();

  // Later visits land on the status, not on the wizard.
  await page.goto('/negocio/registro');
  await expect(page).toHaveURL(/\/negocio\/verificacion$/u, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Lo estamos revisando' })).toBeVisible();

  // Still a PENDING handle: not public before a decision.
  expect((await page.goto(`/@${handle}`))?.status()).toBe(404);
});

test('a REPP moderator opens the case from the queue and approves it', async ({ browser }) => {
  test.skip(!submissionId, 'needs the submission of the previous test');
  // First in the queue whatever other runs left there (oldest due first).
  await sql(`UPDATE business.kyc_submissions SET review_due_at = now() - interval '30 days' WHERE id = '${submissionId}'`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, moderator);
  // A new moderator gets the welcome tour on the first page: close it like any other spec.
  await openPage(page, '/moderacion/negocios');
  await expect(page.getByRole('heading', { level: 1, name: 'Negocios' })).toBeVisible({ timeout: 20_000 });

  const detail = waitForBff(page, 'GET', `/api/backend/admin/business/kyc/${submissionId}`);
  const document = page.waitForResponse((response) => new URL(response.url()).pathname.includes(`/admin/business/kyc/${submissionId}/documents/`));
  await page.getByRole('button', { name: new RegExp(account.name, 'u') }).click();
  expect((await detail).status()).toBe(200);
  const photoResponse = await document;
  expect(photoResponse.status()).toBe(200);
  expect(photoResponse.headers()['cache-control']).toContain('no-store');
  await expect(page.getByRole('img', { name: 'Carnet, anverso' })).toHaveAttribute('src', /^blob:/u);
  await expect(page.getByText('Teléfono verificado')).toBeVisible();

  const claimed = waitForBff(page, 'POST', `/api/backend/admin/business/kyc/${submissionId}/claim`);
  await page.getByRole('button', { name: 'Tomar' }).click();
  expect((await claimed).status()).toBe(200);
  const decided = waitForBff(page, 'POST', `/api/backend/admin/business/kyc/${submissionId}/decide`);
  await page.getByRole('button', { name: 'Aprobar' }).click();
  const decision = await decided;
  expect(decision.status()).toBe(200);
  expect(decision.request().postDataJSON()).toEqual({ decision: 'APPROVE', reasonCodes: [] });
  await expect(page.getByText('Negocio aprobado: ya lleva «Verificado por REPP».')).toBeVisible();
  await context.close();
});

test('the business reads its approval and its @handle is public', async ({ page }) => {
  test.skip(!submissionId, 'needs the approval of the previous test');
  await signIn(page, account);
  await page.goto('/negocio/verificacion');
  await expect(page.getByRole('heading', { name: `¡Listo! Tu negocio ya está publicado en @${handle}` })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('REPP ya revisó tus datos. Tu ficha lleva «Verificado por REPP».')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Publica tu primer plan o producto' })).toHaveAttribute('href', '/negocio/publicaciones/nueva');
  await page.goto('/negocio');
  await expect(page.getByRole('status', { name: 'Estado de tu negocio' })).toContainText('Verificado por REPP');
  expect((await page.goto(`/@${handle}`))?.status()).toBeLessThan(400);
});
