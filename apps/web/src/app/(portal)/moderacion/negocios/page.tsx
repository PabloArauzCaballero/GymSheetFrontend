import { PLATFORM_MODERATION_ROLES } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { BusinessKycConsole } from '@/features/business-review/components/business-kyc-console';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Negocios' };

/**
 * REPP's business KYC console (backend ADR-0021): the central team only. The
 * backend serves `/admin/business/*` to `MODERATOR` and `SYSTEM_ADMIN` and
 * audits every read of identity data; this guard is just the client-side door.
 */
export default async function ModeracionNegociosPage() {
  const session = await requireRole(PLATFORM_MODERATION_ROLES);
  return <BusinessKycConsole viewerId={session.id} />;
}
