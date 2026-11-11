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
import { Button } from '@/components/ui';
import { PressableScale, SegmentedPill } from '@/components/motion';
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

/** «Conectados hace 3 sem»: un dato de la relación, no una instrucción repetida en cada fila. */
function connectedSince(iso: string): string {
  const since = relativeTimeEs(iso);
  return since === 'ahora' ? 'Conectados ahora' : `Conectados hace ${since}`;
}

/** «Hace 2 h» / «Ahora»: lo que cabe junto a dos botones sin cortarse. */
function sinceLabel(iso: string): string {
  const since = relativeTimeEs(iso);
  return since === 'ahora' ? 'Ahora' : `Hace ${since}`;
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
  onPress,
  accessibilityHint,
}: {
  id: string;
  name: string;
  detail?: string;
  children: ReactNode;
  /** La fila entera hace la acción principal (abrir el chat); las de `children` quedan aparte. */
  onPress?: () => void;
  accessibilityHint?: string;
}) {
  const identity = (
    <>
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
    </>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.smd }}>
      {/* Pulsable y acciones son hermanos, no uno dentro de otro: en Android el
          padre se queda con el toque destinado al hijo (ver StoriesBar). */}
      {onPress ? (
        <PressableScale
          accessibilityHint={accessibilityHint}
          accessibilityLabel={detail ? `${name}. ${detail}` : name}
          onPress={onPress}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: minTouchTarget }}
        >
          {identity}
        </PressableScale>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>{identity}</View>
      )}
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
        compact
        icon="chatbubbles-outline"
        message="Conecta con alguien de tu gimnasio y escríbele desde aquí."
        title="Aún no tienes chats"
      >
        <Button
          icon="people-outline"
          label="Buscar gente"
          onPress={() => router.push('/comunidad')}
          size="sm"
          style={{ marginTop: spacing.xs }}
          variant="secondary"
        />
      </EmptyState>
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
  const router = useRouter();
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
    return (
      <EmptyState compact icon="mail-open-outline" message="Cuando alguien quiera conectar contigo, aparecerá aquí." title="Sin solicitudes">
        <Button
          icon="compass-outline"
          label="Descubrir gente"
          onPress={() => router.push('/descubrir')}
          size="sm"
          style={{ marginTop: spacing.xs }}
          variant="secondary"
        />
      </EmptyState>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {received.length ? (
        <Section icon="person-add-outline" title="Quieren conectar">
          <Card list>
            {received.map((connection, index) => (
              <View key={connection.id}>
                {index > 0 ? <Divider /> : null}
                <PersonRow
                  detail={sinceLabel(connection.createdAt)}
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
        compact
        icon="people-outline"
        message="Conecta con gente de tu gimnasio para entrenar y chatear juntos."
        title="Aún no tienes conexiones"
      >
        <Button
          icon="compass-outline"
          label="Descubrir gente"
          onPress={() => router.push('/descubrir')}
          size="sm"
          style={{ marginTop: spacing.xs }}
          variant="secondary"
        />
      </EmptyState>
    );
  }
  return (
    <Card list>
      {connections.data.map((connection, index) => (
        <View key={connection.id}>
          {index > 0 ? <Divider /> : null}
          {/* Tocar la fila abre el chat, que es a lo que se viene. Desconectar
              es raro y destructivo: va detrás de un «⋯» discreto y de su
              confirmación, no al lado de «mensaje» con el mismo peso. */}
          <PersonRow
            accessibilityHint="Abre el chat"
            detail={
              message.isPending && message.variables === connection.otherUserId
                ? 'Abriendo el chat…'
                : connectedSince(connection.createdAt)
            }
            id={connection.otherUserId}
            name={connection.otherUserName}
            onPress={() => {
              if (!message.isPending) message.mutate(connection.otherUserId);
            }}
          >
            <IconButton
              accessibilityLabel={`Más opciones con ${connection.otherUserName}`}
              background="transparent"
              disabled={remove.isPending}
              icon="ellipsis-horizontal"
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
      {/* Quien quiere conectar ya se ve dos veces —el «1» en Solicitudes y en la
          barra inferior—; un aviso aparte empujaba la lista y repetía el dato. */}
      <ScreenHeader subtitle="Tus chats, historias y solicitudes." title="Mensajes" />


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
