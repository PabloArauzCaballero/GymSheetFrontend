import type { Metadata } from 'next';
import { ConversationListClient } from '@/features/chat/components/conversation-list-client';

export const metadata: Metadata = { title: 'Chat' };

export default function ChatPage() {
  return <ConversationListClient />;
}
