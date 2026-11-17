import { expect, test, type Page } from '@playwright/test';
import { openPage, signIn } from './fixtures';
import { crearNegocioAprobado, type Negocio } from './negocio-datos';
import { crearCuenta, sql, type Cuenta } from './rutinas-datos';

/**
 * Affiliations (franja 7b, ADR-0025) and «Mi gimnasio» (franja 7c, ADR-0027)
 * against the real backend: an approved gym with one sede → a person opens its
 * `/@handle`, «Hacerme socio» (sede + 3 CI digits) → «Mi gimnasio» says
 * «Solicitud enviada» → the gym opens «Socios», reads «CI termina en …» and
 * confirms → the person sees the gym, the ranking (200, no gate) and «Socio de
 * X» on the profile → the gym ends it → «Mi gimnasio» is NONE again and the
 * ranking is the 403 gate. Then a coach business asks the gym by @handle and
 * the gym accepts it.
 *
 * Status codes checked against the controllers: POST /me/affiliations and POST
 * /business/me/gym-links are @HttpCode(201); confirm, reject and end are
 * @HttpCode(200); POST /business/me/locations is 201; the ranking without a
 * confirmed SOCIO is 403 GYM_MEMBERSHIP_REQUIRED.
 *
 * Needs: backend with franjas 7b + 7c (migrations `202611200901-affiliations*`
 * and the 7c visibility column), `BUSINESS_SIGNUP_ENABLED=true`, directory
 * categories seeded for the GYM and COACH scopes, `psql` (`E2E_PG*`) and
 * `E2E_BACKEND_URL`.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

let gym: Negocio;
let coach: Negocio;
let person: Cuenta;
let sedeId = '';
const SEDE = 'Sede Centro';
const CI = '123';

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd));
}

test.beforeAll(async ({}, testInfo) => {
  const label = testInfo.project.name.replace(/[^a-z0-9]/giu, '').slice(0, 8);
  gym = await crearNegocioAprobado(`afi${label}`);
  // The sedes panel is covered by negocio-publicaciones.spec: here the sede is created through the API.
  const sede = await gym.api<{ id: string }>('POST', '/business/me/locations', { name: SEDE, city: 'Santa Cruz' });
  if (sede.status !== 201) throw new Error(`POST /business/me/locations answered ${sede.status} ${sede.code ?? ''}.`);
  sedeId = sede.data.id;
  person = await crearCuenta(`afi-${label}`, 'Persona Afiliaciones QA');
  // Asking for an affiliation needs a verified email (403 EMAIL_VERIFICATION_REQUIRED otherwise).
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${person.email}'`);
  coach = await crearNegocioAprobado(`afc${label}`, 'COACH');
});

test('a person asks to be a SOCIO from the gym’s @handle', async ({ page }) => {
  await signIn(page, person);
  await openPage(page, `/@${gym.handle}`);
  await expect(page.getByRole('heading', { level: 1, name: gym.name })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Hacerme socio' }).click();

  const dialog = page.getByRole('dialog', { name: 'Hazte socio' });
  await expect(dialog).toBeVisible();
  // Kind and sede are visually hidden radios inside their cards: tap the card, as a person does.
  const socio = dialog.getByRole('radio', { name: /Socio/u });
  await dialog.locator('label').filter({ has: socio }).click();
  const sede = dialog.getByRole('radio', { name: new RegExp(SEDE, 'u') });
  await dialog.locator('label').filter({ has: sede }).click();
  await expect(sede).toBeChecked();
  await dialog.getByLabel('Últimos 3 dígitos de tu CI', { exact: true }).fill(CI);

  const sent = waitForBff(page, 'POST', '/api/backend/me/affiliations');
  await dialog.getByRole('button', { name: 'Enviar solicitud' }).click();
  const response = await sent;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({ gymHandle: gym.handle, kind: 'SOCIO', locationId: sedeId, ciLast3: CI });
  await expect(page.getByTestId('affiliation-SOCIO')).toContainText('Solicitud enviada');

  await openPage(page, '/mi-gimnasio');
  const card = page.getByTestId('my-gym-card');
  await expect(card).toHaveAttribute('data-state', 'REQUESTED', { timeout: 20_000 });
  await expect(card.getByRole('heading', { name: `Solicitud enviada a ${gym.name}` })).toBeVisible();
});

test('the gym reads «CI termina en …» in «Solicitudes» and confirms', async ({ page }) => {
  await signIn(page, gym);
  await openPage(page, '/negocio/socios');
  await expect(page.getByRole('heading', { level: 1, name: 'Socios' })).toBeVisible({ timeout: 20_000 });
  const row = page.getByTestId('affiliation-row').filter({ hasText: person.nombre });
  await expect(row).toBeVisible();
  await expect(row).toContainText(`CI termina en ${CI}`);
  await expect(row).toContainText(SEDE);

  await row.getByRole('button', { name: 'Confirmar' }).click();
  const confirmDialog = page.getByRole('dialog', { name: `¿Confirmas a ${person.nombre}?` });
  const confirmed = waitForBff(page, 'POST', '/confirm');
  await confirmDialog.getByRole('button', { name: 'Confirmar' }).click();
  expect((await confirmed).status()).toBe(200);
  await expect(row).toHaveCount(0);

  await page.getByRole('tab', { name: 'Socios' }).click();
  await expect(page.getByTestId('affiliation-row').filter({ hasText: person.nombre })).toBeVisible();
});

test('the person sees «Mi gimnasio», the ranking and «Socio de X» on the profile', async ({ page }) => {
  await signIn(page, person);
  const ranking = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/api/backend/me/progression/leaderboard'));
  await openPage(page, '/mi-gimnasio');
  const card = page.getByTestId('my-gym-card');
  await expect(card).toHaveAttribute('data-state', 'CONFIRMED', { timeout: 20_000 });
  await expect(card.getByRole('heading', { name: gym.name })).toBeVisible();
  await expect(card).toContainText(SEDE);
  expect((await ranking).status()).toBe(200);
  await expect(page.getByText('Clasificación del gimnasio')).toBeVisible();
  await expect(page.getByTestId('gym-gate')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: `Mostrar que soy socio de ${gym.name}` })).toBeChecked();

  await openPage(page, '/profile');
  await expect(page.getByTestId('gym-badge')).toHaveText(`Socio de ${gym.name}`, { timeout: 20_000 });
});

test('the gym ends the membership with a reason chip', async ({ page }) => {
  await signIn(page, gym);
  await openPage(page, '/negocio/socios');
  await page.getByRole('tab', { name: 'Socios' }).click();
  const row = page.getByTestId('affiliation-row').filter({ hasText: person.nombre });
  await row.getByRole('button', { name: 'Terminar' }).click();
  await row.getByRole('button', { name: 'Ya no es socio' }).click();
  const ended = waitForBff(page, 'POST', '/end');
  await row.getByRole('button', { name: 'Terminar afiliación' }).click();
  const response = await ended;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({ reasonCode: 'NO_LONGER_MEMBER' });
  await expect(row).toHaveCount(0);
});

test('the person is back to NONE and the ranking is the 403 gate', async ({ page }) => {
  await signIn(page, person);
  await openPage(page, '/mi-gimnasio');
  await expect(page.getByTestId('my-gym-card')).toHaveAttribute('data-state', 'NONE', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Todavía no eres socio de un gimnasio' })).toBeVisible();

  // The ranking without a confirmed SOCIO is a state with its next step, never an error toast.
  const ranking = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/api/backend/me/progression/leaderboard'));
  await openPage(page, '/trayectoria');
  expect((await ranking).status()).toBe(403);
  await expect(page.getByTestId('gym-gate')).toContainText('Únete a tu gimnasio');
});

test('a coach business asks the gym by @handle', async ({ page }) => {
  await signIn(page, coach);
  await openPage(page, '/negocio/gimnasios');
  await expect(page.getByRole('heading', { level: 1, name: 'Mis gimnasios' })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('@usuario del gimnasio', { exact: true }).fill(`@${gym.handle}`);
  const sent = waitForBff(page, 'POST', '/api/backend/business/me/gym-links');
  await page.getByRole('button', { name: 'Pedir vínculo' }).click();
  const response = await sent;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({ gymHandle: gym.handle });
  await expect(page.getByRole('listitem').filter({ hasText: gym.name })).toContainText('Solicitud enviada');
});

test('the gym accepts the coach and lists it in «Entrenadores»', async ({ page }) => {
  await signIn(page, gym);
  await openPage(page, '/negocio/socios');
  const row = page.getByTestId('affiliation-row').filter({ hasText: coach.name });
  await expect(row).toContainText(`@${coach.handle}`, { timeout: 20_000 });
  await row.getByRole('button', { name: 'Confirmar' }).click();
  const confirmed = waitForBff(page, 'POST', '/confirm');
  await page.getByRole('dialog', { name: `¿Confirmas a ${coach.name}?` }).getByRole('button', { name: 'Confirmar' }).click();
  expect((await confirmed).status()).toBe(200);
  await page.getByRole('tab', { name: 'Entrenadores' }).click();
  await expect(page.getByTestId('affiliation-row').filter({ hasText: coach.name })).toBeVisible();
});

test('the coach reads the confirmed link in «Mis gimnasios»', async ({ page }) => {
  await signIn(page, coach);
  await openPage(page, '/negocio/gimnasios');
  await expect(page.getByRole('listitem').filter({ hasText: gym.name })).toContainText('Entrenador', { timeout: 20_000 });
});
