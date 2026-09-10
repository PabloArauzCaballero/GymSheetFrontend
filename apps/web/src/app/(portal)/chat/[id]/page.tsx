import type { Metadata } from 'next';
import { MessageThreadClient } from '@/features/chat/components/message-thread-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Conversación' };

export default async function ConversationPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [session, routeParams] = await Promise.all([requireSession(), params]);
  return <MessageThreadClient conversationId={routeParams.id} currentUserId={session.id} />;
}
