import { expect, test } from '@playwright/test';
import { dismissTour, signIn } from '../fixtures';
import { BACKEND, signupBody } from '../alta-datos';
import { PASSWORD, apiDe } from '../rutinas-datos';

/**
 * The optional "Conocer" step end to end against the real backend: a fresh
 * member finishes the four onboarding questions, lands on /onboarding/conocer,
 * answers a)–e), skips photos, sees the readiness checklist with PHOTOS in
 * Comunidad, and after a reload the answers are still there.
 *
 * Needs the backend (`E2E_BACKEND_URL`) and PostgreSQL running.
 */
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(response.status, `POST ${path}`).toBeLessThan(300);
  const json = (await response.json()) as { data?: T };
  return (json.data ?? json) as T;
}

/** Registers a member and answers onboarding steps 1–3 through the API, leaving step 4 for the UI. */
async function newMemberAtLastStep() {
  const email = `qa.conocer.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@gymsheet.local`;
  await post('/auth/register', await signupBody({ email, password: PASSWORD, nombreCompleto: 'Conocer QA' }));
  const login = await post<{ accessToken: string }>('/auth/login', { email, password: PASSWORD });
  const api = apiDe({ token: login.accessToken });
  await api('PUT', '/me/onboarding/goals', { primaryGoal: 'GAIN_MUSCLE' });
  await api('PUT', '/me/onboarding/profile', {
    weight: 70,
    weightUnit: 'KG',
    height: 175,
    heightUnit: 'CM',
    measuredOn: '2026-11-01',
  });
  await api('PUT', '/me/onboarding/preferences', {
    experienceLevel: 'INTERMEDIATE',
    weeklyFrequency: 4,
    trainingLocation: 'GYM',
    trainingPreferences: [],
    consentHealth: true,
    consentData: true,
  });
  return { email, api };
}

test('a new member answers Conocer, skips photos and keeps the answers after a reload', async ({ page }) => {
  const { email, api } = await newMemberAtLastStep();
  await signIn(page, { email, password: PASSWORD });
  await expect(page).toHaveURL(/\/onboarding$/u, { timeout: 40_000 });
  await dismissTour(page);

  // Step 4 of the existing onboarding, then the redirect into Conocer.
  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page).toHaveURL(/\/onboarding\/conocer$/u, { timeout: 40_000 });

  // a) What you look for, who you want to see, ages and distance.
  await expect(page.getByRole('heading', { name: '¿Qué buscas?' })).toBeVisible();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: 'Amistad' }).click();
  await page.getByRole('button', { name: 'Aún no lo sé' }).click();
  await expect(page.getByRole('button', { name: 'Amistad' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByLabel('Edad mín.').fill('21');
  await page.getByLabel('Edad máx.').fill('45');
  await page.getByLabel('Radio (km)').fill('30');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // b) Interests: the first two catalog chips.
  await expect(page.getByRole('heading', { name: 'Elige tus intereses' })).toBeVisible();
  const interests = page.getByRole('group', { name: /Elige hasta 5/u }).getByRole('button');
  const picked = [await interests.nth(0).innerText(), await interests.nth(1).innerText()];
  await interests.nth(0).click();
  await interests.nth(1).click();
  await expect(page.getByText('2/5')).toBeVisible();
  await page.getByRole('button', { name: /Continuar/u }).click();

  // c) Habits.
  await expect(page.getByRole('heading', { name: 'Cuéntanos tus hábitos' })).toBeVisible();
  await page.getByRole('button', { name: 'En ocasiones sociales' }).click();
  await page.getByRole('button', { name: 'No fumo' }).click();
  await page.getByRole('button', { name: 'Perro' }).click();
  await page.getByRole('button', { name: /Continuar/u }).click();

  // d) Orientation, hidden by default.
  await expect(page.getByRole('heading', { name: 'Tu orientación' })).toBeVisible();
  await page.getByRole('button', { name: 'Bisexual' }).click();
  await expect(page.getByRole('switch', { name: 'Mostrar en mi perfil' })).not.toBeChecked();
  await page.getByRole('button', { name: /Continuar/u }).click();

  // e) Bio.
  await expect(page.getByRole('heading', { name: 'Escribe tu bio' })).toBeVisible();
  const bio = 'Entreno temprano y busco gente con quien correr.';
  await page.getByLabel('Tu bio').fill(bio);
  await expect(page.getByText(`${bio.length}/500`)).toBeVisible();
  await page.getByRole('button', { name: /Continuar/u }).click();

  // f) Photos: none uploaded, so skip.
  await expect(page.getByRole('heading', { name: 'Sube tus fotos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terminar' })).toBeDisabled();
  await page.getByRole('button', { name: 'Saltar por ahora' }).click();
  await expect(page).toHaveURL(/\/comunidad$/u, { timeout: 40_000 });
  await dismissTour(page);

  const checklist = page.getByRole('region', { name: 'Para aparecer en Conocer' });
  await expect(checklist).toBeVisible();
  await expect(checklist.getByRole('link', { name: 'Subir fotos' })).toBeVisible();

  // Persistence: server state first, then the UI after a reload.
  const saved = await api<{ interests: string[]; bio: string; orientationVisible: boolean; pets: string }>(
    'GET',
    '/me/social-profile',
  );
  expect(saved.data).toMatchObject({ bio, orientationVisible: false, pets: 'DOG' });
  expect(saved.data.interests).toHaveLength(2);
  const onboarding = await api<{ socialStep: string }>('GET', '/me/onboarding');
  expect(onboarding.data.socialStep).toBe('SKIPPED');

  await page.goto('/profile#conocer');
  await page.reload();
  await dismissTour(page);
  const section = page.locator('#conocer');
  await expect(section.getByLabel('Tu bio')).toHaveValue(bio);
  await expect(section.getByRole('button', { name: 'En ocasiones sociales' })).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByRole('button', { name: 'Bisexual' })).toHaveAttribute('aria-pressed', 'true');
  for (const name of picked) {
    await expect(section.getByRole('button', { name: name.trim() })).toHaveAttribute('aria-pressed', 'true');
  }
});
