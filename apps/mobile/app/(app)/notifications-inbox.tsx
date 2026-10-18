import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Badge,
  Card,
  ScrollScreen,
  ScreenHeader,
  Section,
} from '@/components/layout';
import { IconButton } from '@/components/icon-button';
import { Button } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { notificationService } from '@/features/notifications/service';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

const notificationsKey = ['notifications'] as const;
const DATE_TIME = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function NotificationInboxScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const notifications = useQuery({
    queryKey: [...notificationsKey, page],
    queryFn: () => notificationService.list(page),
  });
  const read = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
      notify.success('Aviso marcado como leído.');
    },
    onError: (error: unknown) => notify.error(error),
  });

  if (notifications.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <ScreenHeader title="Bandeja de avisos" />
        <Skeleton height={118} />
        <Skeleton height={118} />
        <Skeleton height={118} />
      </ScrollScreen>
    );
  }

  if (notifications.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ScreenHeader title="Bandeja de avisos" />
        <ErrorState
          error={notifications.error}
          onRetry={() => void notifications.refetch()}
        />
      </ScrollScreen>
    );
  }

  const unread = notifications.data.items.filter(
    (item) => !item.leidoEn,
  ).length;

  return (
    <ScrollScreen
      onRefresh={() => void notifications.refetch()}
      refreshing={notifications.isFetching}
    >
      <BackLink />
      <ScreenHeader
        action={
          <IconButton
            icon="settings-outline"
            label="Preferencias de avisos"
            onPress={() => router.push('/notifications')}
            testID="inbox-preferences"
          />
        }
        subtitle="Mensajes importantes de tu gimnasio y tus programas."
        title="Bandeja de avisos"
      />
      <Section
        title={unread ? `${unread} nuevos en esta página` : 'Todos tus avisos'}
      >
        {notifications.data.items.length ? (
          <View style={{ gap: spacing.sm }}>
            {notifications.data.items.map((item) => (
              <Card key={item.id}>
                <View style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <Text style={{ flex: 1 }} variant="headline">
                      {item.asunto}
                    </Text>
                    {!item.leidoEn ? (
                      <Badge label="Nuevo" tone="success" />
                    ) : null}
                  </View>
                  <Text selectable>{item.mensaje}</Text>
                  <Text tone="muted" variant="footnote">
                    {DATE_TIME.format(new Date(item.creadoEn))} · {item.canal}
                  </Text>
                  {!item.leidoEn ? (
                    <Button
                      disabled={read.isPending}
                      icon="checkmark-done-outline"
                      label="Marcar como leído"
                      loading={read.isPending && read.variables === item.id}
                      onPress={() => read.mutate(item.id)}
                      size="sm"
                      style={{ alignSelf: 'flex-start' }}
                      variant="ghost"
                    />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="notifications-outline"
            message="Cuando recibas un aviso, aparecerá aquí."
            title="Tu bandeja está al día"
          />
        )}
      </Section>
      {notifications.data.totalPages > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            disabled={page <= 1 || notifications.isFetching}
            icon="chevron-back"
            label="Anterior"
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            size="sm"
            variant="secondary"
          />
          <Text tone="muted" variant="footnote">
            Página {notifications.data.page} de {notifications.data.totalPages}
          </Text>
          <Button
            disabled={
              page >= notifications.data.totalPages || notifications.isFetching
            }
            icon="chevron-forward"
            iconPosition="end"
            label="Siguiente"
            onPress={() =>
              setPage((current) =>
                Math.min(notifications.data.totalPages, current + 1),
              )
            }
            size="sm"
            variant="secondary"
          />
        </View>
      ) : null}
    </ScrollScreen>
  );
}
