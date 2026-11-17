import type { Metadata } from 'next';
import { MessageThreadClient } from '@/features/chat/components/message-thread-client';
import { requireBusinessSession } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Conversación' };

/**
 * One conversation of the business inbox (franja 8f): the person thread with
 * the business's controls. No socket origin: a business account has no socket
 * ticket (ADR-0023), so the thread polls.
 */
export default async function BusinessConversationPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [session, { id }] = await Promise.all([requireBusinessSession(), params]);
  return <MessageThreadClient backHref="/negocio/mensajes" conversationId={id} currentUserId={session.id} socketOrigin={null} viewer="business" />;
}
