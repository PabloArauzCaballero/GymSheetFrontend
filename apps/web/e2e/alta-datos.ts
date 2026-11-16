import type { Page } from '@playwright/test';

/**
 * Signup data for e2e specs: the one place that knows what `POST /auth/register`
 * requires (birth date 18–100, sex, the current terms version), for specs that
 * register through the API and for those that fill the signup form.
 *
 * `BACKEND_API_URL`/`E2E_BACKEND_URL`: the backend address (with `/api/v1`).
 */
export const BACKEND = process.env.E2E_BACKEND_URL ?? process.env.BACKEND_API_URL ?? 'http://localhost:3011/api/v1';

/** A fixed adult birth date, far from the 18/100 limits so no run is flaky around a birthday. */
export const ADULT_BIRTH_DATE = '1996-03-15';

let termsVersion: Promise<string> | undefined;

/** The current TERMS version from the public `GET /legal/current`, fetched once per worker. */
export function currentTermsVersion(): Promise<string> {
  termsVersion ??= (async () => {
    const response = await fetch(`${BACKEND}/legal/current`);
    if (!response.ok) throw new Error(`GET /legal/current answered ${response.status}.`);
    const json = (await response.json()) as { data?: { documents?: Array<{ document: string; version: string }> } };
    const version = json.data?.documents?.find((entry) => entry.document === 'TERMS')?.version;
    if (!version) throw new Error('GET /legal/current did not include the TERMS version.');
    return version;
  })();
  return termsVersion;
}

export type SignupFields = {
  email: string;
  password: string;
  nombreCompleto: string;
  genero?: 'MALE' | 'FEMALE';
  fechaNacimiento?: string;
};

/** The complete `POST /auth/register` body the backend accepts today. */
export async function signupBody(fields: SignupFields) {
  return {
    email: fields.email,
    password: fields.password,
    nombreCompleto: fields.nombreCompleto,
    fechaNacimiento: fields.fechaNacimiento ?? ADULT_BIRTH_DATE,
    genero: fields.genero ?? 'FEMALE',
    termsVersion: await currentTermsVersion(),
    acceptedTerms: true as const,
  };
}

/** Fills every field of the web signup form (`/register` must already be open); does not submit. */
export async function fillSignupForm(
  page: Page,
  fields: Omit<SignupFields, 'genero'> & { confirmation?: string; sexo?: 'Mujer' | 'Hombre' },
) {
  await page.getByLabel('Nombre completo').fill(fields.nombreCompleto);
  await page.getByLabel('Correo electrónico').fill(fields.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(fields.password);
  await page.getByLabel('Confirmar contraseña').fill(fields.confirmation ?? fields.password);
  await page.getByLabel('Fecha de nacimiento').fill(fields.fechaNacimiento ?? ADULT_BIRTH_DATE);
  await page.getByRole('radio', { name: fields.sexo ?? 'Mujer' }).check();
  await page.getByRole('checkbox').check();
}
