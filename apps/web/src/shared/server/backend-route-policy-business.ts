import { affiliationRoutePatterns, isAffiliationNoStorePath } from './backend-route-policy-affiliations';

// UUID: KYC submissions, documents and business accounts are addressed by UUID only.
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
// A public `@handle` (the backend normalizes it); `%40` is an encoded leading `@`.
const handle = '(?:[A-Za-z0-9._-]|%40){1,96}';

/** The public marketplace (no token on the backend): search, one listing and a profile by handle. */
const publicMarketplacePatterns: readonly RegExp[] = [
  /^\/public\/directory\/listings$/u,
  new RegExp(`^/public/directory/listings/${uuid}$`, 'u'),
  new RegExp(`^/public/directory/profiles/${handle}$`, 'u'),
];

/**
 * Public reads a visitor without a session may make through the BFF (GET
 * only, no token forwarded): the marketplace pages are public, and without
 * this «Ver más» on `/@handle` or `/directorio` would answer 401 to them.
 */
export function isAnonymousBackendPath(path: string): boolean {
  return publicMarketplacePatterns.some((pattern) => pattern.test(path));
}

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
  // Listings, locations and gallery of the business (ADR-0022, franja 8c).
  /^\/business\/me\/(listings|locations|gallery)$/u,
  new RegExp(`^/business/me/listings/${uuid}(/(price|stock|pause|resume|archive|media))?$`, 'u'),
  new RegExp(`^/business/me/listings/${uuid}/media/\\d{1,2}$`, 'u'),
  new RegExp(`^/business/me/locations/${uuid}$`, 'u'),
  /^\/business\/me\/gallery\/\d{1,2}$/u,
  // REPP's «Publicaciones» queue: held, hidden and rejected listings.
  /^\/admin\/business\/listings$/u,
  new RegExp(`^/admin/business/listings/${uuid}/(release|reject)$`, 'u'),
  // Orders (ADR-0024, franja 8d). The person's side (a business account gets 403 from the backend):
  // create, «Mis compras», one order, its payment data and private QR, the multipart receipt, cancel.
  /^\/directory\/payments\/orders(\/my-orders)?$/u,
  new RegExp(`^/directory/payments/orders/${uuid}(/(payment-instructions|payment-qr|receipt|cancel))?$`, 'u'),
  // The business's side (NEGOCIO only; persons and REPP get 403): inbox, receipt, decisions, payment config and QR.
  /^\/business\/me\/orders$/u,
  new RegExp(`^/business/me/orders/${uuid}(/(receipt|confirm|reject))?$`, 'u'),
  /^\/business\/me\/payment-config(\/qr)?$/u,
  // REPP sees a receipt only inside a PAYMENT_ORDER case (MODERATOR, SYSTEM_ADMIN; audited by the backend).
  new RegExp(`^/admin/moderation/cases/PAYMENT_ORDER/${uuid}/receipt$`, 'u'),
  ...publicMarketplacePatterns,
  // Affiliations and «Mi gimnasio» (franjas 7b–7c).
  ...affiliationRoutePatterns,
];

/** Multipart uploads of the orders: a receipt photo or the business's QR (same allowance as the other media). */
export function isOrderUploadPath(path: string): boolean {
  return /^\/directory\/payments\/orders\/[^/]+\/receipt$/u.test(path) || path === '/business/me/payment-config/qr';
}

/** Responses that carry identity or payment data in clear or decrypted photos: never stored by any cache. */
export function isNoStoreBackendPath(path: string): boolean {
  return (
    /^\/admin\/business\/kyc\/[^/]+(\/documents\/[^/]+)?$/u.test(path) ||
    path.startsWith('/business/me/kyc') ||
    // Bank data, QR images and receipts of the orders (ADR-0024): financial data of a person or a business.
    path.startsWith('/directory/payments/orders') ||
    path.startsWith('/business/me/orders') ||
    path.startsWith('/business/me/payment-config') ||
    /^\/admin\/moderation\/cases\/PAYMENT_ORDER\/[^/]+\/receipt$/u.test(path) ||
    isAffiliationNoStorePath(path)
  );
}

