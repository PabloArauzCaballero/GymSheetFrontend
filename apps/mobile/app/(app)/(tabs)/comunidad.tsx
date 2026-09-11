import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { trainingGoals } from '@gymsheet/types';
import type { GymDirectoryEntry, PublicBranchSummary } from '@gymsheet/schemas';
import { chatService, facilitiesService, progressionService, socialService } from '@/api/services';
import { Card, ScrollScreen, Section } from '@/components/layout';
import { DirectoryCardFace, levelTitle } from '@/components/directory-card';
import { NavRow } from '@/components/list';
import { RankBadge } from '@/components/rank-badge';
import { StoriesBar } from '@/components/stories-bar';
import { Button, Input } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import {
  InteractionsBadge,
  interactionsAlertTotal,
  useInteractionCounts,
} from '@/components/interactions-counts';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { notify } from '@/notifications';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';

/**
 * Los iconos en la esquina, no un menú.
 *
 * La versión anterior aterrizaba en un panel con tres accesos — Directorio,
 * Solicitudes, Mis conexiones — antes de enseñar a una sola persona. Pablo
 * pidió Instagram fundido con Tinder: la gente aparece de entrada, con sus
 * filtros arriba, y los mensajes viven detrás de un ícono, no de un menú.
 *
 * Interacciones entra por la misma puerta y por la misma razón. Son las dos
 * bandejas de entrada de la parte social —lo que te han escrito y lo que han
 * hecho contigo— y las dos van donde ya se mira, en la esquina superior, no
 * detrás de una lista de opciones que habría que abrir para descubrir que hay
 * algo nuevo.
 */
function CommunityHeader({ onOpenPreferences }: { onOpenPreferences: () => void }) {
  const router = useRouter();
  // Mismo dato que alimenta la pestaña "Te escribieron" de Mensajes — el
  // punto solo dice que hay algo nuevo ahí, no cuánto ni de quién.
  const pending = useQuery({
    queryKey: ['social', 'connections', 'PENDING'],
    queryFn: () => socialService.listConnections('PENDING'),
    staleTime: 30_000,
  });
  const hasPendingReceived = (pending.data ?? []).some((connection) => connection.direction === 'RECEIVED');
  // Aquí sí un número y no un punto: «alguien te dio like» y «siete personas te
  // dieron like» piden entrar con urgencias distintas, y el dato ya existe.
  const counts = useInteractionCounts();
  const interactionsTotal = interactionsAlertTotal(counts.data);

  /**
   * Los iconos arriba y el título debajo, no los dos en la misma línea.
   *
   * Con dos iconos cabían al lado del título justo. Con el tercero ya no: tres
   * objetivos táctiles de 44 más sus huecos dejan al título unos 170 puntos, y
   * «Comunidad» a tamaño de display mide casi 200. Como es una sola palabra no
   * puede partirse, así que el resultado no era un salto de línea sino una
   * palabra recortada o desbordada — el mismo fallo que ya obligó a sacar
   * pestañas de la barra inferior.
   *
   * La salida no es encoger el título ni esconder un icono en un menú: es la
   * composición que usa el propio sistema para un título grande, con los
   * botones en la barra de encima. Los iconos siguen en la esquina, que es la
   * decisión de producto; lo único que cambia es que dejan de competir por el
   * mismo renglón.
   */
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
        <PressableScale
          accessibilityLabel="Preferencias de búsqueda"
          onPress={onOpenPreferences}
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.text} name="options-outline" size={iconSizes.lg} />
        </PressableScale>
        <PressableScale
          accessibilityLabel={
            interactionsTotal > 0
              ? `Interacciones, ${interactionsTotal} ${interactionsTotal === 1 ? 'novedad' : 'novedades'}`
              : 'Interacciones'
          }
          onPress={() => router.push('/interacciones')}
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.text} name="heart-outline" size={iconSizes.lg} />
          <InteractionsBadge total={interactionsTotal} />
        </PressableScale>
        <PressableScale
          accessibilityLabel="Mensajes y solicitudes"
          onPress={() => router.push('/comunidad-mensajes')}
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.text} name="chatbubbles-outline" size={iconSizes.lg} />
          {hasPendingReceived ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 10,
                height: 10,
                borderRadius: radii.full,
                backgroundColor: colors.volt,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            />
          ) : null}
        </PressableScale>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: fontSizes.display,
            fontWeight: semibold,
            letterSpacing: fontSizes.display * -0.03,
            lineHeight: fontSizes.display * 1.05,
          }}
        >
          Comunidad
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Socios de tu gimnasio, filtrados por lo que buscas.
        </Text>
      </View>
    </View>
  );
}

