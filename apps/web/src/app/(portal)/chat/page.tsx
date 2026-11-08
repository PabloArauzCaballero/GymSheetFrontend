import type { Metadata } from 'next';
import { ChatHubClient } from '@/features/chat/components/chat-hub-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Mensajes' };

/** La sesión baja como prop: las historias necesitan saber cuál es la propia (el JWT no se lee en el cliente). */
export default async function ChatPage() {
  const session = await requireSession();
  return <ChatHubClient sessionName={session.nombreCompleto ?? session.email} sessionUserId={session.id} />;
}
