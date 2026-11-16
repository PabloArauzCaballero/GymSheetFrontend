import type { Metadata } from 'next';
import { MyReportsClient } from '@/features/moderation/components/my-reports-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Tus denuncias' };

export default async function MyReportsPage() {
  await requireSession();
  return <MyReportsClient />;
}
