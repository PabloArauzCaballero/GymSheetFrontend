import { PLATFORM_MODERATION_ROLES } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { ModerationQueue } from '@/features/moderation/components/moderation-queue';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Moderación' };

/** One queue for every gym: the backend mixes them and names each case's gym. */
export default async function ModeracionPage() {
  await requireRole(PLATFORM_MODERATION_ROLES);
  return <ModerationQueue />;
}
