import { describe, expect, it } from 'vitest';
import { isAnonymousBackendPath, isNoStoreBackendPath, resolveAllowedBackendPath } from './backend-route-policy';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const allowedCases: Array<[string[], string]> = [
  [['exercises'], '/exercises'],
  [['workouts', id, 'finish'], `/workouts/${id}/finish`],
  [
    ['admin', 'facilities', 'maintenance', id, 'complete'],
    `/admin/facilities/maintenance/${id}/complete`,
  ],
  [['notifications', 'preferences', 'me'], '/notifications/preferences/me'],
  [['admin', 'media'], '/admin/media'],
  [['admin', 'membership', 'staff-users'], '/admin/membership/staff-users'],
  [['admin', 'membership', 'staff'], '/admin/membership/staff'],
  [['me', 'progression'], '/me/progression'],
  [['programs', 'active'], '/programs/active'],
  // Auditoría 2026-11-09: rutas que la web llamaba y el BFF rechazaba.
  [['admin', 'routines'], '/admin/routines'],
  [['admin', 'support', 'users', id, 'training'], `/admin/support/users/${id}/training`],
  [['cardio-plans', id], `/cardio-plans/${id}`],
  [['programs', 'cardio', 'activate'], '/programs/cardio/activate'],
  [['comments', 'ROUTINE', id], `/comments/ROUTINE/${id}`],
  [['ratings', 'EXERCISE', id], `/ratings/EXERCISE/${id}`],
  [['directory', 'payments', 'orders', 'my-orders'], '/directory/payments/orders/my-orders'],
  [['public', 'directory', 'entities', id, 'plans'], `/public/directory/entities/${id}/plans`],
  [['muscles', 'BICEPS_BRACHII', 'exercises'], '/muscles/BICEPS_BRACHII/exercises'],
  [['me', 'blocks', id], `/me/blocks/${id}`],
  // Franja 4: consents and account rights.
  [['me', 'consents'], '/me/consents'],
  // Franja 8a: business accounts and public handles.
  [['business', 'me'], '/business/me'],
  [['business', 'me', 'profile'], '/business/me/profile'],
  [['business', 'me', 'handle'], '/business/me/handle'],
  [['business', 'me', 'media', 'COVER'], '/business/me/media/COVER'],
  [['public', 'handles', 'top.fitness_bo'], '/public/handles/top.fitness_bo'],
  [['public', 'handles', '@Top.Fit', 'availability'], '/public/handles/%40Top.Fit/availability'],
  [['admin', 'users', id, 'close'], `/admin/users/${id}/close`],
  // Franja 8b: the business KYC and REPP's console.
  [['business', 'me', 'phone', 'verify', 'request'], '/business/me/phone/verify/request'],
  [['business', 'me', 'kyc'], '/business/me/kyc'],
  [['business', 'me', 'kyc', 'selfie-challenge'], '/business/me/kyc/selfie-challenge'],
  [['business', 'me', 'kyc', 'documents', id], `/business/me/kyc/documents/${id}`],
  [['admin', 'business', 'kyc', 'queue'], '/admin/business/kyc/queue'],
  [['admin', 'business', 'kyc', id, 'decide'], `/admin/business/kyc/${id}/decide`],
  [['admin', 'business', 'kyc', id, 'documents', id], `/admin/business/kyc/${id}/documents/${id}`],
  [['admin', 'business', 'accounts', id, 'reinstate'], `/admin/business/accounts/${id}/reinstate`],
  // Franja 8c: listings, locations, gallery, the public marketplace and REPP's queue.
  [['business', 'me', 'listings'], '/business/me/listings'],
  [['business', 'me', 'listings', id, 'price'], `/business/me/listings/${id}/price`],
  [['business', 'me', 'listings', id, 'media'], `/business/me/listings/${id}/media`],
  [['business', 'me', 'listings', id, 'media', '3'], `/business/me/listings/${id}/media/3`],
  [['business', 'me', 'locations', id], `/business/me/locations/${id}`],
  [['business', 'me', 'gallery', '0'], '/business/me/gallery/0'],
  [['public', 'directory', 'listings'], '/public/directory/listings'],
  [['public', 'directory', 'listings', id], `/public/directory/listings/${id}`],
  [['public', 'directory', 'profiles', '@topfit'], '/public/directory/profiles/%40topfit'],
  // Franja 8f: a person opens a chat with a business; the business blocks a person.
  [['me', 'business-conversations'], '/me/business-conversations'],
  [['business', 'me', 'conversations', id, 'block'], `/business/me/conversations/${id}/block`],
  [['admin', 'business', 'listings'], '/admin/business/listings'],
  [['admin', 'business', 'listings', id, 'reject'], `/admin/business/listings/${id}/reject`],
  [['admin', 'moderation', 'cases', 'BUSINESS_LISTING', id], `/admin/moderation/cases/BUSINESS_LISTING/${id}`],
  [['me', 'consents', 'ORIENTATION'], '/me/consents/ORIENTATION'],
  [['me', 'account'], '/me/account'],
  [['me', 'account', 'closure-preview'], '/me/account/closure-preview'],
  [['me', 'account', 'closure-pin'], '/me/account/closure-pin'],
  [['me', 'email', 'change', 'confirm'], '/me/email/change/confirm'],
  [['me', 'export'], '/me/export'],
  [['me', 'export', 'latest'], '/me/export/latest'],
  [['me', 'export', id, 'download'], `/me/export/${id}/download`],
  [['me', 'social-map', 'cells', id, 'people'], `/me/social-map/cells/${id}/people`],
  [['me', 'chat', 'read-receipts'], '/me/chat/read-receipts'],
  [['me', 'reels', id, 'comments', id], `/me/reels/${id}/comments/${id}`],
  [['me', 'progression', 'strikes', 'buy'], '/me/progression/strikes/buy'],
  [['routines', id, 'weeks', id], `/routines/${id}/weeks/${id}`],
  [['routine-shares', id, 'accept'], `/routine-shares/${id}/accept`],
  [['workouts', id, 'apply-to-routine'], `/workouts/${id}/apply-to-routine`],
  [['programs', id, 'progress'], `/programs/${id}/progress`],
  [['notifications', 'me', 'unread-count'], '/notifications/me/unread-count'],
  [['me', 'progression', 'leaderboard'], '/me/progression/leaderboard'],
  [['me', 'progression', 'acknowledge'], '/me/progression/acknowledge'],
  [['me', 'progression', 'rules'], '/me/progression/rules'],
  [['exercises', 'equipment-suggestion'], '/exercises/equipment-suggestion'],
  [['muscles'], '/muscles'],
  [['auth', 'socket-ticket'], '/auth/socket-ticket'],
  [['me', 'connections'], '/me/connections'],
  [['me', 'connections', id], `/me/connections/${id}`],
  [['me', 'social-status'], '/me/social-status'],
  [['me', 'gym-directory'], '/me/gym-directory'],
  [['me', 'conversations'], '/me/conversations'],
  [['me', 'conversations', id, 'messages'], `/me/conversations/${id}/messages`],
  [
    ['me', 'conversations', id, 'messages', id, 'media'],
    `/me/conversations/${id}/messages/${id}/media`,
  ],
  [['public', 'facilities', 'branches'], '/public/facilities/branches'],
  // R6: descubrimiento, stories, vistas de perfil e interacciones.
  [['me', 'gym-directory', id], `/me/gym-directory/${id}`],
  // Las sedes del gimnasio propio: es la que alimenta el filtro por sucursal.
  [['me', 'facilities', 'branches'], '/me/facilities/branches'],
  [['me', 'discovery', 'deck'], '/me/discovery/deck'],
  [['me', 'discovery', 'preferences'], '/me/discovery/preferences'],
  [['me', 'discovery', 'swipes'], '/me/discovery/swipes'],
  [['me', 'discovery', 'impressions'], '/me/discovery/impressions'],
  [['me', 'discovery', 'swipes', 'undo'], '/me/discovery/swipes/undo'],
  [['me', 'discovery', 'readiness'], '/me/discovery/readiness'],
  [['me', 'social-profile'], '/me/social-profile'],
  [['social', 'catalog', 'interests'], '/social/catalog/interests'],
  [['me', 'onboarding', 'social'], '/me/onboarding/social'],
  [['me', 'stories'], '/me/stories'],
  [['me', 'stories', 'feed'], '/me/stories/feed'],
  [['me', 'stories', id], `/me/stories/${id}`],
  [['me', 'stories', id, 'view'], `/me/stories/${id}/view`],
  [['me', 'stories', id, 'viewers'], `/me/stories/${id}/viewers`],
  [['me', 'stories', id, 'replies'], `/me/stories/${id}/replies`],
  [['me', 'stories', id, 'media'], `/me/stories/${id}/media`],
  [['me', 'reels'], '/me/reels'],
  [['me', 'reels', 'feed'], '/me/reels/feed'],
  [['me', 'reels', id, 'media'], `/me/reels/${id}/media`],
  [['me', 'profile-views'], '/me/profile-views'],
  [['me', 'profile-views', 'summary'], '/me/profile-views/summary'],
  [['me', 'profile-views', 'checked'], '/me/profile-views/checked'],
  [['me', 'interactions', 'likes-received'], '/me/interactions/likes-received'],
  [['me', 'interactions', 'likes-sent'], '/me/interactions/likes-sent'],
  [['me', 'interactions', 'passes-received'], '/me/interactions/passes-received'],
  [['me', 'interactions', 'passes-sent'], '/me/interactions/passes-sent'],
  [['me', 'interactions', 'counts'], '/me/interactions/counts'],
  [['me', 'interactions', 'passes', id], `/me/interactions/passes/${id}`],
  // F4: push web. Sin estas dos el navegador no puede ni preguntar si hay push.
  [['notifications', 'push', 'web-config'], '/notifications/push/web-config'],
  [['notifications', 'device-tokens'], '/notifications/device-tokens'],
  // H01 (docs/refactor-profesional/trabajo/HALLAZGOS.md): auditoría, permisos,
  // moderación y reportar contenido nunca habían llegado a este allowlist.
  [['admin', 'audit'], '/admin/audit'],
  [['admin', 'permissions', 'me'], '/admin/permissions/me'],
  [['admin', 'permissions', 'catalog'], '/admin/permissions/catalog'],
  [['admin', 'permissions', id], `/admin/permissions/${id}`],
  [
    ['admin', 'permissions', id, 'admin-access:manage'],
    `/admin/permissions/${id}/admin-access%3Amanage`,
  ],
  [['admin', 'moderation', 'queue'], '/admin/moderation/queue'],
  [
    ['admin', 'moderation', 'cases', 'CHAT_MESSAGE', id],
    `/admin/moderation/cases/CHAT_MESSAGE/${id}`,
  ],
  [
    ['admin', 'moderation', 'cases', 'CHAT_MESSAGE', id, 'claim'],
    `/admin/moderation/cases/CHAT_MESSAGE/${id}/claim`,
  ],
  [
    ['admin', 'moderation', 'cases', 'CHAT_MESSAGE', id, 'resolve'],
    `/admin/moderation/cases/CHAT_MESSAGE/${id}/resolve`,
  ],
  [['admin', 'moderation', 'users', id, 'history'], `/admin/moderation/users/${id}/history`],
  // ADR-0018: the central queue carries every reportable kind.
  [['admin', 'moderation', 'cases', 'ROUTINE', id], `/admin/moderation/cases/ROUTINE/${id}`],
  [
    ['admin', 'moderation', 'cases', 'COMMENT', id, 'resolve'],
    `/admin/moderation/cases/COMMENT/${id}/resolve`,
  ],
  [['admin', 'platform', 'moderators'], '/admin/platform/moderators'],
  [['admin', 'platform', 'moderators', id], `/admin/platform/moderators/${id}`],
  [['me', 'reports'], '/me/reports'],
  [['me', 'training-invitations'], '/me/training-invitations'],
  [['me', 'training-invitations', id, 'respond'], `/me/training-invitations/${id}/respond`],
  [
    ['me', 'training-invitations', id, 'shared-session'],
    `/me/training-invitations/${id}/shared-session`,
  ],
  [
    ['me', 'training-invitations', id, 'calendar.ics'],
    `/me/training-invitations/${id}/calendar.ics`,
  ],
  // Franja 6: person verification (member and staff).
  [['me', 'verification'], '/me/verification'],
  [['me', 'verification', 'challenge'], '/me/verification/challenge'],
  [['me', 'verification', id, 'selfie'], `/me/verification/${id}/selfie`],
  [['admin', 'verifications'], '/admin/verifications'],
  [['admin', 'verifications', id, 'selfie'], `/admin/verifications/${id}/selfie`],
  [['admin', 'verifications', id, 'decide'], `/admin/verifications/${id}/decide`],
  // Franja 7a: the gym catalog of the impersonation picker, and the member's own assignments.
  [['admin', 'tenants'], '/admin/tenants'],
  [['routines', 'assignments', 'me'], '/routines/assignments/me'],
];
const blockedCases: Array<[string[]]> = [
  [['admin', 'access', 'mock', 'events']],
  [['admin', 'unknown']],
  [['..', 'secrets']],
  [['gateway', 'events']],
  [['admin', 'media', id]],
  // A block needs a UUID, and the business has no list of its own outside `/me/conversations`.
  [['business', 'me', 'conversations', 'abc', 'block']],
  [['business', 'me', 'conversations']],
  [['me', 'business-conversations', id]],
  // Business routes outside the 8a contract, and a handle with a slash.
  [['business', 'signup']],
  [['business', 'me', 'media', 'GALLERY']],
  // Listings: UUID ids, exact verbs and numeric photo positions only.
  [['business', 'me', 'listings', 'not-a-uuid']],
  [['business', 'me', 'listings', id, 'publish']],
  [['business', 'me', 'listings', id, 'media', 'first']],
  [['business', 'me', 'gallery', 'all']],
  [['admin', 'business', 'listings', id, 'hide']],
  [['public', 'directory', 'profiles', 'a/b']],
  [['public', 'handles', 'a/b']],
  // KYC: only the declared verbs, documents by UUID, and none of the 8b admin extras yet.
  [['business', 'me', 'kyc', 'documents', 'not-a-uuid']],
  [['business', 'me', 'phone', 'verify']],
  [['admin', 'business', 'kyc', id, 'approve']],
  [['admin', 'business', 'blocklist']],
  [['admin', 'business', 'handles', 'reservations']],
  // Only `close` on a UUID under `/admin/users`, nothing else of that prefix.
  [['admin', 'users', id]],
  [['admin', 'users', 'not-a-uuid', 'close']],
  // `targetKind` es el enum cerrado de moderación, no un comodín.
  [['admin', 'moderation', 'cases', 'BOGUS_KIND', id]],
  // Moderators are addressed by UUID only, and nothing else lives under `/admin/platform`.
  [['admin', 'platform', 'moderators', 'not-a-uuid']],
  [['admin', 'platform', 'tenants']],
  // La administración del catálogo de la senda no pasa por el BFF: la pantalla
  // que la consumirá todavía no existe, y abrir la ruta antes de tener quien la
  // use sería dejar accesible desde el navegador una API que nadie vigila.
  [['admin', 'progression', 'badges']],
  [['admin', 'progression', 'levels']],
  // Las interacciones son cuatro listas concretas, no un prefijo abierto: una
  // entrada comodín bajo `/me/interactions` publicaría al navegador cualquier
  // ruta que el backend añada ahí mañana.
  [['me', 'interactions']],
  [['me', 'interactions', 'blocked']],
  [['me', 'discovery']],
  [['me', 'training-invitations', id, 'unexpected']],
  [['me', 'training-invitations', id, 'shared-session', 'unexpected']],
  [['me', 'training-invitations', id, 'calendar.json']],
  // Reels: exactas. Los comentarios ya existen en el backend (`me/reels/:id/comments`,
  // GET/POST/PATCH en `dev`) y se permiten; cualquier otro sufijo sigue fuera.
  [['me', 'reels', 'unexpected']],
  [['me', 'reels', id, 'unexpected']],
  // Tipos cerrados y formatos acotados de la auditoría 2026-11-09.
  [['comments', 'USER', id]],
  [['ratings', 'routine', id]],
  [['muscles', 'biceps..brachii']],
  [['routines', id, 'delete-everything']],
  [['admin', 'routines', id, 'unexpected']],
  // `push` no es un prefijo abierto: sólo la configuración pública pasa.
  [['notifications', 'push']],
  [['notifications', 'device-tokens', id]],
  // Consent kinds are a closed set; the export id is a strict UUID.
  [['me', 'consents', 'MARKETING']],
  [['me', 'export', 'newest']],
  [['me', 'export', 'latest', 'download']],
  [['me', 'account', 'delete-everything']],
  // Verification ids are strict UUIDs and the suffixes are exact.
  [['me', 'verification', 'not-a-uuid', 'selfie']],
  [['me', 'verification', id]],
  [['admin', 'verifications', id]],
  [['admin', 'verifications', id, 'approve-all']],
  // Franja 7a: coach routine assignment no longer exists.
  [['routines', id, 'assign']],
  [['routines', 'assignments', 'coach']],
  [['admin', 'tenants', 'default']],
];

