import { BUSINESS_CHAT_POLL_MS, businessChatCopy } from '@gymsheet/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { chatService } from '@/api/services';
import { ChatConversationRow } from '@/components/chat-conversation-row';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, ScreenHeader, ScrollScreen } from '@/components/layout';
import { useActivePoll } from '@/features/business-chat/use-active-poll';

const INBOX_KEY = ['chat', 'conversations'] as const;

/**
 * «Mensajes» of the business shell (franja 8f, plan §4.2): the chats persons
 * opened with this business and REPP's support chat, pinned first by the
 * backend. No socket for a business account: the list polls while this tab is
 * focused and the app is in the foreground, and refetches on coming back.
 */
export default function BusinessInboxScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refresh = useCallback(() => void queryClient.refetchQueries({ queryKey: INBOX_KEY, exact: true }), [queryClient]);
  const interval = useActivePoll(BUSINESS_CHAT_POLL_MS.inbox, refresh);
  const conversations = useQuery({ queryKey: INBOX_KEY, queryFn: () => chatService.listConversations(), refetchInterval: interval });
  const items = conversations.data ?? [];

  return (
    <ScrollScreen onRefresh={refresh} refreshing={conversations.isRefetching}>
      <ScreenHeader subtitle={businessChatCopy.inboxSubtitle} title={businessChatCopy.inboxTitle} />
      {conversations.isPending ? (
        <RowsSkeleton rows={4} thumb={52} />
      ) : conversations.isError ? (
        <ErrorState error={conversations.error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" message={businessChatCopy.inboxEmptyHint} title={businessChatCopy.inboxEmpty} />
      ) : (
        <Card list>
          {items.map((conversation, index) => (
            <View key={conversation.conversationId}>
              {index > 0 ? <Divider /> : null}
              <ChatConversationRow
                conversation={conversation}
                onPress={() => router.push({ pathname: '/(business)/conversacion/[id]', params: { id: conversation.conversationId } })}
                viewer="business"
              />
            </View>
          ))}
        </Card>
      )}
    </ScrollScreen>
  );
}
