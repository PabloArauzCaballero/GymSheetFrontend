'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { socialService } from '@/features/social/services/social-service';
import type { Connection } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonList,
} from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { notify } from '@/shared/notifications';

export function RequestsTab() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: queryKeys.connections,
    queryFn: () => socialService.listConnections('PENDING'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.connections });

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      socialService.respondConnection(id, action),
    onSuccess: async () => {
      await invalidate();
      notify.success('Solicitud actualizada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => socialService.withdrawConnection(id),
    onSuccess: async () => {
      await invalidate();
      notify.success('Solicitud retirada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (pending.isLoading) return <SkeletonList rows={4} variant="stacked" />;
  if (pending.isError) {
    return <ErrorPanel message={pending.error.message} onRetry={() => pending.refetch()} />;
  }

  const received = (pending.data ?? []).filter((connection) => connection.direction === 'RECEIVED');
  const sent = (pending.data ?? []).filter((connection) => connection.direction === 'SENT');

  if (!received.length && !sent.length) {
    return <EmptyState description="No tienes solicitudes pendientes." title="Sin solicitudes" />;
  }

  return (
    <div className="grid gap-8">
      {received.length ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Te escribieron
          </h3>
          {received.map((connection) => (
            <RequestRow
              connection={connection}
              key={connection.id}
              onAccept={() => respond.mutate({ id: connection.id, action: 'ACCEPT' })}
              onReject={() => respond.mutate({ id: connection.id, action: 'REJECT' })}
              pending={respond.isPending}
            />
          ))}
        </section>
      ) : null}
      {sent.length ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Enviadas
          </h3>
          {sent.map((connection) => (
            <Card className="flex items-center justify-between gap-3 p-4" key={connection.id}>
              <p className="font-semibold">{connection.otherUserName}</p>
              <Button
                loading={withdraw.isPending && withdraw.variables === connection.id}
                onClick={() => withdraw.mutate(connection.id)}
                size="sm"
                variant="secondary"
              >
                Cancelar invitación de conexión
              </Button>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function RequestRow({
  connection,
  onAccept,
  onReject,
  pending,
}: Readonly<{ connection: Connection; onAccept: () => void; onReject: () => void; pending: boolean }>) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <p className="font-semibold">{connection.otherUserName}</p>
      <div className="flex gap-2">
        <Button aria-label="Aceptar" loading={pending} onClick={onAccept} size="sm" variant="primary">
          <Check className="size-4" />
        </Button>
        <Button aria-label="Rechazar" loading={pending} onClick={onReject} size="sm" variant="danger">
          <X className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
