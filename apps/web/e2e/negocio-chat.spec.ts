import { expect, test, type Page } from '@playwright/test';
import { openPage, signIn } from './fixtures';
import { crearNegocioAprobado, type Negocio } from './negocio-datos';
import { crearCuenta, sql, type Cuenta } from './rutinas-datos';

/**
 * Chat with a business, franja 8f (ADR-0023), against the real backend: a
 * person opens the approved business's `/@handle` and taps «Escribir» → the
 * chat opens with no social connection and the person writes → the business
 * reads it in `/negocio/mensajes` (no socket: the inbox and the thread poll)
 * and answers over REST → the person reads the answer → the business blocks
 * the person → «Escribir» on the same profile now says the business does not
 * receive their messages, and nothing opens.
 *
 * Needs a backend with BOTH franja 8c (listings, public profiles) and the 8f
 * chat (`POST /me/business-conversations`, `/business/me/conversations/:id/block`,
 * the `kind` column), `BUSINESS_SIGNUP_ENABLED=true`, directory categories
 * seeded for the GYM scope, PostgreSQL reachable by `psql` (`E2E_PG*`) and
 * `E2E_BACKEND_URL` (or `BACKEND_API_URL`). Status codes are the
 * controllers': open 201 (200 when the chat already existed), send 201,
 * block 200 (`@HttpCode(OK)`), refused open 403 `BUSINESS_CHAT_BLOCKED`.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

let business: Negocio;
let person: Cuenta;
let conversationId = '';
const question = () => `Hola, ¿tienen plan mensual? ${business.handle}`;
const answer = () => `Sí: 250 Bs al mes. ${business.handle}`;

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse(
    (response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd),
  );
}

test.beforeAll(async ({}, testInfo) => {
  const label = testInfo.project.name.replace(/[^a-z0-9]/giu, '').slice(0, 8);
  business = await crearNegocioAprobado(`chat${label}`);
  person = await crearCuenta(`chatneg-${label}`, 'Persona Chat Negocio QA');
  // Opening a business chat needs a verified email (403 EMAIL_VERIFICATION_REQUIRED otherwise).
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${person.email}'`);
});

test('a person writes to the business from its @handle, with no connection', async ({ page }) => {
  await signIn(page, person);
  await openPage(page, `/@${business.handle}`);
  await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible({ timeout: 20_000 });

  const opened = waitForBff(page, 'POST', '/api/backend/me/business-conversations');
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  const response = await opened;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({ entityId: business.entityId });
  conversationId = ((await response.json()) as { data: { conversationId: string } }).data.conversationId;
  await expect(page).toHaveURL(new RegExp(`/chat/${conversationId}$`, 'u'), { timeout: 20_000 });

  // The other side is the business: its name, the «Negocio» mark and no location button.
  await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Negocio', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compartir mi ubicación' })).toHaveCount(0);

  await page.getByLabel('Mensaje', { exact: true }).fill(question());
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  const thread = page.getByRole('log', { name: 'Mensajes' });
  await expect(thread.getByText(question())).toBeVisible({ timeout: 20_000 });

  // Persistence: a reload reads it back from the history, not from the screen's memory.
  await page.reload();
  await expect(page.getByRole('log', { name: 'Mensajes' }).getByText(question())).toBeVisible({ timeout: 20_000 });
});

test('the business reads it in «Mensajes» and answers', async ({ browser }) => {
  test.skip(!conversationId, 'needs the conversation of the previous test');
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, business);
  await openPage(page, '/negocio/mensajes');
  await expect(page.getByRole('heading', { level: 1, name: 'Mensajes' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('navigation', { name: 'Secciones de tu negocio' }).getByRole('link', { name: 'Mensajes', exact: true })).toHaveAttribute('aria-current', 'page');

  const row = page.getByRole('list', { name: 'Tus conversaciones' }).getByRole('link').filter({ hasText: question() });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row).toHaveAttribute('href', `/negocio/mensajes/${conversationId}`);
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/negocio/mensajes/${conversationId}$`, 'u'));

  const thread = page.getByRole('log', { name: 'Mensajes' });
  await expect(thread.getByText(question())).toBeVisible({ timeout: 20_000 });
  // The business only answers: no report, no location, no presence; it can block.
  await expect(page.getByRole('button', { name: 'Reportar mensaje' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Compartir mi ubicación' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Bloquear a esta persona' })).toBeVisible();

  const sent = waitForBff(page, 'POST', `/api/backend/me/conversations/${conversationId}/messages`);
  await page.getByLabel('Mensaje', { exact: true }).fill(answer());
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  expect((await sent).status()).toBe(201);
  await expect(thread.getByText(answer())).toBeVisible();

  await page.reload();
  await expect(page.getByRole('log', { name: 'Mensajes' }).getByText(answer())).toBeVisible({ timeout: 20_000 });
  await context.close();
});

test('the person reads the answer', async ({ page }) => {
  test.skip(!conversationId, 'needs the answer of the previous test');
  await signIn(page, person);
  await openPage(page, '/chat');
  const row = page.getByRole('link').filter({ hasText: answer() });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row).toContainText('Negocio');
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/chat/${conversationId}$`, 'u'));
  await expect(page.getByRole('log', { name: 'Mensajes' }).getByText(answer())).toBeVisible({ timeout: 20_000 });
});

test('the business blocks the person and «Escribir» says so', async ({ browser, page }) => {
  test.skip(!conversationId, 'needs the conversation of the first test');
  const context = await browser.newContext();
  const businessPage = await context.newPage();
  await signIn(businessPage, business);
  await openPage(businessPage, `/negocio/mensajes/${conversationId}`);
  await businessPage.getByRole('button', { name: 'Bloquear a esta persona' }).click();
  const dialog = businessPage.getByRole('dialog', { name: '¿Bloquear a esta persona?' });
  await expect(dialog).toBeVisible();
  const blocked = waitForBff(businessPage, 'POST', `/api/backend/business/me/conversations/${conversationId}/block`);
  await dialog.getByRole('button', { name: 'Bloquear', exact: true }).click();
  const response = await blocked;
  expect(response.status()).toBe(200);
  expect(((await response.json()) as { data: unknown }).data).toEqual({ conversationId, blocked: true });
  await expect(businessPage).toHaveURL(/\/negocio\/mensajes$/u, { timeout: 20_000 });
  await expect(businessPage.getByRole('link').filter({ hasText: answer() })).toHaveCount(0);
  await context.close();

  await signIn(page, person);
  await openPage(page, `/@${business.handle}`);
  await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible({ timeout: 20_000 });
  const refused = waitForBff(page, 'POST', '/api/backend/me/business-conversations');
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  const refusal = await refused;
  expect(refusal.status()).toBe(403);
  expect(((await refusal.json()) as { code?: string }).code).toBe('BUSINESS_CHAT_BLOCKED');
  await expect(page.getByRole('alert').filter({ hasText: 'Este negocio no recibe tus mensajes' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/(@|%40)${business.handle}$`, 'u'));
});
