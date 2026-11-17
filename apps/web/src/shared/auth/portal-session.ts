import type { SessionPrincipal } from '@/shared/api/contracts';

/**
 * The session the portal renders with. `emailVerified` comes from `GET /auth/me`;
 * absent means an older backend that does not report it (treated as verified,
 * so nobody is nagged by a banner the server cannot back).
 */
export type PortalSession = SessionPrincipal & { emailVerified?: boolean };
