import { expect, test, type Page } from '@playwright/test';
import { dismissTour, openPage, signIn } from './fixtures';
import { readablePhoto } from './kyc-datos';
import { BACKEND } from './alta-datos';
import { crearNegocioAprobado, type Negocio } from './negocio-datos';
import { apiDe, crearCuenta, sql, type Cuenta } from './rutinas-datos';

/**
 * Closing a business account, franja 8f (ADR-0028), against the real backend:
 * an approved CENTER with a membership on sale, its QR cobro, a chat a person
 * opened and a QR order in PENDING_VERIFICATION (all built through the API;
 * negocio-pedidos.spec and negocio-chat.spec cover their UI) →
 * the business asks for its data from «Cuenta» → «Cerrar mi cuenta de
 * negocio» shows the receipt that blocks it with the way to «Pedidos» → the
 * business confirms the order there → closing now succeeds with the password
 * and lands on the goodbye page → the public `/@handle` is a 404 → the person
 * reads «Negocio cerrado» in the chat list and the thread, with no composer.
 *
 * Status codes checked against the controllers: POST /me/export is
 * @HttpCode(ACCEPTED) (202); GET closure-preview 200; order confirm
 * @HttpCode(200); DELETE /me/account @HttpCode(OK) (200).
 *
 * Needs: backend with franja 8f (`blockers`, `businessClosed`, business
 * closure), `BUSINESS_SIGNUP_ENABLED=true`, `KYC_ENCRYPTION_KEY` (receipts and
 * QR are encrypted), directory categories seeded for the CENTER scope, `psql`
 * (`E2E_PG*`) and `E2E_BACKEND_URL`.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

let business: Negocio;
let person: Cuenta;
let listingId = '';
let orderId = '';
let closed = false;
const question = () => `¿Siguen abiertos? ${business.handle}`;
const png = () => new Blob([new Uint8Array(readablePhoto(400, 400, 40))], { type: 'image/png' });

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd));
}

async function upload(path: string, token: string, method: 'POST' | 'PUT') {
  const form = new FormData();
  form.append('file', png(), 'imagen.png');
  return fetch(`${BACKEND}${path}`, { method, headers: { authorization: `Bearer ${token}` }, body: form });
}

/** The «Cerrar mi cuenta de negocio» disclosure, opened, with its preview loaded. */
async function openClosure(page: Page) {
  await openPage(page, '/negocio/cuenta');
  await expect(page.getByRole('heading', { level: 1, name: 'Cuenta' })).toBeVisible({ timeout: 20_000 });
  const closure = page.locator('details').filter({ has: page.getByText('Cerrar mi cuenta de negocio', { exact: true }) });
  await closure.getByText('Cerrar mi cuenta de negocio', { exact: true }).click();
  const preview = waitForBff(page, 'GET', '/api/backend/me/account/closure-preview');
  await closure.getByRole('button', { name: 'Revisar qué se borra' }).click();
  const answer = await preview;
  expect(answer.status()).toBe(200);
  return { closure, body: (await answer.json()) as { data: { blockers: Array<{ code: string; count: number }>; account: { label: string } } } };
}

test.beforeAll(async ({}, testInfo) => {
  const label = testInfo.project.name.replace(/[^a-z0-9]/giu, '').slice(0, 8);
  business = await crearNegocioAprobado(`cie${label}`, 'CENTER');
  person = await crearCuenta(`cierre-${label}`, 'Persona Cierre QA');
  // Opening a business chat needs a verified email (403 EMAIL_VERIFICATION_REQUIRED otherwise).
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${person.email}'`);

  const config = await business.api('PUT', '/business/me/payment-config', {
    bankName: 'Banco Unión', accountHolderName: business.name, accountNumber: '1000-2000-3000',
    aliasOrPhone: null, instructions: null, acceptsCash: false, isActive: true,
  });
  if (config.status !== 200) throw new Error(`PUT /business/me/payment-config answered ${config.status} ${config.code ?? ''}.`);
  const qr = await upload('/business/me/payment-config/qr', business.token, 'PUT');
  if (qr.status !== 200) throw new Error(`PUT /business/me/payment-config/qr answered ${qr.status}.`);
  const listing = await business.api<{ id: string }>('POST', '/business/me/listings', {
    offerKind: 'MEMBERSHIP', name: `Mensual cierre ${business.handle}`, description: 'Acceso libre a la sala.',
    benefits: [], price: 180, validityDays: 30, sessionsCount: null, stockQuantity: null, productCategoryId: null,
  });
  if (listing.status !== 201) throw new Error(`POST /business/me/listings answered ${listing.status} ${listing.code ?? ''}.`);
  listingId = listing.data.id;

  const personApi = apiDe(person);
  const chat = await personApi<{ conversationId: string }>('POST', '/me/business-conversations', { entityId: business.entityId });
  if (chat.status !== 201) throw new Error(`POST /me/business-conversations answered ${chat.status} ${chat.code ?? ''}.`);
  const sent = await personApi('POST', `/me/conversations/${chat.data.conversationId}/messages`, { type: 'text', body: question() });
  if (sent.status !== 201) throw new Error(`POST /me/conversations/:id/messages answered ${sent.status} ${sent.code ?? ''}.`);

  const order = await personApi<{ id: string }>('POST', '/directory/payments/orders', { listingId, method: 'QR' });
  if (order.status !== 201) throw new Error(`POST /directory/payments/orders answered ${order.status} ${order.code ?? ''}.`);
  orderId = order.data.id;
  const receipt = await upload(`/directory/payments/orders/${orderId}/receipt`, person.token, 'POST');
  if (receipt.status !== 200) throw new Error(`POST /directory/payments/orders/:id/receipt answered ${receipt.status}.`);
});

