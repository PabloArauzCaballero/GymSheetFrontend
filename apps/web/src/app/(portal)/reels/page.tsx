import type { Metadata } from 'next';
import { ReelsPageClient } from '@/features/reels';

export const metadata: Metadata = { title: 'Reels' };

export default function ReelsPage() {
  return <ReelsPageClient />;
}
