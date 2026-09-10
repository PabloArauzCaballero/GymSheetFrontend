import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatService, profileViewsService, socialService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { ChatConversationRow } from '@/components/chat-conversation-row';
import { Button } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { confirm, notify } from '@/notifications';
import { accentContrast, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

type Tab = 'general' | 'solicitudes' | 'conexiones';

/** Botón circular de solo ícono, para acciones secundarias que no necesitan una etiqueta de texto. */
function IconButton({
  icon,
  background,
  tint,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  tint: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: minTouchTarget,
        height: minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: background,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <Ionicons color={tint} name={icon} size={iconSizes.md} />
    </Pressable>
  );
}

function TabChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
        backgroundColor: active ? colors.volt : 'transparent',
      }}
    >
      <Ionicons color={active ? colors.background : colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text style={{ color: active ? colors.background : colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>
        {label}
      </Text>
    </PressableScale>
  );
}

function GeneralTab() {
  const router = useRouter();
  const conversations = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatService.listConversations(),
  });

  if (conversations.isPending) return <Skeleton height={200} />;
  if (conversations.isError) {
    return <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />;
  }
  if (!conversations.data?.length) {
    return (
      <EmptyState
        icon="chatbubbles-outline"
        message="Conecta con un socio y envíale un mensaje desde Comunidad."
        title="Sin conversaciones"
      />
    );
  }
  return (
    <Card>
      {conversations.data.map((conversation, index) => (
        <View key={conversation.conversationId}>
          {index > 0 ? <Divider /> : null}
          <ChatConversationRow
            conversation={conversation}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } })}
          />
        </View>
      ))}
    </Card>
  );
}

function SolicitudesTab() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ['social', 'connections', 'PENDING'],
    queryFn: () => socialService.listConnections('PENDING'),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['social', 'connections'] });

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      socialService.respondConnection(id, action),
    onSuccess: async () => {
      await invalidate();
      notify.success('Solicitud actualizada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => socialService.withdrawConnection(id),
    onSuccess: async () => {
      await invalidate();
      notify.success('Solicitud retirada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  if (pending.isPending) return <Skeleton height={150} />;
  if (pending.isError) return <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />;

  const received = (pending.data ?? []).filter((connection) => connection.direction === 'RECEIVED');
  const sent = (pending.data ?? []).filter((connection) => connection.direction === 'SENT');

  if (!received.length && !sent.length) {
    return <EmptyState icon="mail-open-outline" message="No tienes solicitudes pendientes." title="Sin solicitudes" />;
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {received.length ? (
        <Section icon="mail-unread-outline" title="Te escribieron">
          <Card>
            {received.map((connection, index) => (
              <View key={connection.id}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.text, flex: 1, fontSize: fontSizes.md, fontWeight: semibold }}
                  >
                    {connection.otherUserName}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <IconButton
                      accessibilityLabel="Aceptar solicitud"
                      background={colors.volt}
                      disabled={respond.isPending}
                      icon="checkmark"
                      onPress={() => respond.mutate({ id: connection.id, action: 'ACCEPT' })}
                      tint={accentContrast()}
                    />
                    <IconButton
                      accessibilityLabel="Rechazar solicitud"
                      background={colors.danger}
                      disabled={respond.isPending}
                      icon="close"
                      onPress={() => respond.mutate({ id: connection.id, action: 'REJECT' })}
                      tint={colors.background}
                    />
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {sent.length ? (
        <Section icon="paper-plane-outline" title="Enviadas">
          <Card>
            {sent.map((connection, index) => (
              <View key={connection.id}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm,
                    gap: spacing.sm,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                    {connection.otherUserName}
                  </Text>
                  <Button
                    label="Retirar"
                    loading={withdraw.isPending && withdraw.variables === connection.id}
                    onPress={() => withdraw.mutate(connection.id)}
                    variant="ghost"
                  />
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </View>
  );
}

function ConexionesTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const connections = useQuery({
    queryKey: ['social', 'connections', 'ACCEPTED'],
    queryFn: () => socialService.listConnections('ACCEPTED'),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) =>
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } }),
    onError: (error: Error) => notify.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => socialService.withdrawConnection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social', 'connections'] });
      notify.success('Conexión eliminada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  if (connections.isPending) return <Skeleton height={150} />;
  if (connections.isError) {
    return <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />;
  }
  if (!connections.data?.length) {
    return (
      <EmptyState
        icon="people-outline"
        message="Conecta con otros socios desde Comunidad."
        title="Aún no tienes conexiones"
      />
    );
  }
  return (
    <Card>
      {connections.data.map((connection, index) => (
        <View key={connection.id}>
          {index > 0 ? <Divider /> : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              paddingVertical: spacing.sm,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ color: colors.text, flex: 1, fontSize: fontSizes.md, fontWeight: semibold }}
            >
              {connection.otherUserName}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <IconButton
                accessibilityLabel="Enviar mensaje"
                background={colors.surfaceHigh}
                disabled={message.isPending && message.variables === connection.otherUserId}
                icon="chatbubble-outline"
                onPress={() => message.mutate(connection.otherUserId)}
                tint={colors.text}
              />
              {connection.direction === 'SENT' ? (
                <IconButton
                  accessibilityLabel="Eliminar conexión"
                  background={colors.surfaceHigh}
                  disabled={remove.isPending && remove.variables === connection.id}
                  icon="person-remove-outline"
                  onPress={() => remove.mutate(connection.id)}
                  tint={colors.textMuted}
                />
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

/**
 * Detrás del ícono de mensaje de Comunidad: conversaciones, solicitudes y
 * conexiones en un solo lugar, cambiando de pestaña sin salir de la pantalla.
 */
export default function ComunidadMensajesScreen() {
  const [tab, setTab] = useState<Tab>('general');
  const shownRef = useRef(false);

  const visitsSummary = useQuery({
    queryKey: ['profile-views', 'summary'],
    queryFn: () => profileViewsService.summary(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (shownRef.current || !visitsSummary.data) return;
    const count = visitsSummary.data.uniqueViewersToday;
    if (count <= 0) return;
    shownRef.current = true;
    void confirm({
      title: count === 1 ? '1 persona visitó tu perfil hoy' : `${count} personas visitaron tu perfil hoy`,
      message: 'Socios de tu gimnasio pasaron por tu perfil en las últimas horas.',
      severity: 'info',
      confirmLabel: 'Genial',
      cancelLabel: 'Cerrar',
    });
  }, [visitsSummary.data]);

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader subtitle="Conversaciones, solicitudes y conexiones." title="Mensajes" />

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.xs,
          backgroundColor: colors.surfaceHigh,
          borderRadius: radii.full,
          padding: 4,
        }}
      >
        <TabChip
          active={tab === 'general'}
          icon="chatbubbles-outline"
          label="General"
          onPress={() => setTab('general')}
        />
        <TabChip
          active={tab === 'solicitudes'}
          icon="mail-unread-outline"
          label="Solicitudes"
          onPress={() => setTab('solicitudes')}
        />
        <TabChip
          active={tab === 'conexiones'}
          icon="people-outline"
          label="Conexiones"
          onPress={() => setTab('conexiones')}
        />
      </View>

      {tab === 'general' ? <GeneralTab /> : tab === 'solicitudes' ? <SolicitudesTab /> : <ConexionesTab />}
    </ScrollScreen>
  );
}
