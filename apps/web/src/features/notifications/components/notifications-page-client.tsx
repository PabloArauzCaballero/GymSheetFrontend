'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { notificationService } from '@/features/notifications/services/notification-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Pagination } from '@/shared/components/ui/pagination';
import { formatDateTime } from '@/shared/lib/date';
import { NotificationPreferenceForm } from './notification-preference-form';

export function NotificationsPageClient() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: () => notificationService.list(page),
  });
  const preference = useQuery({
    queryKey: queryKeys.notificationPreference,
    queryFn: notificationService.getPreference,
  });
  const read = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      notify.success('Aviso marcado como leído.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (notifications.isLoading || preference.isLoading) return <LoadingPanel rows={7} />;
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Avisos propios y consentimiento explícito para canales externos."
        eyebrow="Centro de avisos"
        title="Notificaciones"
      />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader title="Bandeja" />
          <CardContent className="p-0">
            {notifications.isError ? (
              <div className="p-5">
                <ErrorPanel
                  message={notifications.error.message}
                  onRetry={() => notifications.refetch()}
                />
              </div>
            ) : notifications.data?.items.length ? (
              <>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {notifications.data.items.map((item) => (
                    <article
                      className={`p-5 ${item.leidoEn ? '' : 'bg-[var(--surface-low)]'}`}
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-[4px] border border-[var(--border)]">
                            <Bell className="size-4 text-[var(--accent-ink)]" />
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-bold">{item.asunto}</h2>
                              {!item.leidoEn ? <Badge tone="success">Nuevo</Badge> : null}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                              {item.mensaje}
                            </p>
                            <p className="mt-3 text-xs text-[var(--text-disabled)]">
                              {formatDateTime(item.creadoEn)} · {item.canal}
                            </p>
                          </div>
                        </div>
                        {!item.leidoEn ? (
                          <Button
                            aria-label="Marcar como leído"
                            loading={read.isPending}
                            onClick={() => read.mutate(item.id)}
                            size="icon"
                            variant="ghost"
                          >
                            <Check className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                <Pagination
                  onPageChange={setPage}
                  page={notifications.data.page}
                  totalPages={notifications.data.totalPages}
                />
              </>
            ) : (
              <div className="p-5">
                <EmptyState
                  description="No hay avisos pendientes para tu cuenta."
                  title="Bandeja vacía"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            description="El canal externo exige fecha y versión de consentimiento."
            title="Preferencias"
          />
          <CardContent>
            {preference.isError ? (
              <ErrorPanel message={preference.error.message} onRetry={() => preference.refetch()} />
            ) : preference.data ? (
              <NotificationPreferenceForm preference={preference.data} />
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
