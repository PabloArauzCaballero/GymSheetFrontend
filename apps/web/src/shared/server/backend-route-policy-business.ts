// UUID: KYC submissions, documents and business accounts are addressed by UUID only.
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
// A public `@handle` (the backend normalizes it); `%40` is an encoded leading `@`.
const handle = '(?:[A-Za-z0-9._-]|%40){1,96}';

/** BFF routes of the business marketplace (ADR-0020 accounts, ADR-0021 KYC and REPP's console). */
export const businessRoutePatterns: readonly RegExp[] = [
  // Business accounts (ADR-0020): own account, profile, handle, logo/cover; public handles.
  /^\/business\/me(\/(profile|handle|media))?$/u,
  /^\/business\/me\/media\/(LOGO|COVER)$/u,
  new RegExp(`^/public/handles/${handle}(/availability)?$`, 'u'),
  // Business KYC (ADR-0021, franja 8b): phone OTP, the attempt and its documents.
  /^\/business\/me\/phone\/verify\/(request|confirm)$/u,
  /^\/business\/me\/kyc(\/(draft|consent|selfie-challenge|documents|submit|resubmit|changes))?$/u,
  new RegExp(`^/business/me/kyc/documents/${uuid}$`, 'u'),
  // REPP's KYC console (MODERATOR + SYSTEM_ADMIN; the backend authorizes): queues, detail, the
  // decrypted document stream (never cached, see the BFF), claim/release/decide and the accounts.
  /^\/admin\/business\/kyc\/queue$/u,
  new RegExp(`^/admin/business/kyc/${uuid}(/(claim|release|decide))?$`, 'u'),
  new RegExp(`^/admin/business/kyc/${uuid}/documents/${uuid}$`, 'u'),
  /^\/admin\/business\/accounts$/u,
  new RegExp(`^/admin/business/accounts/${uuid}/(suspend|reinstate)$`, 'u'),
];

/** Responses that carry identity data in clear or its decrypted photos: never stored by any cache. */
export function isNoStoreBackendPath(path: string): boolean {
  return /^\/admin\/business\/kyc\/[^/]+(\/documents\/[^/]+)?$/u.test(path) || path.startsWith('/business/me/kyc');
}

