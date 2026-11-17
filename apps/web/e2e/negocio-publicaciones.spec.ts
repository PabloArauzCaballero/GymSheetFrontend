import { expect, test, type Page } from '@playwright/test';
import { openPage, signIn } from './fixtures';
import { crearNegocioAprobado, type Negocio } from './negocio-datos';
import { crearCuenta, promover, sql, type Cuenta } from './rutinas-datos';

/**
 * Marketplace listings, franja 8c (ADR-0022), against the real backend: an
 * approved gym (built through the API + SQL in `negocio-datos.ts`) publishes a
 * membership in the four-step form → it shows in /marketplace and on its
 * /@handle → a person reports it from the listing → a REPP moderator hides it
 * from the moderation queue → it is gone from every public surface, the seller
 * reads «Oculta por REPP» with its content frozen → in /moderacion/negocios,
 * tab «Publicaciones» → «Ocultas», the moderator rejects it and the seller
 * reads «Rechazada por REPP».
 *
 * A LIVE listing never sits in «Publicaciones» (that tab lists HELD, HIDDEN and
 * REJECTED): a report reaches REPP through the central queue, so that is where
 * it is hidden; the tab is where the hidden one is decided.
 *
 * Needs: backend with `BUSINESS_SIGNUP_ENABLED=true` and the 8c migrations,
 * directory categories seeded for the GYM scope, PostgreSQL reachable by
 * `psql` (`E2E_PG*`), and `E2E_BACKEND_URL` (or `BACKEND_API_URL`).
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

let business: Negocio;
let person: Cuenta;
let moderator: Cuenta;
let listingId = '';
const listingName = () => `Mensual libre ${business.handle}`;

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse(
    (response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd),
  );
}

test.beforeAll(async ({}, testInfo) => {
  const label = testInfo.project.name.replace(/[^a-z0-9]/giu, '').slice(0, 8);
  business = await crearNegocioAprobado(label);
  person = await crearCuenta(`pub-${label}`, 'Persona Marketplace QA');
  moderator = await promover(await crearCuenta(`pubmod-${label}`, 'Moderación Marketplace QA'), 'MODERATOR');
});

test('an approved gym publishes a membership in four steps and it goes live', async ({ page }) => {
  await signIn(page, business);
  await openPage(page, '/negocio/publicaciones');
  await expect(page.getByRole('heading', { level: 1, name: 'Publicaciones' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('link', { name: 'Nueva publicación' }).click();

  // Step 1: the kind. The radio is visually hidden inside its card: tap the card, as a person does.
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
  const membership = page.getByRole('radio', { name: /Membresía/u });
  await page.locator('label').filter({ has: membership }).click();
  await expect(membership).toBeChecked();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Step 2: photos are optional.
  await expect(page.getByRole('heading', { name: 'Añade fotos' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltar' }).click();

  // Step 3: name, price in Bs (decimal keyboard) and what it includes. Exact labels: the form itself
  // is named after the step («Nombre y precio»).
  await expect(page.getByText('Paso 3 de 4')).toBeVisible();
  await page.getByLabel('Nombre', { exact: true }).fill(listingName());
  await expect(page.getByLabel('Precio', { exact: true })).toHaveAttribute('inputmode', 'decimal');
  await page.getByLabel('Precio', { exact: true }).fill('250');
  await page.getByLabel('Qué incluye', { exact: true }).fill('Acceso libre a la sala de lunes a domingo.');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Step 4: a membership needs its duration; without it, nothing is sent.
  await expect(page.getByText('Paso 4 de 4')).toBeVisible();
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByText('Escribe cuántos días dura.')).toBeVisible();
  await page.getByLabel('Duración (días)', { exact: true }).fill('30');
  const created = waitForBff(page, 'POST', '/api/backend/business/me/listings');
  await page.getByRole('button', { name: 'Publicar' }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({
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
  const body = (await response.json()) as { data: { id: string; visibility: string; currency: string } };
  expect(body.data).toMatchObject({ visibility: 'PUBLIC', currency: 'BOB' });
  listingId = body.data.id;

  await expect(page).toHaveURL(new RegExp(`/negocio/publicaciones/${listingId}$`, 'u'), { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: listingName() })).toBeVisible();
  await expect(page.getByText('Publicada', { exact: true })).toBeVisible();
});

test('the listing is in the marketplace and on the @handle, and a person reports it', async ({ page }) => {
  test.skip(!listingId, 'needs the listing of the previous test');
  await signIn(page, person);

  // Marketplace: the search goes to the backend and the card names the seller with its badge.
  await openPage(page, `/marketplace?q=${encodeURIComponent(listingName())}`);
  const card = page.getByRole('link', { name: new RegExp(listingName(), 'u') });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toHaveAttribute('href', `/publicacion/${listingId}`);
  await expect(card).toContainText('Bs');
  await expect(card).toContainText('Verificado por REPP');

  // The public profile lists it among «Lo que ofrece».
  await openPage(page, `/@${business.handle}`);
  await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('list', { name: 'Publicaciones del negocio' }).getByText(listingName())).toBeVisible();

  // The listing: buying is not here yet (8d) and says so; «Reportar» sends it to REPP.
  await openPage(page, `/publicacion/${listingId}`);
  await expect(page.getByRole('heading', { level: 1, name: listingName() })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Comprar' })).toBeDisabled();
  await expect(page.getByText('Llega pronto', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Reportar publicación' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reportar' });
  await dialog.getByLabel('¿Qué ocurre?').selectOption('CONTENIDO_SEXUAL');
  await dialog.getByLabel('Cuéntanos más (opcional)').fill('Fotos que no tienen que ver con un gimnasio.');
  const reported = waitForBff(page, 'POST', '/api/backend/me/reports');
  await dialog.getByRole('button', { name: 'Enviar reporte' }).click();
  const report = await reported;
  expect(report.status()).toBe(201);
  expect(report.request().postDataJSON()).toMatchObject({ targetKind: 'BUSINESS_LISTING', targetId: listingId, reason: 'CONTENIDO_SEXUAL' });
  await expect(page.getByText('Gracias por avisar', { exact: false })).toBeVisible();
});

test('a REPP moderator hides it from the queue and it disappears from the marketplace', async ({ browser }) => {
  test.skip(!listingId, 'needs the report of the previous test');
  // First of its severity whatever other runs left in the queue (oldest first).
  await sql(`UPDATE moderation.reports SET created_at = now() - interval '3650 days' WHERE target_id = '${listingId}'`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, moderator);
  await openPage(page, '/moderacion');
  await expect(page.getByRole('heading', { level: 1, name: 'Moderación' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button').filter({ hasText: 'Publicación' }).filter({ hasText: business.name }).click();
  await expect(page.getByTestId('vista-previa')).toContainText(listingName());
  await expect(page.getByTestId('vista-previa')).toContainText(`@${business.handle}`);
  // A business is suspended, never put on the strike ladder.
  await expect(page.getByRole('button', { name: 'Retirar y sancionar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tomar el caso' }).click();
  await expect(page.getByText('Caso asignado a ti.')).toBeVisible();
  const resolved = waitForBff(page, 'POST', `/api/backend/admin/moderation/cases/BUSINESS_LISTING/${listingId}/resolve`);
  await page.getByRole('button', { name: 'Ocultar publicación' }).click();
  const verdict = await resolved;
  // The verdict is a POST that creates the resolution: 201, as for every other case kind.
  expect(verdict.status()).toBe(201);
  expect(verdict.request().postDataJSON()).toMatchObject({ hideContent: true, sanction: false });
  await expect(page.getByTestId('ultimo-veredicto')).toContainText('Contenido oculto');
  await context.close();

  // Public everywhere: the listing is a 404 and the profile no longer offers it.
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  expect((await visitor.goto(`/publicacion/${listingId}`))?.status()).toBe(404);
  await visitor.goto(`/@${business.handle}`);
  await expect(visitor.getByRole('heading', { level: 1, name: business.name })).toBeVisible({ timeout: 20_000 });
  await expect(visitor.getByText(listingName())).toHaveCount(0);
  await visitor.goto(`/directorio?q=${encodeURIComponent(listingName())}`);
  await expect(visitor.getByRole('heading', { name: 'Nada por aquí todavía' })).toBeVisible({ timeout: 20_000 });
  await anonymous.close();
});

test('the seller reads «Oculta por REPP» with its content frozen', async ({ page }) => {
  test.skip(!listingId, 'needs the hidden listing');
  await signIn(page, business);
  await openPage(page, `/negocio/publicaciones/${listingId}`);
  await expect(page.getByText('Oculta por REPP', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('REPP ocultó esta publicación: no puedes editarla mientras lo revisa.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cambiar precio' })).toBeDisabled();
  // Pausing stays open while REPP holds it.
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeEnabled();
});

test('in «Publicaciones» of /moderacion/negocios the moderator rejects the hidden listing', async ({ browser }) => {
  test.skip(!listingId, 'needs the hidden listing');
  // Oldest first: put this one at the head of «Ocultas».
  await sql(`UPDATE directory.entity_plans SET updated_at = now() - interval '3650 days' WHERE id = '${listingId}'`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, moderator);
  await openPage(page, '/moderacion/negocios');
  await expect(page.getByRole('heading', { level: 1, name: 'Negocios' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('tab', { name: 'Publicaciones' }).click();
  await page.getByRole('radio', { name: 'Ocultas' }).click();
  const item = page.getByRole('listitem').filter({ hasText: listingName() });
  await expect(item).toBeVisible({ timeout: 20_000 });
  await expect(item).toContainText('Acceso libre a la sala de lunes a domingo.');
  await item.getByLabel(`Motivo para rechazar: ${listingName()}`).selectOption('MISLEADING');
  const rejected = waitForBff(page, 'POST', `/api/backend/admin/business/listings/${listingId}/reject`);
  await item.getByRole('button', { name: 'Rechazar' }).click();
  const decision = await rejected;
  expect(decision.status()).toBe(200);
  expect(decision.request().postDataJSON()).toEqual({ reasonCode: 'MISLEADING' });
  await expect(page.getByRole('listitem').filter({ hasText: listingName() })).toHaveCount(0);
  await context.close();
});

test('the seller reads «Rechazada por REPP» with the reason', async ({ page }) => {
  test.skip(!listingId, 'needs the rejected listing');
  await signIn(page, business);
  await openPage(page, `/negocio/publicaciones/${listingId}`);
  await expect(page.getByText('Rechazada por REPP', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Información engañosa')).toBeVisible();
});
