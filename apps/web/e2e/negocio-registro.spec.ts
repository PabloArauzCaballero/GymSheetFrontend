import { expect, test, type Page } from '@playwright/test';
import { sql } from './rutinas-datos';

/**
 * Business signup, franja 8a (ADR-0020), against the real backend:
 * «¿Qué eres?» → «Tu cuenta» → «Verifica tu correo» → «Tu negocio» → the
 * business portal shows the draft banner, survives a reload, and the person
 * portal is closed to the account. The PIN only travels by email, so the
 * mailbox is marked verified in the database (`sql()`), like the other specs.
 *
 * Needs: backend with `BUSINESS_SIGNUP_ENABLED=true` (otherwise the signup
 * answers 404 BUSINESS_SIGNUP_DISABLED), PostgreSQL reachable by `psql`
 * (`E2E_PG*`), and directory categories seeded for the GYM scope.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(150_000);

const run = Date.now().toString(36);
const account = {
  name: `Top Fitness ${run}`,
  email: `negocio.${run}@gymsheet.local`,
  password: 'NegocioLocal2026!',
};

function waitForBff(page: Page, method: string, pathEnd: string) {
  return page.waitForResponse(
    (response) => response.request().method() === method && new URL(response.url()).pathname.endsWith(pathEnd),
  );
}

test('a business signs up, verifies its email, reserves its @handle and lands on a draft portal', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Regístralo' }).click();
  await expect(page).toHaveURL(/\/negocio\/registro$/u);

  // Step 0: one tap on a big card.
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
  await page.getByRole('radio', { name: /Gimnasio/u }).check();
  await page.getByRole('button', { name: 'Seguir' }).click();

  // Step 1: four fields, the legal box links the versioned business texts.
  await expect(page.getByText('Paso 2 de 4')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Términos para negocios' })).toHaveAttribute('href', '/negocio/terminos');
  await expect(page.getByRole('link', { name: 'Acuerdo de tratamiento de datos' })).toHaveAttribute('href', '/negocio/datos');
  await page.getByLabel('Nombre de tu negocio').fill(account.name);
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await page.getByRole('checkbox').check();
  const signedUp = waitForBff(page, 'POST', '/api/business/signup');
  await page.getByRole('button', { name: 'Crear cuenta de negocio' }).click();
  const signup = await signedUp;
  expect(signup.status()).toBe(201);
  const sent = signup.request().postDataJSON() as { acceptances: Array<{ document: string }>; ticket?: string };
  expect(sent.acceptances.map((entry) => entry.document).sort()).toEqual(['BUSINESS_DPA', 'BUSINESS_TERMS', 'PRIVACY']);
  expect(typeof sent.ticket).toBe('string');
  // The token stays in the HttpOnly cookie: the browser never sees it.
  expect(JSON.stringify(await signup.json())).not.toMatch(/accessToken/u);

  // Step 2: the PIN screen. The mailbox is proven in the database, then a reload resumes at step 3.
  await expect(page.getByText('Paso 3 de 4')).toBeVisible();
  await expect(page.getByLabel('Código de verificación')).toHaveAttribute('autocomplete', 'one-time-code');
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${account.email}'`);
  await page.reload();

  // Step 3: the handle comes suggested from the name and is checked live.
  await expect(page.getByText('Paso 4 de 4')).toBeVisible({ timeout: 20_000 });
  const handleInput = page.getByLabel('Tu @usuario');
  const handle = await handleInput.inputValue();
  expect(handle).toMatch(/^topfitness[a-z0-9]+$/u);
  await expect(page.getByText(`@${handle} está libre.`)).toBeVisible({ timeout: 15_000 });
  const category = page.getByLabel('Categoría');
  await expect(category.locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
  await category.selectOption({ index: 1 });
  await page.getByLabel('Ciudad').fill('Santa Cruz');
  const claimed = waitForBff(page, 'PUT', '/api/backend/business/me/handle');
  const saved = waitForBff(page, 'PATCH', '/api/backend/business/me/profile');
  await page.getByRole('button', { name: 'Guardar y entrar' }).click();
  expect((await claimed).status()).toBe(200);
  expect((await saved).status()).toBe(200);

  // The portal: draft banner and the KYC step still to come, after a reload too.
  await expect(page).toHaveURL(/\/negocio$/u, { timeout: 20_000 });
  const banner = page.getByRole('status', { name: 'Estado de tu negocio' });
  await expect(banner).toHaveText('Tu negocio está en borrador · completa la verificación (próximamente)');
  await expect(page.getByText(`@${handle} · reservado hasta que verifiquemos tu negocio`)).toBeVisible();
  await page.reload();
  await expect(banner).toBeVisible();
  await expect(page.getByText('Verifica tu negocio')).toBeVisible();

  // A business never sees the person portal.
  await page.goto('/comunidad');
  await expect(page).toHaveURL(/\/negocio$/u);

  // A PENDING handle is not public: /@handle is a 404 until the KYC approves the listing.
  const publicProfile = await page.goto(`/@${handle}`);
  expect(publicProfile?.status()).toBe(404);
});
