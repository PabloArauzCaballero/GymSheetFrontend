'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { chatService } from '@/features/chat/services/chat-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonList,
} from '@/shared/components/feedback/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/layout/page-header';
import { formatDateTime } from '@/shared/lib/date';

export function ConversationListClient() {
  const conversations = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatService.listConversations,
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Habla con las conexiones que ya aceptaste."
        eyebrow="Punto 5"
        title="Chat"
        tutorialId="page:chat"
      />
      {conversations.isLoading ? (
        <SkeletonList rows={4} variant="stacked" />
      ) : conversations.isError ? (
        <ErrorPanel message={conversations.error.message} onRetry={() => conversations.refetch()} />
      ) : conversations.data?.length ? (
        <section className="grid gap-3">
          {conversations.data.map((conversation) => (
            <Link href={`/chat/${conversation.conversationId}`} key={conversation.conversationId}>
              <Card className="grid gap-1 p-4 transition-colors hover:border-[var(--border)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{conversation.otherUserName}</p>
                    {conversation.systemKind ? (
                      <Badge tone="info">
                        {conversation.systemKind === 'CORPORATE' ? 'Corporativo' : 'Admin del gimnasio'}
                      </Badge>
                    ) : null}
                  </div>
                  {conversation.lastMessageAt ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDateTime(conversation.lastMessageAt)}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm text-[var(--text-muted)]">
                  {conversation.lastMessage ?? 'Todavía sin mensajes.'}
                </p>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState
          action={
            <ButtonLink href="/comunidad" variant="primary">
              Ir a Comunidad
            </ButtonLink>
          }
          description="Conecta con un socio y envíale un mensaje desde Comunidad."
          title="Sin conversaciones"
        />
      )}
    </div>
  );
}
