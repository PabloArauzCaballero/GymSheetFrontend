import { expect, test, type Page } from '@playwright/test';
import { dismissTour, openPage, signIn } from './fixtures';
import { BACKEND } from './alta-datos';
import { readablePhoto } from './kyc-datos';
import { crearNegocioAprobado, type Negocio } from './negocio-datos';
import { crearCuenta, sql, type Cuenta } from './rutinas-datos';

/**
 * Unified subscriptions, franja 8e (ADR-0026), against the real backend: an
 * approved GYM with one sede, a QR cobro and a MEMBERSHIP listing → a person
 * buys it from /publicacion/:id and the checkout asks «Hazte socio» (sede + 3
 * CI digits) → the order carries the SOCIO data → the person sends a receipt
 * → the gym confirms with «También confirmo que es socio» checked → the person
 * sees «Mis suscripciones» ACTIVE with its days and «Mi gimnasio» CONFIRMED
 * «Socio activo hasta …» → the gym suspends the plan in «Suscriptores» with a
 * reason chip → the person reads SUSPENDED and its history.
 *
 * Status codes checked against the controllers: POST /directory/payments/orders
 * has no @HttpCode (201); receipt, confirm and suspend are @HttpCode(200);
 * POST /business/me/locations is 201; both PUT of payment-config answer 200.
 *
 * Needs: backend with franja 8e (migrations `202611201001-subscription-ledger`
 * and `202611201002-retire-membership-machinery`) on top of 7b, 7c and 8d,
 * `BUSINESS_SIGNUP_ENABLED=true`, `KYC_ENCRYPTION_KEY`, directory categories
 * seeded for the GYM scope, `psql` (`E2E_PG*`) and `E2E_BACKEND_URL`.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

let gym: Negocio;
let person: Cuenta;
let sedeId = '';
let listingId = '';
let orderId = '';
const SEDE = 'Sede Norte';
const CI = '482';
const listingName = () => `Mensual socios ${gym.handle}`;

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd));
}

async function putQr(token: string): Promise<number> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(readablePhoto(400, 400, 40))], { type: 'image/png' }), 'qr.png');
  const response = await fetch(`${BACKEND}/business/me/payment-config/qr`, { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: form });
  return response.status;
}

test.beforeAll(async ({}, testInfo) => {
  const label = testInfo.project.name.replace(/[^a-z0-9]/giu, '').slice(0, 8);
  gym = await crearNegocioAprobado(`sus${label}`);
  // Sede, cobro and listing go through the API: their panels are covered by the 8c and 8d specs.
  const sede = await gym.api<{ id: string }>('POST', '/business/me/locations', { name: SEDE, city: 'Santa Cruz' });
  if (sede.status !== 201) throw new Error(`POST /business/me/locations answered ${sede.status} ${sede.code ?? ''}.`);
  sedeId = sede.data.id;
  const config = await gym.api('PUT', '/business/me/payment-config', { bankName: 'Banco Unión', accountHolderName: gym.name, acceptsCash: false, isActive: true });
  if (config.status !== 200) throw new Error(`PUT /business/me/payment-config answered ${config.status} ${config.code ?? ''}.`);
  const qr = await putQr(gym.token);
  if (qr !== 200) throw new Error(`PUT /business/me/payment-config/qr answered ${qr}.`);
  const created = await gym.api<{ id: string; visibility: string }>('POST', '/business/me/listings', {
    offerKind: 'MEMBERSHIP',
    name: listingName(),
    description: 'Sala libre de lunes a domingo.',
    benefits: [],
    price: 180,
    validityDays: 30,
    sessionsCount: null,
    stockQuantity: null,
    productCategoryId: null,
  });
  if (created.status !== 201 || created.data.visibility !== 'PUBLIC') throw new Error(`POST /business/me/listings answered ${created.status} ${created.code ?? ''}.`);
  listingId = created.data.id;
  person = await crearCuenta(`sus-${label}`, 'Persona Suscripciones QA');
  // Becoming SOCIO needs a verified email (403 EMAIL_VERIFICATION_REQUIRED otherwise).
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${person.email}'`);
});

test('the checkout asks «Hazte socio» and the order carries the SOCIO data', async ({ page }) => {
  await signIn(page, person);
  await openPage(page, `/publicacion/${listingId}`);
  await expect(page.getByRole('heading', { level: 1, name: listingName() })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Comprar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirma tu pedido' });
  await expect(dialog.getByText('Bs 180,00')).toBeVisible();
  // Not SOCIO of this gym yet: step 1 leads to step 2 instead of creating the order.
  await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
  const step = dialog.getByTestId('checkout-socio-step');
  await expect(step.getByRole('heading', { name: 'Hazte socio' })).toBeVisible();
  // The only sede comes preselected: a visually hidden radio inside its card.
  await expect(step.getByRole('radio', { name: new RegExp(SEDE, 'u') })).toBeChecked({ timeout: 20_000 });
  await step.getByLabel('Últimos 3 dígitos de tu CI', { exact: true }).fill(CI);

  const sent = waitForBff(page, 'POST', '/api/backend/directory/payments/orders');
  await dialog.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
  const response = await sent;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({ listingId, method: 'QR', affiliation: { locationId: sedeId, ciLast3: CI } });
  orderId = ((await response.json()) as { data: { id: string } }).data.id;
  await expect(page).toHaveURL(new RegExp(`/profile/compras/${orderId}$`, 'u'), { timeout: 20_000 });
  // The order page is the new person's first portal page: the welcome tour opens there.
  await dismissTour(page);

  await page.getByRole('button', { name: 'Ya pagué' }).click();
  await page.getByLabel('Foto del comprobante', { exact: true }).setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: readablePhoto(400, 400, 40) });
  const uploaded = waitForBff(page, 'POST', `/api/backend/directory/payments/orders/${orderId}/receipt`);
  await page.getByRole('button', { name: 'Enviar comprobante' }).click();
  expect((await uploaded).status()).toBe(200);
  await expect(page.getByText('El negocio está revisando tu comprobante.')).toBeVisible();

  // The REQUESTED SOCIO was born with the order: «Mi gimnasio» says so.
  await openPage(page, '/mi-gimnasio');
  await expect(page.getByTestId('my-gym-card')).toHaveAttribute('data-state', 'REQUESTED', { timeout: 20_000 });
});

test('the gym confirms the payment and the SOCIO at once', async ({ page }) => {
  test.skip(!orderId, 'needs the order with its receipt');
  await signIn(page, gym);
  await openPage(page, `/negocio/pedidos/${orderId}`);
  await expect(page.getByRole('heading', { level: 1, name: person.nombre })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Confirmar pago', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '¿Recibiste el pago?' });
  await expect(dialog.getByRole('checkbox', { name: 'También confirmo que es socio' })).toBeChecked();
  const confirmed = waitForBff(page, 'POST', `/api/backend/business/me/orders/${orderId}/confirm`);
  await dialog.getByRole('button', { name: 'Confirmar pago', exact: true }).click();
  const decision = await confirmed;
  expect(decision.status()).toBe(200);
  expect(decision.request().postDataJSON()).toEqual({ alsoConfirmAffiliation: true });
  expect(((await decision.json()) as { data: { status: string } }).data.status).toBe('CONFIRMED');
  await expect(page.getByText('Confirmado', { exact: true }).first()).toBeVisible();
});

test('the person sees the plan ACTIVE and «Socio activo hasta …»', async ({ page }) => {
  test.skip(!orderId, 'needs the confirmed order');
  await signIn(page, person);
  await openPage(page, '/profile/suscripciones');
  await expect(page.getByRole('heading', { level: 1, name: 'Mis suscripciones' })).toBeVisible({ timeout: 20_000 });
  const group = page.getByTestId('subscription-group').filter({ has: page.getByRole('heading', { name: gym.name }) });
  await expect(group).toContainText('Socio');
  const line = group.getByTestId('subscription-line').filter({ hasText: listingName() });
  await expect(line).toHaveAttribute('data-status', 'ACTIVE');
  await expect(line).toContainText('Activa');
  // A 30-day period starts today: its last day is day 30, 29 days away.
  await expect(line).toContainText('Quedan 29 días');

  await openPage(page, '/mi-gimnasio');
  const card = page.getByTestId('my-gym-card');
  await expect(card).toHaveAttribute('data-state', 'CONFIRMED', { timeout: 20_000 });
  await expect(card.getByTestId('my-gym-plan')).toContainText(/Socio activo hasta el \d{1,2} de [a-z]+/u);
});

test('the gym sees the subscriber and suspends the plan with a reason', async ({ page }) => {
  test.skip(!orderId, 'needs the confirmed order');
  await signIn(page, gym);
  await openPage(page, '/negocio/suscriptores');
  await expect(page.getByRole('heading', { level: 1, name: 'Suscriptores' })).toBeVisible({ timeout: 20_000 });
  const row = page.getByTestId('subscriber-row').filter({ hasText: person.nombre });
  await expect(row).toContainText(listingName());
  await expect(row).toContainText(SEDE);
  await expect(row).toHaveAttribute('data-status', 'ACTIVE');

  await row.getByRole('button', { name: 'Suspender', exact: true }).click();
  await row.getByRole('button', { name: 'Salud', exact: true }).click();
  const suspended = page.waitForResponse((response) => response.request().method() === 'POST' && /\/api\/backend\/business\/me\/subscriptions\/[^/]+\/suspend$/u.test(new URL(response.url()).pathname));
  await row.getByRole('button', { name: 'Suspender plan', exact: true }).click();
  const decision = await suspended;
  expect(decision.status()).toBe(200);
  expect(decision.request().postDataJSON()).toEqual({ reasonCode: 'HEALTH' });
  await expect(row).toHaveAttribute('data-status', 'SUSPENDED');
  await expect(row).toContainText('Suspendida');
  await expect(row.getByRole('button', { name: 'Reactivar', exact: true })).toBeVisible();
});

test('the person reads SUSPENDED and its history', async ({ page }) => {
  test.skip(!orderId, 'needs the suspended plan');
  await signIn(page, person);
  await openPage(page, '/profile/suscripciones');
  const line = page.getByTestId('subscription-line').filter({ hasText: listingName() });
  await expect(line).toHaveAttribute('data-status', 'SUSPENDED', { timeout: 20_000 });
  await expect(line).toContainText('Suspendida');
  await line.getByRole('link', { name: new RegExp(listingName(), 'u') }).click();
  await expect(page.getByRole('heading', { level: 1, name: listingName() })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Se suspendió · Por un tema de salud.')).toBeVisible();
});
