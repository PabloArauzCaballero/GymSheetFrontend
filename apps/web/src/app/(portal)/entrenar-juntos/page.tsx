import type { Metadata } from 'next';
import { TrainingInvitationsClient } from '@/features/training-invitations/components/training-invitations-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Entrenar juntos' };

export default async function TrainingInvitationsPage() {
  const session = await requireSession();
  return <TrainingInvitationsClient sessionUserId={session.id} />;
}
