'use client';

import { BUSINESS_CHAT_POLL_MS, businessChatCopy } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { ConversationRow } from '@/features/chat/components/conversation-row';
import { chatService } from '@/features/chat/services/chat-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';

/**
 * «Mensajes» of the business portal (franja 8f, plan §4.2): the chats persons
 * opened with this business, plus REPP's support chat pinned first by the
 * backend. A business has no socket, so the list refetches on an interval
 * while the tab is visible and again when it regains focus.
 */
export function BusinessInbox() {
  const conversations = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatService.listConversations,
    refetchInterval: BUSINESS_CHAT_POLL_MS.inbox,
    refetchOnWindowFocus: true,
  });
  const items = conversations.data ?? [];
  return (
    <div className="grid gap-6">
      <PageHeader description={businessChatCopy.inboxSubtitle} title={businessChatCopy.inboxTitle} />
      {conversations.isPending ? (
        <SkeletonList rows={4} variant="stacked" />
      ) : conversations.isError ? (
        <ErrorPanel error={conversations.error} message={conversations.error.message} onRetry={() => void conversations.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={businessChatCopy.inboxEmptyHint}
          flat
          icon={<MessageCircle aria-hidden className="size-6" />}
          title={businessChatCopy.inboxEmpty}
        />
      ) : (
        <ul
          aria-label="Tus conversaciones"
          className="m-0 grid list-none divide-y divide-[var(--border-subtle)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 py-1"
        >
          {items.map((conversation) => (
            <ConversationRow
              conversation={conversation}
              href={`/negocio/mensajes/${conversation.conversationId}`}
              key={conversation.conversationId}
              viewer="business"
            />
          ))}
        </ul>
      )}
    </div>
  );
}
