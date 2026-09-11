import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { EarnedBadge, ProgressionBadge } from '@gymsheet/schemas';
import { chatService, profileViewsService, socialService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { Card, Row, ScrollScreen, Section } from '@/components/layout';
import { levelTitle } from '@/components/directory-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { BadgeTile } from '@/components/progression';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';
import {
  EXPERIENCE_LEVEL_LABEL,
  GENDER_LABEL,
  SOCIAL_STATUS_LABEL,
  TRAINING_GOAL_LABEL,
} from '@/lib/social-labels';

const AVATAR_SIZE = 120;

/**
 * La insignia ajena, en el molde de la propia senda.
 *
 * `BadgeTile` pinta también las pendientes, y por eso pide su progreso. Un
 * perfil ajeno sólo lista las conseguidas —mirar a alguien no revela lo que le
 * falta—, así que los tres campos del camino se rellenan aquí con lo único que
 * pueden significar: nada pendiente que mostrar.
 */
function asProgressionBadge(badge: EarnedBadge): ProgressionBadge {
  return { ...badge, isNew: false, progress: null, progressLabel: null };
}

/**
 * El perfil de otro socio.
 *
 * Registra la visita —es de donde sale el resumen de «quién te visitó hoy» del
 * dueño del perfil— y muestra lo que el gimnasio deja ver de esa persona: su
 * ficha del directorio, su rango con sus puntos y las insignias que ya ganó.
 *
 * Conectar y escribir se hacen desde aquí, con la misma lógica de estados que
 * la tarjeta de Comunidad: llegar al perfil de alguien y tener que volver atrás
 * para poder conectar era el camino largo a la única acción que la pantalla
 * invita a hacer.
 */
export default function PerfilDetailScreen() {
  const params = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.userId;
  const recordedRef = useRef<string | null>(null);

  /**
   * Registrar la visita una sola vez, sea cual sea la forma de llegar aquí.
   *
   * La guarda es una referencia y no un estado porque escribirla no debe
   * provocar un render: es una marca de «esto ya se hizo», no algo que se
   * pinte. Y guarda el `userId`, no un booleano, que es lo que la hace
   * correcta en los dos modos de navegación que usa esta app:
   *
   * - `push` (el caso normal: se abre un perfil desde una lista) monta una
   *   instancia nueva de la pantalla, con su referencia a `null`. Encadenar
   *   dos perfiles distintos registra los dos, cada uno en su montaje.
   * - `navigate` hacia la misma ruta con otro parámetro **reutiliza** la
   *   pantalla y sólo cambia los parámetros: no hay montaje nuevo, el efecto
   *   se vuelve a ejecutar con el `userId` nuevo y, como la referencia guarda
   *   el anterior, la comparación falla y la segunda visita también se
   *   registra. Con un booleano se habría perdido.
   *
   * La marca se escribe antes de lanzar la petición, no en su respuesta: en
   * desarrollo React monta, desmonta y vuelve a montar cada efecto, y hacerlo
   * después dejaba pasar dos registros de la misma visita.
   *
   * `useLocalSearchParams` y no `useGlobalSearchParams`: el global devuelve
   * los parámetros de la ruta activa, así que al abrir un segundo perfil
   * encima la pantalla de abajo —que sigue montada— vería el `userId` del de
   * arriba y registraría una visita que nadie hizo.
   */
  useEffect(() => {
    if (!userId || recordedRef.current === userId) return;
    recordedRef.current = userId;
    // Fallo silencioso a propósito: registrar la visita es un efecto
    // secundario del que el visitante no es responsable, y un aviso de error
    // por algo que él no ha pedido ni puede arreglar sólo sería ruido.
    void profileViewsService.record(userId).catch(() => {});
  }, [userId]);

  const profile = useQuery({
    queryKey: ['social', 'member-profile', userId],
    queryFn: () => socialService.memberProfile(userId),
    enabled: Boolean(userId),
  });

  /** El perfil y el directorio cuentan lo mismo: se refrescan juntos. */
  async function refreshSocial() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['social', 'member-profile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['social', 'directory'] }),
      queryClient.invalidateQueries({ queryKey: ['social', 'connections'] }),
    ]);
  }

  const connect = useMutation({
    mutationFn: (addresseeId: string) => socialService.sendConnection(addresseeId),
    onSuccess: async () => {
      await refreshSocial();
      notify.success('Solicitud enviada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const message = useMutation({
    mutationFn: (otherUserId: string) => chatService.startConversation(otherUserId),
    onSuccess: (conversation) =>
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } }),
    onError: (error: Error) => notify.error(error.message),
  });

  const withdraw = useMutation({
    mutationFn: (connectionId: string) => socialService.withdrawConnection(connectionId),
    onSuccess: async () => {
      await refreshSocial();
      notify.success('Solicitud retirada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  if (profile.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={AVATAR_SIZE + spacing.xl} />
        <Skeleton height={180} />
        <Skeleton height={120} />
      </ScrollScreen>
    );
  }

  if (profile.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </ScrollScreen>
    );
  }

  const entry = profile.data;

  return (
    <ScrollScreen onRefresh={() => void profile.refetch()} refreshing={profile.isFetching}>
      <BackLink />

      <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
        {entry.photoUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: entry.photoUrl }}
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceHigh,
            }}
            transition={200}
          />
        ) : (
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.volt,
            }}
          >
            <Text style={{ color: colors.background, fontSize: fontSizes.xl, fontWeight: '700' }}>
              {initialsOf(entry.displayName, undefined)}
            </Text>
          </View>
        )}
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: semibold }}
        >
          {entry.displayName}
        </Text>
        {entry.levelCode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={colors.volt} name="trophy-outline" size={iconSizes.sm} />
            <Text style={{ color: colors.volt, fontSize: fontSizes.sm, fontWeight: semibold }}>
              {levelTitle(entry.levelCode)}
              {typeof entry.points === 'number'
                ? ` · ${entry.points.toLocaleString('es-ES')} pts`
                : ''}
            </Text>
          </View>
        ) : null}
        {entry.socialStatus ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {SOCIAL_STATUS_LABEL[entry.socialStatus]}
          </Text>
        ) : null}
      </View>

      <Card>
        {entry.objetivo ? (
          <Row
            icon="flag-outline"
            label="Objetivo"
            value={TRAINING_GOAL_LABEL[entry.objetivo] ?? entry.objetivo}
          />
        ) : null}
        {entry.branchName ? (
          <Row icon="business-outline" label="Sucursal" value={entry.branchName} />
        ) : null}
        {entry.gender ? (
          <Row
            icon="person-outline"
            label="Género"
            value={GENDER_LABEL[entry.gender] ?? entry.gender}
          />
        ) : null}
        {entry.experienceLevel ? (
          <Row
            icon="school-outline"
            label="Experiencia"
            value={EXPERIENCE_LEVEL_LABEL[entry.experienceLevel] ?? entry.experienceLevel}
          />
        ) : null}
        {typeof entry.points === 'number' ? (
          <Row
            icon="stats-chart-outline"
            label="Puntos"
            value={`${entry.points.toLocaleString('es-ES')} pts`}
          />
        ) : null}
      </Card>

      {entry.connectionStatus === 'NONE' ? (
        <Button
          icon="person-add-outline"
          label="Conectar"
          loading={connect.isPending}
          onPress={() => connect.mutate(entry.userId)}
        />
      ) : entry.connectionStatus === 'ACCEPTED' ? (
        <Button
          icon="chatbubble-outline"
          label="Enviar mensaje"
          loading={message.isPending}
          onPress={() => message.mutate(entry.userId)}
        />
      ) : entry.connectionStatus === 'PENDING_SENT' ? (
        <Button
          icon="close-circle-outline"
          label="Cancelar invitación de conexión"
          loading={withdraw.isPending}
          onPress={() => {
            if (entry.connectionId) withdraw.mutate(entry.connectionId);
          }}
          variant="ghost"
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.sm,
          }}
        >
          <Ionicons color={colors.volt} name="mail-unread-outline" size={iconSizes.sm} />
          <Text style={{ color: colors.volt, fontSize: fontSizes.sm, fontWeight: semibold }}>
            Te escribió — revisa Solicitudes
          </Text>
        </View>
      )}

      <Section icon="ribbon-outline" title={`Insignias · ${entry.badges.length}`}>
        {entry.badges.length ? (
          <View style={{ gap: spacing.sm }}>
            {entry.badges.map((badge) => (
              <BadgeTile badge={asProgressionBadge(badge)} key={badge.code} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="ribbon-outline"
            message="Todavía no ha conseguido ninguna. Las suyas aparecerán aquí cuando las gane."
            title="Sin insignias"
          />
        )}
      </Section>
    </ScrollScreen>
  );
}
