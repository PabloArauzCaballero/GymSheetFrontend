import type { Metadata } from 'next';
import { ChatHubClient } from '@/features/chat/components/chat-hub-client';

export const metadata: Metadata = { title: 'Mensajes' };

export default function ChatPage() {
  return <ChatHubClient />;
}
