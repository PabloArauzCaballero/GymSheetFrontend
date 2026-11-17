import { expect, test, type Page } from '@playwright/test';
import { openPage, signIn } from './fixtures';
import { readablePhoto } from './kyc-datos';
import { BACKEND } from './alta-datos';
import { crearNegocioAprobado, type Negocio } from './negocio-datos';
import { crearCuenta, type Cuenta } from './rutinas-datos';

/**
 * Marketplace orders, franja 8d (ADR-0024), against the real backend: an
 * approved CENTER (since 8e a GYM's membership also needs the buyer's SOCIO,
 * covered by suscripciones.spec) configures its QR cobro in «Cobro» (bank data in two steps +
 * the private QR) and has a membership on sale → a person buys it from
 * /publicacion/:id, sees the business's QR and bank data, uploads a receipt →
 * the business opens «Pedidos», sees it in «Por confirmar», views the receipt
 * with zoom and confirms → the person reads «Confirmado». A second order is
 * rejected with AMOUNT_MISMATCH → the person reads the reason and «Volver a subir».
 *
 * Status codes checked against the controllers: POST /directory/payments/orders
 * has no @HttpCode (201); receipt, confirm and reject are @HttpCode(200); the
 * two PUT of payment-config answer 200.
 *
 * Needs: backend with `BUSINESS_SIGNUP_ENABLED=true`, the 8d migration and
 * `KYC_ENCRYPTION_KEY` (receipts and QR are encrypted, else 503), directory
 * categories seeded for the CENTER scope, `psql` (`E2E_PG*`) and `E2E_BACKEND_URL`.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

let business: Negocio;
let person: Cuenta;
let listingId = '';
let orderId = '';
let secondOrderId = '';
const listingName = () => `Mensual con QR ${business.handle}`;
const png = () => ({ name: 'imagen.png', mimeType: 'image/png', buffer: readablePhoto(400, 400, 40) });

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd));
}

test.beforeAll(async ({}, testInfo) => {
  const label = testInfo.project.name.replace(/[^a-z0-9]/giu, '').slice(0, 8);
  business = await crearNegocioAprobado(`ped${label}`, 'CENTER');
  person = await crearCuenta(`ped-${label}`, 'Persona Pedidos QA');
  // The listing itself is covered by negocio-publicaciones.spec: here it is created through the API.
  const created = await business.api<{ id: string; visibility: string }>('POST', '/business/me/listings', {
    offerKind: 'MEMBERSHIP',
    name: listingName(),
    description: 'Acceso libre a la sala de lunes a domingo.',
    benefits: [],
    price: 250,
    validityDays: 30,
    sessionsCount: null,
    stockQuantity: null,
    productCategoryId: null,
  });
  if (created.status !== 201 || created.data.visibility !== 'PUBLIC') throw new Error(`POST /business/me/listings answered ${created.status} ${created.code ?? ''}.`);
  listingId = created.data.id;
});

test('the business configures its QR cobro in two steps and uploads its QR', async ({ page }) => {
  await signIn(page, business);
  await openPage(page, '/negocio/cobro');
  await expect(page.getByRole('heading', { level: 1, name: 'Cobro' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Configura tu cobro para recibir pedidos.')).toBeVisible();

  await expect(page.getByText('Paso 1 de 2')).toBeVisible();
  await page.getByLabel('Banco', { exact: true }).fill('Banco Unión');
  await page.getByLabel('Titular de la cuenta', { exact: true }).fill(business.name);
  await page.getByLabel('Número de cuenta', { exact: true }).fill('1000-2000-3000');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Paso 2 de 2')).toBeVisible();
  const saved = waitForBff(page, 'PUT', '/api/backend/business/me/payment-config');
  await page.getByRole('button', { name: 'Guardar' }).click();
  const config = await saved;
  expect(config.status()).toBe(200);
  expect(config.request().postDataJSON()).toEqual({
    bankName: 'Banco Unión',
    accountHolderName: business.name,
    accountNumber: '1000-2000-3000',
    aliasOrPhone: null,
    instructions: null,
    acceptsCash: false,
    isActive: true,
  });
  await expect(page.getByText('Sube tu QR para que puedan pagarte.')).toBeVisible();

  const uploaded = waitForBff(page, 'PUT', '/api/backend/business/me/payment-config/qr');
  await page.getByLabel('Subir tu QR', { exact: true }).setInputFiles(png());
  const qr = await uploaded;
  expect(qr.status()).toBe(200);
  expect(qr.request().headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/u);
  await expect(page.getByText('Listo: te pueden pagar con tu QR.')).toBeVisible();
  // The QR is private: shown from an object URL of an authenticated fetch, never a public address.
  await expect(page.getByRole('img', { name: 'Tu QR de cobro' })).toHaveAttribute('src', /^blob:/u);
});

test('a person buys the membership, sees the QR and bank data and uploads a receipt', async ({ page }) => {
  test.skip(!listingId, 'needs the listing');
  await signIn(page, person);
  await openPage(page, `/publicacion/${listingId}`);
  await expect(page.getByRole('heading', { level: 1, name: listingName() })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Comprar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirma tu pedido' });
  await expect(dialog.getByText('Bs 250,00')).toBeVisible();
  // The method is a visually hidden radio inside its card: tap the card, as a person does.
  const qrRadio = dialog.getByRole('radio', { name: /Pagar con QR/u });
  await dialog.locator('label').filter({ has: qrRadio }).click();
  await expect(qrRadio).toBeChecked();
  const created = waitForBff(page, 'POST', '/api/backend/directory/payments/orders');
  await dialog.getByRole('button', { name: 'Confirmar pedido' }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  // The price comes from the listing: the body never carries an amount.
  expect(response.request().postDataJSON()).toEqual({ listingId, method: 'QR' });
  const body = (await response.json()) as { data: { id: string; status: string; amount: string } };
  expect(body.data).toMatchObject({ status: 'PENDING_PAYMENT', amount: '250.00' });
  orderId = body.data.id;

  await expect(page).toHaveURL(new RegExp(`/profile/compras/${orderId}$`, 'u'), { timeout: 20_000 });
  await expect(page.getByText('Pendiente de pago').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paga con el QR del negocio' })).toBeVisible();
  await expect(page.getByRole('img', { name: `QR de pago de ${business.name}` })).toHaveAttribute('src', /^blob:/u, { timeout: 20_000 });
  await expect(page.getByText('Banco Unión')).toBeVisible();
  await expect(page.getByText('1000-2000-3000')).toBeVisible();

  await page.getByRole('button', { name: 'Ya pagué' }).click();
  await page.getByLabel('Foto del comprobante', { exact: true }).setInputFiles(png());
  await page.getByLabel('Número de operación', { exact: true }).fill('OP-8D-001');
  const sent = waitForBff(page, 'POST', `/api/backend/directory/payments/orders/${orderId}/receipt`);
  await page.getByRole('button', { name: 'Enviar comprobante' }).click();
  const receipt = await sent;
  expect(receipt.status()).toBe(200);
  expect(((await receipt.json()) as { data: { status: string } }).data.status).toBe('PENDING_VERIFICATION');
  await expect(page.getByText('El negocio está revisando tu comprobante.')).toBeVisible();
});

test('the business sees it in «Por confirmar», views the receipt and confirms', async ({ page }) => {
  test.skip(!orderId, 'needs the order with its receipt');
  await signIn(page, business);
  await openPage(page, '/negocio/pedidos');
  await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: /Pedidos\s*1 por confirmar/u })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Por confirmar (1)' })).toBeVisible();
  await page.getByRole('link').filter({ hasText: 'Persona Pedidos QA' }).filter({ hasText: listingName() }).click();

  await expect(page).toHaveURL(new RegExp(`/negocio/pedidos/${orderId}$`, 'u'));
  await expect(page.getByRole('heading', { level: 1, name: 'Persona Pedidos QA' })).toBeVisible();
  await expect(page.getByText('Bs 250,00')).toBeVisible();
  await expect(page.getByText('OP-8D-001')).toBeVisible();
  const receipt = page.getByRole('img', { name: 'Comprobante de Persona Pedidos QA' });
  await expect(receipt).toHaveAttribute('src', /^blob:/u, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Acercar' }).click();
  await expect(page.getByText('1.5×')).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar pago' }).click();
  const confirmDialog = page.getByRole('dialog', { name: '¿Recibiste el pago?' });
  const confirmed = waitForBff(page, 'POST', `/api/backend/business/me/orders/${orderId}/confirm`);
  await confirmDialog.getByRole('button', { name: 'Confirmar pago' }).click();
  const decision = await confirmed;
  expect(decision.status()).toBe(200);
  expect(((await decision.json()) as { data: { status: string } }).data.status).toBe('CONFIRMED');
  await expect(page.getByText('Confirmado', { exact: true }).first()).toBeVisible();
});

test('the person reads «Confirmado»', async ({ page }) => {
  test.skip(!orderId, 'needs the confirmed order');
  await signIn(page, person);
  await openPage(page, '/profile/compras');
  await expect(page.getByRole('heading', { level: 1, name: 'Mis compras' })).toBeVisible({ timeout: 20_000 });
  const row = page.getByRole('link').filter({ hasText: listingName() });
  await expect(row).toContainText('Confirmado');
  await row.click();
  await expect(page.getByText('Listo: el negocio confirmó tu pago.')).toBeVisible({ timeout: 20_000 });
});

test('a rejected receipt shows its reason and «Volver a subir»', async ({ browser }) => {
  test.skip(!listingId, 'needs the listing');
  // The second order and its receipt go through the API: the UI of both was just exercised above.
  const created = await fetch(`${BACKEND}/directory/payments/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${person.token}` },
    body: JSON.stringify({ listingId, method: 'QR' }),
  });
  expect(created.status).toBe(201);
  secondOrderId = ((await created.json()) as { data: { id: string } }).data.id;
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(readablePhoto(400, 400, 40))], { type: 'image/png' }), 'comprobante.png');
  const receipt = await fetch(`${BACKEND}/directory/payments/orders/${secondOrderId}/receipt`, { method: 'POST', headers: { authorization: `Bearer ${person.token}` }, body: form });
  expect(receipt.status).toBe(200);

  const businessContext = await browser.newContext();
  const businessPage = await businessContext.newPage();
  await signIn(businessPage, business);
  await openPage(businessPage, `/negocio/pedidos/${secondOrderId}`);
  await expect(businessPage.getByRole('heading', { level: 1, name: 'Persona Pedidos QA' })).toBeVisible({ timeout: 20_000 });
  await businessPage.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await businessPage.getByRole('button', { name: 'El monto no coincide' }).click();
  const rejected = waitForBff(businessPage, 'POST', `/api/backend/business/me/orders/${secondOrderId}/reject`);
  await businessPage.getByRole('button', { name: 'Rechazar pago' }).click();
  const decision = await rejected;
  expect(decision.status()).toBe(200);
  expect(decision.request().postDataJSON()).toEqual({ reasonCode: 'AMOUNT_MISMATCH' });
  await businessContext.close();

  const personContext = await browser.newContext();
  const personPage = await personContext.newPage();
  await signIn(personPage, person);
  await openPage(personPage, `/profile/compras/${secondOrderId}`);
  await expect(personPage.getByText('El monto del comprobante no coincide con el pedido.')).toBeVisible({ timeout: 20_000 });
  await expect(personPage.getByText('Rechazado', { exact: true }).first()).toBeVisible();
  await personPage.getByRole('button', { name: 'Volver a subir' }).click();
  await expect(personPage.getByLabel('Foto del comprobante', { exact: true })).toBeAttached();
  await expect(personPage.getByRole('button', { name: 'Enviar comprobante' })).toBeVisible();
  await personContext.close();
});