describe('backend route policy', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });

  it.each(blockedCases)('blocks an unapproved route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });
});

describe('isNoStoreBackendPath', () => {
  it('marks the KYC detail, its documents and the business own KYC as never cacheable', () => {
    expect(isNoStoreBackendPath(`/admin/business/kyc/${id}/documents/${id}`)).toBe(true);
    expect(isNoStoreBackendPath(`/admin/business/kyc/${id}`)).toBe(true);
    expect(isNoStoreBackendPath('/business/me/kyc')).toBe(true);
    expect(isNoStoreBackendPath('/admin/business/kyc/queue')).toBe(true);
    expect(isNoStoreBackendPath('/business/me')).toBe(false);
  });
});

describe('anonymous public marketplace reads (franja 8c)', () => {
  it('only the public listings and profiles go without a session', () => {
    expect(isAnonymousBackendPath('/public/directory/listings')).toBe(true);
    expect(isAnonymousBackendPath(`/public/directory/listings/${id}`)).toBe(true);
    expect(isAnonymousBackendPath('/public/directory/profiles/topfit')).toBe(true);
    expect(isAnonymousBackendPath('/business/me/listings')).toBe(false);
    expect(isAnonymousBackendPath('/me/reports')).toBe(false);
    expect(isAnonymousBackendPath('/public/directory/entities')).toBe(false);
  });
});
