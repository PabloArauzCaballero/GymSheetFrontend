import type { Metadata } from 'next';
import { ReelsPageClient } from '@/features/reels';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Reels' };

export default async function ReelsPage() {
  const session = await requireSession();
  return <ReelsPageClient viewerId={session.id} />;
}