/**
 * Vista previa del podio: quien no entra a "Tu senda" nunca sabría que
 * existe. Tres filas, mismo idioma visual que la tabla completa, con un
 * toque que lleva ahí — no una copia del ranking, solo su puerta de entrada.
 */
function PodiumPreview() {
  const router = useRouter();
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', 'points', 'preview'],
    queryFn: () => progressionService.leaderboard(3, 'points'),
    staleTime: 60_000,
  });

  if (leaderboard.isPending) return <Skeleton height={132} />;
  if (leaderboard.isError || !leaderboard.data?.length) return null;

  return (
    <Card accessibilityLabel="Ver el podio completo" onPress={() => router.push('/trayectoria')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons color={colors.volt} name="podium-outline" size={iconSizes.md} />
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold, letterSpacing: fontSizes.md * -0.01 }}>
            Podio del gimnasio
          </Text>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
      </View>
      {leaderboard.data.map((entry) => (
        <View
          key={`${entry.position}-${entry.displayName}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <RankBadge isMe={entry.isMe} position={entry.position} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: entry.isMe ? colors.text : colors.textMuted,
              fontSize: fontSizes.sm,
              fontWeight: entry.isMe ? semibold : '400',
            }}
          >
            {entry.displayName}
            {entry.isMe ? ' · tú' : ''}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
            {entry.points.toLocaleString('es-ES')} pts
          </Text>
        </View>
      ))}
    </Card>
  );
}

const GOAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  HIPERTROFIA: 'barbell-outline',
  FUERZA: 'flash-outline',
  RESISTENCIA: 'infinite-outline',
  PERDIDA_GRASA: 'flame-outline',
  SALUD_GENERAL: 'heart-outline',
  REHABILITACION: 'medkit-outline',
};

function FilterChip({
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.border,
        backgroundColor: active ? colors.surfaceHigh : colors.surfaceLow,
      }}
    >
      <Ionicons color={active ? colors.text : colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text
        style={{
          color: active ? colors.text : colors.textMuted,
          fontSize: fontSizes.sm,
          fontWeight: active ? semibold : '400',
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

type DirectoryFilters = {
  objetivo: string | null;
  setObjetivo: (value: string | null) => void;
  sucursalId: string | null;
  setSucursalId: (value: string | null) => void;
  genero: string | null;
  setGenero: (value: string | null) => void;
};

/**
 * Todos los filtros de descubrimiento en un solo panel, detrás de un botón —
 * no ocupando la pantalla principal. Empieza con Objetivo, Sucursal y Género,
 * pero es el lugar donde cualquier filtro nuevo de "quién quiero ver" entra
 * sin volver a rediseñar la pantalla de Comunidad.
 */
function SearchPreferencesSheet({
  visible,
  onClose,
  filters,
  branches,
}: {
  visible: boolean;
  onClose: () => void;
  filters: DirectoryFilters;
  /**
   * La consulta entera, no sólo sus datos: si sólo llegara la lista, un fallo
   * de red y «mi gimnasio tiene una única sede» se verían igual — la sección
   * desaparecía en ambos casos y nadie podía reintentar.
   */
  branches: UseQueryResult<PublicBranchSummary[]>;
}) {
  const insets = useSafeAreaInsets();
  const { objetivo, setObjetivo, sucursalId, setSucursalId, genero, setGenero } = filters;
  const branchList = branches.data ?? [];

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.72)' }}>
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
            gap: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{ flex: 1, color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.5 }}
            >
              Preferencias de búsqueda
            </Text>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons color={colors.text} name="close" size={iconSizes.md} />
            </Pressable>
          </View>

          <Section icon="options-outline" title="Objetivo">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <FilterChip active={!objetivo} icon="apps-outline" label="Todos" onPress={() => setObjetivo(null)} />
              {trainingGoals.map((goal) => (
                <FilterChip
                  active={objetivo === goal}
                  icon={GOAL_ICON[goal] ?? 'flag-outline'}
                  key={goal}
                  label={TRAINING_GOAL_LABEL[goal] ?? goal}
                  onPress={() => setObjetivo(goal)}
                />
              ))}
            </View>
          </Section>

          <Section icon="business-outline" title="Sucursal">
            {branches.isPending ? (
              <Skeleton height={44} />
            ) : branches.isError ? (
              <ErrorState error={branches.error} onRetry={() => void branches.refetch()} />
            ) : branchList.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <FilterChip
                  active={!sucursalId}
                  icon="apps-outline"
                  label="Todos"
                  onPress={() => setSucursalId(null)}
                />
                {branchList.map((branch) => (
                  <FilterChip
                    active={sucursalId === branch.id}
                    icon="business-outline"
                    key={branch.id}
                    label={branch.nombre}
                    onPress={() => setSucursalId(branch.id)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="business-outline"
                message="Tu gimnasio tiene una sola sede, así que no hay nada entre lo que elegir."
                title="Una única sucursal"
              />
            )}
          </Section>

          <Section icon="male-female-outline" title="Género">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <FilterChip active={!genero} icon="apps-outline" label="Todos" onPress={() => setGenero(null)} />
              <FilterChip
                active={genero === 'MALE'}
                icon="male-outline"
                label="Hombre"
                onPress={() => setGenero('MALE')}
              />
              <FilterChip
                active={genero === 'FEMALE'}
                icon="female-outline"
                label="Mujer"
                onPress={() => setGenero('FEMALE')}
              />
            </View>
          </Section>

          <Button label="Listo" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Una persona, una tarjeta: la foto por delante, grande, y el resto como
 * contexto encima de ella — el lenguaje de una app de citas, sin su gesto de
 * arrastrar.
 *
 * La cara es la compartida con la baraja (`DirectoryCardFace`); lo propio de
 * Comunidad es lo de debajo: el botón que resuelve el estado de conexión.
 */
function DirectoryPersonCard({
  entry,
  index,
  onConnect,
  onMessage,
  onWithdraw,
  onViewProfile,
  connecting,
  messaging,
  withdrawing,
}: {
  entry: GymDirectoryEntry;
  index: number;
  onConnect: () => void;
  onMessage: () => void;
  onWithdraw: () => void;
  onViewProfile: () => void;
  connecting: boolean;
  messaging: boolean;
  withdrawing: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(320)
        .delay(Math.min(index, 6) * 60)
        .easing(Easing.out(Easing.cubic))}
      style={{
        borderRadius: radii.xl,
        overflow: 'hidden',
        backgroundColor: colors.surfaceLow,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* La misma cara que reparte la baraja de Descubrir; aquí la decisión no
          se arrastra, se pulsa, así que va envuelta en el acceso al perfil. */}
      <Pressable accessibilityLabel={`Ver perfil de ${entry.displayName}`} onPress={onViewProfile}>
        <DirectoryCardFace entry={entry} />
      </Pressable>

      <View style={{ padding: spacing.md }}>
        {entry.connectionStatus === 'NONE' ? (
          <Button
            icon="person-add-outline"
            label="Conectar"
            loading={connecting}
            onPress={onConnect}
            variant="primary"
          />
        ) : entry.connectionStatus === 'ACCEPTED' ? (
          <Button
            icon="chatbubble-outline"
            label="Enviar mensaje"
            loading={messaging}
            onPress={onMessage}
            variant="primary"
          />
        ) : entry.connectionStatus === 'PENDING_SENT' ? (
          <Button
            icon="close-circle-outline"
            label="Cancelar invitación de conexión"
            loading={withdrawing}
            onPress={onWithdraw}
            variant="ghost"
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm }}>
            <Ionicons color={colors.volt} name="mail-unread-outline" size={iconSizes.sm} />
            <Text style={{ color: colors.volt, fontSize: fontSizes.sm, fontWeight: semibold }}>
              Te escribió — revisa Solicitudes
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const ROW_AVATAR_SIZE = 52;

/**
 * La misma acción que el botón ancho de la tarjeta, reducida a su glifo: en una
 * fila el verbo no cabe, y el título de la fila ya dice de quién se trata.
 */
function DirectoryRowAction({
  icon,
  label,
  loading,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading: boolean;
  onPress: () => void;
  primary: boolean;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: primary ? colors.volt : colors.border,
        backgroundColor: primary ? colors.volt : colors.surfaceHigh,
      }}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.background : colors.text} size="small" />
      ) : (
        <Ionicons color={primary ? colors.background : colors.text} name={icon} size={iconSizes.md} />
      )}
    </PressableScale>
  );
}

/**
 * La otra mitad de la decisión: la tarjeta enseña a una persona por pantalla,
 * que es lo que quiere el modo de arrastrar, pero no sirve para recorrer el
 * gimnasio. Esta fila reutiliza `NavRow` — la misma que la lista de chats — y
 * cabe media docena de socios de golpe, con los mismos estados de conexión.
 */
function DirectoryPersonRow({
  entry,
  index,
  onConnect,
  onMessage,
  onWithdraw,
  onViewProfile,
  connecting,
  messaging,
  withdrawing,
}: {
  entry: GymDirectoryEntry;
  index: number;
  onConnect: () => void;
  onMessage: () => void;
  onWithdraw: () => void;
  onViewProfile: () => void;
  connecting: boolean;
  messaging: boolean;
  withdrawing: boolean;
}) {
  const subtitle =
    [
      entry.objetivo ? (TRAINING_GOAL_LABEL[entry.objetivo] ?? entry.objetivo) : null,
      entry.branchName,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;

  return (
    <Animated.View
      entering={FadeInDown.duration(280)
        .delay(Math.min(index, 8) * 40)
        .easing(Easing.out(Easing.cubic))}
    >
      <NavRow
        leading={
          entry.photoUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: entry.photoUrl }}
              style={{
                width: ROW_AVATAR_SIZE,
                height: ROW_AVATAR_SIZE,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
              }}
              transition={200}
            />
          ) : (
            <View
              style={{
                width: ROW_AVATAR_SIZE,
                height: ROW_AVATAR_SIZE,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.volt,
              }}
            >
              <Text style={{ color: colors.background, fontSize: fontSizes.md, fontWeight: '700' }}>
                {initialsOf(entry.displayName, undefined)}
              </Text>
            </View>
          )
        }
        meta={
          <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
            {entry.levelCode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons color={colors.volt} name="trophy-outline" size={iconSizes.sm} />
                <Text
                  numberOfLines={1}
                  style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: semibold }}
                >
                  {levelTitle(entry.levelCode)}
                  {typeof entry.points === 'number' ? ` · ${entry.points.toLocaleString('es-ES')} pts` : ''}
                </Text>
              </View>
            ) : null}
            {entry.connectionStatus === 'NONE' ? (
              <DirectoryRowAction
                icon="person-add-outline"
                label={`Conectar con ${entry.displayName}`}
                loading={connecting}
                onPress={onConnect}
                primary
              />
            ) : entry.connectionStatus === 'ACCEPTED' ? (
              <DirectoryRowAction
                icon="chatbubble-outline"
                label={`Enviar mensaje a ${entry.displayName}`}
                loading={messaging}
                onPress={onMessage}
                primary
              />
            ) : entry.connectionStatus === 'PENDING_SENT' ? (
              <DirectoryRowAction
                icon="close-circle-outline"
                label={`Cancelar invitación de conexión a ${entry.displayName}`}
                loading={withdrawing}
                onPress={onWithdraw}
                primary={false}
              />
            ) : (
              <View
                accessibilityLabel="Te escribió — revisa Solicitudes"
                accessible
                style={{
                  width: minTouchTarget,
                  height: minTouchTarget,
                  borderRadius: radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <Ionicons color={colors.volt} name="mail-unread-outline" size={iconSizes.md} />
              </View>
            )}
          </View>
        }
        onPress={onViewProfile}
        subtitle={subtitle}
        title={entry.displayName}
      />
    </Animated.View>
  );
}

/** Lista para recorrer el gimnasio, tarjetas para mirar a una persona. */
type DirectoryViewMode = 'list' | 'cards';

function DirectoryViewToggle({
  mode,
  onChange,
}: {
  mode: DirectoryViewMode;
  onChange: (mode: DirectoryViewMode) => void;
}) {
  const options: { value: DirectoryViewMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { value: 'list', icon: 'list-outline', label: 'Ver socios en lista' },
    { value: 'cards', icon: 'albums-outline', label: 'Ver socios en tarjetas' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.xs,
        padding: 2,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceLow,
      }}
    >
      {options.map((option) => {
        const active = mode === option.value;
        return (
          <PressableScale
            accessibilityLabel={active ? `${option.label} (activo)` : option.label}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              width: minTouchTarget,
              height: 34,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surfaceHigh : 'transparent',
            }}
          >
            <Ionicons
              color={active ? colors.text : colors.textMuted}
              name={option.icon}
              size={iconSizes.md}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function ComunidadScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [genero, setGenero] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [prefsVisible, setPrefsVisible] = useState(false);
  // La lista manda por defecto: es la que deja ver el gimnasio entero. Las
  // tarjetas son el modo de mirar a una persona, y serán las del gesto de
  // arrastrar. La preferencia vive en memoria — la app no guarda ninguna otra.
  const [viewMode, setViewMode] = useState<DirectoryViewMode>('list');
  /**
   * El `<Input>` conserva `q` para que el teclado responda a cada tecla; lo que
   * viaja a la API es este valor retrasado, porque antes cada pulsación cambiaba
   * la `queryKey` y salía una petición por letra.
   */
  const debouncedQ = useDebouncedValue(q.trim(), 250);
  const filters = useMemo(
    () => ({
      objetivo: objetivo ?? undefined,
      sucursalId: sucursalId ?? undefined,
      genero: genero ?? undefined,
      q: debouncedQ || undefined,
      limit: 50,
    }),
    [objetivo, sucursalId, genero, debouncedQ],
  );

  const directory = useQuery({
    queryKey: ['social', 'directory', objetivo ?? '', sucursalId ?? '', genero ?? '', debouncedQ],
    queryFn: () => socialService.directory(filters),
  });

  // Las sedes propias, no el directorio público: filtrar por una sede de otra
  // marca no puede devolver socios, porque `/me/gym-directory` está acotado al
  // gimnasio del usuario.
  const branches = useQuery({
    queryKey: ['facilities', 'my-branches'],
    queryFn: () => facilitiesService.myBranches(),
    staleTime: 5 * 60_000,
  });

  const connect = useMutation({
    mutationFn: (userId: string) => socialService.sendConnection(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'directory'] }),
        queryClient.invalidateQueries({ queryKey: ['social', 'connections'] }),
      ]);
      notify.success('Solicitud enviada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) =>
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } }),
    onError: (error: Error) => notify.error(error.message),
  });

  const withdraw = useMutation({
    mutationFn: (connectionId: string) => socialService.withdrawConnection(connectionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'directory'] }),
        queryClient.invalidateQueries({ queryKey: ['social', 'connections'] }),
      ]);
      notify.success('Solicitud retirada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  return (
    <ScrollScreen onRefresh={() => void directory.refetch()} refreshing={directory.isFetching}>
      <CommunityHeader onOpenPreferences={() => setPrefsVisible(true)} />

      <StoriesBar />

      <PodiumPreview />

      <Input
        autoCapitalize="none"
        autoCorrect={false}
        label="Buscar"
        onChangeText={setQ}
        placeholder="Nombre de un socio…"
        returnKeyType="search"
        value={q}
      />

      <SearchPreferencesSheet
        branches={branches}
        filters={{ objetivo, setObjetivo, sucursalId, setSucursalId, genero, setGenero }}
        onClose={() => setPrefsVisible(false)}
        visible={prefsVisible}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.xs,
            fontWeight: semibold,
            letterSpacing: fontSizes.xs * 0.1,
            textTransform: 'uppercase',
          }}
        >
          Socios
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {/* Tercera forma de mirar el mismo catálogo, pero no un modo de esta
              pantalla: la baraja se decide arrastrando y ocupa la pantalla
              entera, así que es un destino, no un ajuste del listado. Va junto
              al conmutador porque es donde se elige cómo mirar, y se lleva los
              filtros puestos para no reabrir un gimnasio recién acotado. */}
          <PressableScale
            accessibilityLabel="Descubrir socios uno a uno"
            onPress={() =>
              router.push({
                pathname: '/descubrir',
                params: {
                  objetivo: objetivo ?? undefined,
                  sucursalId: sucursalId ?? undefined,
                  genero: genero ?? undefined,
                },
              })
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              height: 38,
              paddingHorizontal: spacing.md,
              borderRadius: radii.full,
              borderWidth: 1,
              borderColor: colors.volt,
              backgroundColor: colors.surfaceLow,
            }}
          >
            <Ionicons color={colors.volt} name="flame-outline" size={iconSizes.md} />
            <Text style={{ color: colors.volt, fontSize: fontSizes.sm, fontWeight: semibold }}>
              Descubrir
            </Text>
          </PressableScale>
          <DirectoryViewToggle mode={viewMode} onChange={setViewMode} />
        </View>
      </View>

      {directory.isPending ? (
        <Skeleton height={viewMode === 'cards' ? 420 : 220} />
      ) : directory.isError ? (
        <ErrorState error={directory.error} onRetry={() => void directory.refetch()} />
      ) : directory.data?.length ? (
        <View style={{ gap: viewMode === 'cards' ? spacing.md : 0 }}>
          {directory.data.map((entry, index) => {
            const shared = {
              connecting: connect.isPending && connect.variables === entry.userId,
              entry,
              index,
              messaging: message.isPending && message.variables === entry.userId,
              onConnect: () => connect.mutate(entry.userId),
              onMessage: () => message.mutate(entry.userId),
              onViewProfile: () =>
                router.push({
                  pathname: '/perfil/[userId]' as const,
                  params: {
                    userId: entry.userId,
                    displayName: entry.displayName,
                    photoUrl: entry.photoUrl ?? undefined,
                    objetivo: entry.objetivo ?? undefined,
                    branchName: entry.branchName ?? undefined,
                  },
                }),
              onWithdraw: () => {
                if (entry.connectionId) withdraw.mutate(entry.connectionId);
              },
              withdrawing: withdraw.isPending && withdraw.variables === entry.connectionId,
            };

            return viewMode === 'cards' ? (
              <DirectoryPersonCard key={entry.userId} {...shared} />
            ) : (
              <DirectoryPersonRow key={entry.userId} {...shared} />
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="people-outline"
          message="Ajusta los filtros o vuelve más tarde."
          title="Sin resultados"
        />
      )}
    </ScrollScreen>
  );
}
