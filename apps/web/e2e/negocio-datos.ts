import { BACKEND, registerTicket } from './alta-datos';
import { apiDe, sql, type Api } from './rutinas-datos';

/**
 * An approved business for the marketplace specs (franja 8c), built through the
 * API in seconds instead of the eight steps of the KYC (negocio-kyc.spec covers
 * those): signup → email verified by SQL → handle and profile through the API →
 * the KYC approval's effects applied by SQL (account ACTIVE + APPROVED, listing
 * ACTIVE and verified, handle ACTIVE), exactly what `kyc-effects.repository.ts`
 * writes on a human approval. Needs `BUSINESS_SIGNUP_ENABLED=true` and `psql`.
 */
export type Negocio = { email: string; password: string; name: string; handle: string; entityId: string; api: Api };

type LegalDocument = { document: string; version: string; contentSha256?: string | null };

async function businessAcceptances(): Promise<Array<{ document: string; version: string; contentSha256?: string }>> {
  const response = await fetch(`${BACKEND}/legal/current?accountKind=BUSINESS`);
  if (!response.ok) throw new Error(`GET /legal/current?accountKind=BUSINESS answered ${response.status}.`);
  const json = (await response.json()) as { data?: { documents?: LegalDocument[] } };
  return (json.data?.documents ?? []).map(({ document, version, contentSha256 }) => ({ document, version, ...(contentSha256 ? { contentSha256 } : {}) }));
}

async function post<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
  const response = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-platform': 'web' },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as { data?: T } | null;
  return { status: response.status, data: (json?.data ?? json) as T };
}

export async function crearNegocioAprobado(etiqueta: string): Promise<Negocio> {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const name = `Pub ${etiqueta} ${run}`;
  const email = `negocio.pub.${etiqueta}.${run}@gymsheet.local`.toLowerCase();
  const password = 'NegocioLocal2026!';
  const signup = await post<{ accessToken: string; business: { entityId: string } }>('/business/signup', {
    email,
    password,
    businessName: name,
    entityType: 'GYM',
    acceptances: await businessAcceptances(),
    ticket: await registerTicket(),
  });
  if (signup.status !== 201) throw new Error(`POST /business/signup answered ${signup.status}.`);
  const entityId = signup.data.business.entityId;
  await sql(`UPDATE public.usuarios SET email_verified_at = now() WHERE email = '${email}'`);
  const api = apiDe({ token: signup.data.accessToken });

  const handle = `pub${run}`.slice(0, 28);
  const claimed = await api('PUT', '/business/me/handle', { handle });
  if (claimed.status !== 200) throw new Error(`PUT /business/me/handle answered ${claimed.status} ${claimed.code ?? ''}.`);
  const categories = await api<Array<{ id: string }>>('GET', '/public/directory/categories?scope=GYM');
  // An ACTIVE listing needs a category (ck_directory_entity_primary_category): seed the GYM scope first.
  const category = categories.data[0]?.id;
  if (!category) throw new Error('No directory category for the GYM scope: seed the categories first.');
  const profile = await api('PATCH', '/business/me/profile', { city: 'Santa Cruz', primaryCategoryId: category });
  if (profile.status !== 200) throw new Error(`PATCH /business/me/profile answered ${profile.status} ${profile.code ?? ''}.`);

  // The effects of a human KYC approval (ADR-0021), applied directly: see the header.
  await sql(
    `UPDATE business.accounts SET status = 'ACTIVE', kyc_status = 'APPROVED', first_approved_at = now(), verified_at = now(), updated_at = now() WHERE entity_id = '${entityId}'`,
  );
  await sql(`UPDATE directory.entities SET status = 'ACTIVE', is_verified = true, updated_at = now() WHERE id = '${entityId}'`);
  await sql(`UPDATE directory.handles SET status = 'ACTIVE', updated_at = now() WHERE owner_entity_id = '${entityId}'`);
  return { email, password, name, handle, entityId, api };
}
