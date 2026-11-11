import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatService, profileViewsService, socialService } from '@/api/services';
import { refreshSocialRelationship } from '@/api/social-cache';
import { Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { ChatConversationRow } from '@/components/chat-conversation-row';
import { PersonAvatar } from '@/components/person-avatar';
import { SegmentedPill } from '@/components/motion';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { confirm, notify } from '@/notifications';
import { StoriesBar } from '@/components/stories-bar';
import { relativeTimeEs } from '@/features/routine-community/relative-time';
import { accentContrast, alpha, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

type Tab = 'general' | 'solicitudes' | 'conexiones';

/** Botón circular de solo ícono, para acciones secundarias que no necesitan una etiqueta de texto. */
function IconButton({
  icon,
  background,
  tint,
  disabled,
  loading = false,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  tint: string;
  disabled?: boolean;
  /** Mientras la petición está en vuelo: el glifo cede el sitio a un indicador. */
  loading?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
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
      {loading ? <ActivityIndicator color={tint} size="small" /> : <Ionicons color={tint} name={icon} size={iconSizes.md} />}
    </Pressable>
  );
}

/**
 * Las tres vistas de Mensajes, solo con icono. El nombre no desaparece: viaja
 * como etiqueta accesible («Solicitudes, pestaña») y como encabezado de cada
 * vista. Con texto, «Solicitudes» y «Conexiones» llenaban la cápsula de borde a
 * borde y la píldora activa tocaba a sus vecinas.
 */
const TABS: readonly { value: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'general', label: 'General', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { value: 'solicitudes', label: 'Solicitudes', icon: 'mail-unread-outline', activeIcon: 'mail-unread' },
  { value: 'conexiones', label: 'Conexiones', icon: 'people-outline', activeIcon: 'people' },
];

/**
 * Una persona en una lista de Mensajes: avatar, nombre y sus acciones de icono.
 * El nombre cede (una línea, `flex: 1`) y las acciones no: antes un nombre
 * largo como «GymSheet Administrator» empujaba «Retirar» fuera de la tarjeta.
 */
function PersonRow({
  id,
  name,
  detail,
  children,
}: {
  id: string;
  name: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        paddingVertical: spacing.smd,
      }}
    >
      <PersonAvatar id={id} name={name} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
          {name}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>
    </View>
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
  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      socialService.respondConnection(id, action),
    onSuccess: async (_result, variables) => {
      await refreshSocialRelationship(queryClient, {
        conversations: variables.action === 'ACCEPT',
      });
      notify.success('Solicitud actualizada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => socialService.withdrawConnection(id),
    onSuccess: async (_result, _connectionId) => {
      await refreshSocialRelationship(queryClient);
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
          <Card list>
            {received.map((connection, index) => (
              <View key={connection.id}>
                {index > 0 ? <Divider /> : null}
                <PersonRow
                  detail={`Quiere conectar · ${relativeTimeEs(connection.createdAt)}`}
                  id={connection.otherUserId}
                  name={connection.otherUserName}
                >
                  <IconButton
                    accessibilityLabel={`Aceptar la solicitud de ${connection.otherUserName}`}
                    background={colors.volt}
                    disabled={respond.isPending}
                    icon="checkmark"
                    loading={respond.isPending && respond.variables?.id === connection.id && respond.variables.action === 'ACCEPT'}
                    onPress={() => respond.mutate({ id: connection.id, action: 'ACCEPT' })}
                    tint={accentContrast()}
                  />
                  <IconButton
                    accessibilityLabel={`Rechazar la solicitud de ${connection.otherUserName}`}
                    background={colors.surfaceHigh}
                    disabled={respond.isPending}
                    icon="close"
                    loading={respond.isPending && respond.variables?.id === connection.id && respond.variables.action === 'REJECT'}
                    onPress={() => respond.mutate({ id: connection.id, action: 'REJECT' })}
                    tint={colors.danger}
                  />
                </PersonRow>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {sent.length ? (
        <Section icon="paper-plane-outline" title="Enviadas">
          <Card list>
            {sent.map((connection, index) => (
              <View key={connection.id}>
                {index > 0 ? <Divider /> : null}
                <PersonRow
                  detail={`Enviada · ${relativeTimeEs(connection.createdAt)}`}
                  id={connection.otherUserId}
                  name={connection.otherUserName}
                >
                  {/* Retirar es secundario y reversible: icono sobre superficie,
                      no un botón de contorno a media fila. */}
                  <IconButton
                    accessibilityLabel={`Retirar la solicitud a ${connection.otherUserName}`}
                    background={colors.surfaceHigh}
                    disabled={withdraw.isPending}
                    icon="close"
                    loading={withdraw.isPending && withdraw.variables === connection.id}
                    onPress={() => withdraw.mutate(connection.id)}
                    tint={colors.textSecondary}
                  />
                </PersonRow>
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
      await Promise.all([
        refreshSocialRelationship(queryClient),
        queryClient.invalidateQueries({ queryKey: ['chat'] }),
      ]);
      notify.success('Conexión eliminada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  async function disconnect(connectionId: string): Promise<void> {
    const result = await confirm({
      title: 'Desconectar',
      message: 'Se cerrará el chat y dejarás de ver esta conexión. Si vuelven a conectar, el chat empezará vacío.',
      severity: 'danger',
      confirmLabel: 'Desconectar',
      cancelLabel: 'Cancelar',
    });
    if (result.confirmed) remove.mutate(connectionId);
  }

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
    <Card list>
      {connections.data.map((connection, index) => (
        <View key={connection.id}>
          {index > 0 ? <Divider /> : null}
          <PersonRow id={connection.otherUserId} name={connection.otherUserName}>
            <IconButton
              accessibilityLabel={`Enviar un mensaje a ${connection.otherUserName}`}
              background={alpha(colors.accentInk, 0.16)}
              disabled={message.isPending}
              icon="chatbubble"
              loading={message.isPending && message.variables === connection.otherUserId}
              onPress={() => message.mutate(connection.otherUserId)}
              tint={colors.accentInk}
            />
            <IconButton
              accessibilityLabel={`Desconectar de ${connection.otherUserName}`}
              background={colors.surfaceHigh}
              disabled={remove.isPending}
              icon="person-remove-outline"
              loading={remove.isPending && remove.variables === connection.id}
              onPress={() => void disconnect(connection.id)}
              tint={colors.textMuted}
            />
          </PersonRow>
        </View>
      ))}
    </Card>
  );
}

/**
 * Primera pestaña de la barra (y pantalla de arranque): historias,
 * conversaciones, solicitudes y conexiones en un solo lugar. Al ser pestaña no
 * lleva «Volver».
 */
export default function ComunidadMensajesScreen() {
  const [tab, setTab] = useState<Tab>('general');
  const shownRef = useRef(false);
  // Misma clave que la vista de Solicitudes: el contador sale de la caché, sin
  // una petición más.
  const pending = useQuery({
    queryKey: ['social', 'connections', 'PENDING'],
    queryFn: () => socialService.listConnections('PENDING'),
  });
  const receivedCount = (pending.data ?? []).filter((connection) => connection.direction === 'RECEIVED').length;

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
      <ScreenHeader subtitle="Historias, conversaciones y solicitudes." title="Mensajes" />

      <StoriesBar />

      <SegmentedPill<Tab>
        fill
        onChange={setTab}
        options={TABS.map((item) => ({
          value: item.value,
          accessibilityLabel:
            item.value === 'solicitudes' && receivedCount > 0
              ? `${item.label}, ${receivedCount} ${receivedCount === 1 ? 'pendiente' : 'pendientes'}`
              : item.label,
        }))}
        itemStyle={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
        pillColor={colors.volt}
        renderItem={(option, active) => {
          const item = TABS.find((entry) => entry.value === option.value);
          if (!item) return null;
          const badge = option.value === 'solicitudes' && receivedCount > 0 ? receivedCount : 0;
          return (
            <View>
              <Ionicons
                accessibilityElementsHidden
                color={active ? accentContrast() : colors.textMuted}
                importantForAccessibility="no-hide-descendants"
                name={active ? item.activeIcon : item.icon}
                size={iconSizes.lg}
              />
              {badge ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 4,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? accentContrast() : colors.volt,
                    borderWidth: 2,
                    borderColor: active ? colors.volt : colors.surfaceHigh,
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.volt : accentContrast(),
                      fontSize: fontSizes.xs,
                      fontWeight: semibold,
                      lineHeight: 14,
                    }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
        style={{
          padding: spacing.xs,
          borderRadius: radii.full,
          backgroundColor: colors.surfaceHigh,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: alpha(colors.text, 0.08),
        }}
        value={tab}
      />

      {tab === 'general' ? <GeneralTab /> : tab === 'solicitudes' ? <SolicitudesTab /> : <ConexionesTab />}
    </ScrollScreen>
  );
}
