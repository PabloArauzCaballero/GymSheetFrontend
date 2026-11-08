'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { notificationService } from '@/features/notifications/services/notification-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonList,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Section } from '@/shared/components/mobile/section';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Pagination } from '@/shared/components/ui/pagination';
import { formatDateTime } from '@/shared/lib/date';
import { NotificationPreferenceForm } from './notification-preference-form';
import { WebPushCard } from './web-push-card';

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
  const unreadCount = notifications.data?.items.filter((item) => !item.leidoEn).length ?? 0;
  if (notifications.isLoading || preference.isLoading) {
    return (
      <SkeletonScreen className="gap-8" label="Cargando tus avisos">
        <SkeletonPageHeader />
        <SkeletonList rows={6} />
      </SkeletonScreen>
    );
  }
  return (
    // «Bandeja de avisos» del móvil (`notifications-inbox.tsx`): un aviso por
    // tarjeta, «Nuevo» en verde y «Marcar como leído» en fantasma. Al lado, lo
    // que se configura (en el móvil vive en su propia pantalla).
    <div className="mx-auto grid w-full max-w-[560px] gap-8 xl:max-w-[1040px]">
      <PageHeader description="Mensajes importantes de tu gimnasio y tus programas." title="Bandeja de avisos" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <Section title={unreadCount ? `${unreadCount} nuevos en esta página` : 'Todos tus avisos'}>
          {notifications.isError ? (
            <ErrorPanel message={notifications.error.message} onRetry={() => notifications.refetch()} />
          ) : notifications.data?.items.length ? (
            <>
              <div className="grid gap-2">
                {notifications.data.items.map((item) => (
                  <article className="panel grid min-w-0 gap-2 p-5" key={item.id}>
                    <div className="flex items-center gap-2">
                      <h2 className="t-headline min-w-0 flex-1 break-words">{item.asunto}</h2>
                      {!item.leidoEn ? <Badge tone="success">Nuevo</Badge> : null}
                    </div>
                    <p className="text-[17px] leading-6 break-words">{item.mensaje}</p>
                    <p className="t-footnote text-[var(--text-muted)]">
                      {formatDateTime(item.creadoEn)} · {item.canal}
                    </p>
                    {!item.leidoEn ? (
                      <Button
                        className="justify-self-start"
                        disabled={read.isPending}
                        loading={read.isPending && read.variables === item.id}
                        onClick={() => read.mutate(item.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <CheckCheck aria-hidden className="size-4" />
                        Marcar como leído
                      </Button>
                    ) : null}
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
            <EmptyState
              description="Cuando recibas un aviso, aparecerá aquí."
              icon={<Bell />}
              level={3}
              title="Tu bandeja está al día"
            />
          )}
        </Section>
        {/* La columna lateral agrupa lo que se CONFIGURA, frente a la bandeja,
            que es lo que se lee: preferencias de canal primero y el opt-in de
            este navegador debajo, porque uno vale para la cuenta entera y el
            otro solo para el equipo que tienes delante. */}
        <Section title="Preferencias">
          <Card>
            <CardHeader
              description="El canal externo exige fecha y versión de consentimiento."
              title="Qué avisos quieres recibir"
            />
            <CardContent>
              {preference.isError ? (
                <ErrorPanel
                  message={preference.error.message}
                  onRetry={() => preference.refetch()}
                />
              ) : preference.data ? (
                <NotificationPreferenceForm preference={preference.data} />
              ) : null}
            </CardContent>
          </Card>
          <WebPushCard />
        </Section>
      </div>
    </div>
  );
}