test('the business asks for a copy of its data from «Cuenta»', async ({ page }) => {
  await signIn(page, business);
  await openPage(page, '/negocio/cuenta');
  await expect(page.getByRole('heading', { level: 1, name: 'Cuenta' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: 'Términos para negocios' })).toHaveAttribute('href', '/negocio/terminos');
  const export_ = page.getByRole('region', { name: 'Exportar mis datos' });
  const requested = waitForBff(page, 'POST', '/api/backend/me/export');
  await export_.getByRole('button', { name: 'Preparar copia', exact: true }).click();
  const response = await requested;
  expect(response.status()).toBe(202);
  expect(((await response.json()) as { data: { status: string } }).data.status).toBe('PENDING');
  // Persistence: a reload resumes the same request from `GET /me/export/latest`.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Exportar mis datos' }).getByText(/Preparando tu copia|Tu copia está lista/u)).toBeVisible({ timeout: 20_000 });
});

test('a receipt waiting for the business blocks the closure and points to «Pedidos»', async ({ page }) => {
  test.skip(!orderId, 'needs the order with its receipt');
  await signIn(page, business);
  const { closure, body } = await openClosure(page);
  expect(body.data.blockers).toEqual([{ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: 1 }]);
  await expect(closure.getByRole('heading', { name: 'Tu cuenta de negocio' })).toBeVisible();
  await expect(closure.getByText('Tienes 1 comprobante de pago por revisar')).toBeVisible();
  // No proof while it waits: the backend would answer 409 anyway.
  await expect(closure.getByLabel('Tu contraseña', { exact: true })).toHaveCount(0);

  await closure.getByRole('link', { name: 'Ir a Pedidos' }).click();
  await expect(page).toHaveURL(/\/negocio\/pedidos$/u, { timeout: 20_000 });
  await page.getByRole('link').filter({ hasText: 'Persona Cierre QA' }).click();
  await expect(page).toHaveURL(new RegExp(`/negocio/pedidos/${orderId}$`, 'u'));
  await page.getByRole('button', { name: 'Confirmar pago' }).click();
  const confirmed = waitForBff(page, 'POST', `/api/backend/business/me/orders/${orderId}/confirm`);
  await page.getByRole('dialog', { name: '¿Recibiste el pago?' }).getByRole('button', { name: 'Confirmar pago' }).click();
  const decision = await confirmed;
  expect(decision.status()).toBe(200);
  expect(((await decision.json()) as { data: { status: string } }).data.status).toBe('CONFIRMED');
});

test('with nothing pending, the business closes with its password', async ({ page, browser }) => {
  test.skip(!orderId, 'needs the confirmed order');
  await signIn(page, business);
  const { closure, body } = await openClosure(page);
  expect(body.data.blockers).toEqual([]);
  await expect(closure.getByRole('region', { name: 'Qué pasa al cerrar' })).toContainText('180 días');
  await closure.getByLabel('Tu contraseña', { exact: true }).fill(business.password);
  await closure.getByRole('button', { name: 'Cerrar mi cuenta de negocio', exact: true }).click();
  const deleted = waitForBff(page, 'DELETE', '/api/backend/me/account');
  await page.getByRole('dialog', { name: '¿Cerrar tu negocio para siempre?' }).getByRole('button', { name: 'Cerrar mi negocio' }).click();
  const response = await deleted;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({ password: business.password });
  expect(((await response.json()) as { data: { closed: boolean } }).data.closed).toBe(true);
  closed = true;
  await expect(page).toHaveURL(/\/adios$/u, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Tu cuenta está cerrada' })).toBeVisible();

  // The public profile is gone: the handle is retired without a redirect.
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  expect((await visitor.goto(`/@${business.handle}`))?.status()).toBe(404);
  await visitorContext.close();
});

test('the person reads «Negocio cerrado» and can no longer write', async ({ page }) => {
  test.skip(!closed, 'needs the closed business');
  await signIn(page, person);
  await openPage(page, '/chat');
  const row = page.getByRole('link').filter({ hasText: 'Negocio cerrado' }).filter({ hasText: question() });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  // The thread may be the new person's first portal page: the welcome tour opens there.
  await dismissTour(page);
  await expect(page.getByRole('log', { name: 'Mensajes' }).getByText(question())).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Este negocio cerró su cuenta en REPP' })).toBeVisible();
  await expect(page.getByLabel('Mensaje', { exact: true })).toHaveCount(0);
});
