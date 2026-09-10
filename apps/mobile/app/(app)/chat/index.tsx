import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { chatService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { Card, Divider, ScrollScreen, ScreenHeader } from '@/components/layout';
import { ChatConversationRow } from '@/components/chat-conversation-row';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';

export default function ChatListScreen() {
  const router = useRouter();
  const conversations = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatService.listConversations(),
  });

  return (
    <ScrollScreen
      onRefresh={() => void conversations.refetch()}
      refreshing={conversations.isFetching}
    >
      <BackLink />
      <ScreenHeader subtitle="Habla con las conexiones que ya aceptaste." title="Chat" />

      {conversations.isPending ? (
        <Skeleton height={200} />
      ) : conversations.isError ? (
        <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
      ) : conversations.data?.length ? (
        <Card>
          {conversations.data.map((conversation, index) => (
            <View key={conversation.conversationId}>
              {index > 0 ? <Divider /> : null}
              <ChatConversationRow
                conversation={conversation}
                onPress={() =>
                  router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } })
                }
              />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="chatbubbles-outline"
          message="Conecta con un socio y envíale un mensaje desde Comunidad."
          title="Sin conversaciones"
        />
      )}
    </ScrollScreen>
  );
}
