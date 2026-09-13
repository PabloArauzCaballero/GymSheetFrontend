'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { chatService } from '@/features/chat/services/chat-service';
import { socialService } from '@/features/social/services/social-service';
import { queryKeys } from '@/shared/api/query-keys';
import { connectionKeys } from '@/features/social/services/directory-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonList,
} from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { notify } from '@/shared/notifications';

export function ConnectionsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const connections = useQuery({
    queryKey: connectionKeys.byStatus('ACCEPTED'),
    queryFn: () => socialService.listConnections('ACCEPTED'),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => router.push(`/chat/${conversation.conversationId}`),
    onError: (error: Error) => notify.error(error),
  });

  const remove = useMutation({
    mutationFn: (id: string) => socialService.withdrawConnection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      notify.success('Conexión eliminada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (connections.isLoading) return <SkeletonList rows={4} variant="stacked" />;
  if (connections.isError) {
    return <ErrorPanel message={connections.error.message} onRetry={() => connections.refetch()} />;
  }
  if (!connections.data?.length) {
    return (
      <EmptyState
        description="Conecta con otros socios desde el directorio."
        title="Aún no tienes conexiones"
      />
    );
  }

  return (
    <section className="grid gap-3">
      {connections.data.map((connection) => (
        <Card className="flex items-center justify-between gap-3 p-4" key={connection.id}>
          <p className="font-semibold">{connection.otherUserName}</p>
          <div className="flex gap-2">
            <Button
              loading={message.isPending && message.variables === connection.otherUserId}
              onClick={() => message.mutate(connection.otherUserId)}
              size="sm"
              variant="primary"
            >
              <MessageCircle className="size-4" />
              Mensaje
            </Button>
            {connection.direction === 'SENT' ? (
              <Button
                aria-label="Eliminar conexión"
                loading={remove.isPending && remove.variables === connection.id}
                onClick={() => remove.mutate(connection.id)}
                size="sm"
                variant="secondary"
              >
                <UserMinus className="size-4" />
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </section>
  );
}
