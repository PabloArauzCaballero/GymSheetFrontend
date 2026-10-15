import type { Metadata } from 'next';
import { BlockedUsersClient } from '@/features/social/components/blocked-users-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Personas bloqueadas' };

export default async function BlockedUsersPage() {
  await requireSession();
  return <BlockedUsersClient />;
}
