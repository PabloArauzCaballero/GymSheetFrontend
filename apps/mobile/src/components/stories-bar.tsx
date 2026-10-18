import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { profilePhotosService, socialService, storiesService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { StoryViewer } from '@/components/story-viewer';
import { StoryComposer } from '@/components/story-composer';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { initialsOf } from '@/lib/format';
import { requestId } from '@/lib/request-id';
import { canSubmitStoryAudience, toggleStoryAudienceRecipient } from '@/lib/story-audience-selection';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, overlay, radii, spacing } from '@/theme';

const AVATAR_SIZE = 60;
/** Diámetro del botón «+» sobre el avatar propio. */
const ADD_BADGE_SIZE = 22;

/**
 * Lo que le falta al «+» para llegar al objetivo táctil del proyecto.
 *
 * Se ve de 22pt —crecerlo lo convertiría en un botón y no en una insignia— pero
 * se toca como 44: `minTouchTarget` no es una recomendación, y este control lo
 * necesita más que ningún otro, porque cuando ya tienes una story activa el
 * pulsable de encima abre el visor y el «+» es el ÚNICO camino para publicar
 * otra.
 *
 * El reparto es asimétrico a propósito: hacia la derecha el margen no serviría
 * de nada —Android descarta los toques que caen fuera del padre, y ahí ya está
 * el borde de la columna—, así que los 22pt que faltan de ancho se toman hacia
 * dentro, sobre el anillo. Vertical: 11 y 11, que sí caben en la columna.
 */
const ADD_BADGE_HIT_SLOP = {
  top: (minTouchTarget - ADD_BADGE_SIZE) / 2,
  bottom: (minTouchTarget - ADD_BADGE_SIZE) / 2,
  left: minTouchTarget - ADD_BADGE_SIZE,
  right: 0,
} as const;

/**
 * El anillo, en tres capas concéntricas.
 *
 * Un `borderWidth` de color plano —lo que había— se lee como un marco; el
 * anillo de Instagram se lee como un aro *separado* de la foto, y esa lectura
 * la produce el hueco, no el grosor. De fuera adentro:
 *
 *   1. `RING_WIDTH` de degradado,
 *   2. `RING_GAP` del color del fondo, que es el hueco,
 *   3. la foto, que sigue midiendo 60pt.
 *
 * De ahí que sean tres vistas superpuestas y no un borde: un borde no puede
 * tener un hueco por dentro.
 */
const RING_WIDTH = 3;
const RING_GAP = 3;
const RING_OUTER = AVATAR_SIZE + (RING_WIDTH + RING_GAP) * 2;
const RING_INNER = AVATAR_SIZE + RING_GAP * 2;

/** Ancho de la columna de cada persona en la tira. */
const COLUMN_WIDTH = RING_OUTER + 4;

/** Estado del anillo: hay algo sin ver, ya se vio todo, o no hay story. */
type RingState = 'unviewed' | 'viewed' | 'none';

/**
 * Degradado del anillo, derivado de la paleta del inquilino.
 *
 * Se replica el *patrón* de Instagram, no su marca: nada de rosa-naranja. Los
 * tres tonos salen del acento activo —claro, pleno y apagado— así que el anillo
 * cambia con el gimnasio igual que el resto de la interfaz. Se calcula en cada
 * render a propósito: `colors.volt` se reescribe al cambiar de marca y guardarlo
 * en una constante de módulo lo congelaría en el acento de referencia.
 */
function ringGradient(): readonly [string, string, string] {
  return [accentPolicy.ink, colors.volt, colors.voltDim];
}

function StoryRing({
  photoUrl,
  fullName,
  state,
}: {
  photoUrl: string | null;
  fullName: string;
  state: RingState;
}) {
  return (
    <View style={{ width: RING_OUTER, height: RING_OUTER, alignItems: 'center', justifyContent: 'center' }}>
      {/* Capa 1 — el aro. Con todo visto es un gris apagado y no «nada»: que
          alguien tenga story y ya la hayas visto es información, y sin anillo
          esa persona se confunde con quien no ha publicado. */}
      {state === 'unviewed' ? (
        <LinearGradient
          colors={ringGradient()}
          end={{ x: 0.9, y: 0 }}
          start={{ x: 0.1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radii.full }]}
        />
      ) : state === 'viewed' ? (
        <View
          style={[StyleSheet.absoluteFill, { borderRadius: radii.full, backgroundColor: colors.surfaceHighest }]}
        />
      ) : null}

      {/* Capa 2 — el hueco, del color del fondo de la pantalla. */}
      <View
        style={{
          width: RING_INNER,
          height: RING_INNER,
          borderRadius: radii.full,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Capa 3 — la foto. */}
        {photoUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: photoUrl }}
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceHigh,
            }}
          />
        ) : (
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceHigh,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700' }}>
              {initialsOf(fullName, undefined)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * De dónde sale la foto: cámara o galería.
 *
 * Una hoja inferior y no un menú porque son dos acciones del mismo rango, y
 * porque «subir una story» empieza casi siempre por la cámara — la app tiene
 * que poder abrirla sin pasar por el carrete. Mismo patrón que la hoja de
 * preferencias de Comunidad.
 */
function StorySourceSheet({
  visible,
  onClose,
  onCamera,
  onLibrary,
  audienceMode,
  onAudienceModeChange,
  recipientIds,
  onRecipientsChange,
  disabled,
}: {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  audienceMode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';
  onAudienceModeChange: (mode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS') => void;
  recipientIds: string[];
  onRecipientsChange: (update: (current: string[]) => string[]) => void;
  disabled: boolean;
}) {
  const insets = useSafeAreaInsets();
  const connections = useQuery({
    queryKey: ['connections', 'accepted-for-stories'],
    queryFn: () => socialService.listConnections('ACCEPTED'),
    enabled: visible,
  });
  const connectionsState = connections.isPending || connections.isFetching
    ? 'loading'
    : connections.isError ? 'error' : 'loaded';
  const selectionIncomplete = !canSubmitStoryAudience(audienceMode, recipientIds, connectionsState);

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrim }}>
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{ flex: 1, color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.5 }}
            >
              Nueva story
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

          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
            Se verá durante 24 horas para tus conexiones aceptadas.
          </Text>

          <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
            {([
              ['ALL_CONNECTIONS', 'Todas mis conexiones aceptadas'],
              ['SELECTED_CONNECTIONS', 'Solo personas elegidas'],
            ] as const).map(([mode, label]) => (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="radio"
                accessibilityState={{ checked: audienceMode === mode }}
                key={mode}
                onPress={() => onAudienceModeChange(mode)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
              >
                <Ionicons
                  color={audienceMode === mode ? accentPolicy.ink : colors.textMuted}
                  name={audienceMode === mode ? 'radio-button-on' : 'radio-button-off'}
                  size={iconSizes.md}
                />
                <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {audienceMode === 'SELECTED_CONNECTIONS' ? (
            <ScrollView accessibilityLabel="Personas que pueden ver la story" style={{ maxHeight: 180 }}>
              {connections.isLoading ? (
                <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted }}>Cargando conexiones…</Text>
              ) : connections.isError ? (
                <View accessibilityRole="alert" style={{ alignItems: 'flex-start', gap: spacing.xs }}>
                  <Text style={{ color: colors.textMuted }}>No se pudieron cargar las conexiones.</Text>
                  <Button
                    accessibilityLabel="Reintentar cargar conexiones aceptadas"
                    label="Reintentar"
                    loading={connections.isFetching}
                    onPress={() => void connections.refetch()}
                    variant="ghost"
                  />
                </View>
              ) : connections.data?.length ? connections.data.map((connection) => {
                const checked = recipientIds.includes(connection.otherUserId);
                return (
                  <Pressable
                    accessibilityLabel={connection.otherUserName}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    key={connection.otherUserId}
                    onPress={() => onRecipientsChange((current) => toggleStoryAudienceRecipient(
                      current,
                      connection.otherUserId,
                      !checked,
                    ))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
                  >
                    <Ionicons color={checked ? accentPolicy.ink : colors.textMuted} name={checked ? 'checkbox' : 'square-outline'} size={iconSizes.md} />
                    <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>{connection.otherUserName}</Text>
                  </Pressable>
                );
              }) : <Text style={{ color: colors.textMuted }}>Todavía no tienes conexiones aceptadas.</Text>}
              {recipientIds.length === 0 ? (
                <Text style={{ color: colors.textMuted, paddingVertical: spacing.xs }}>Elige al menos una persona para continuar.</Text>
              ) : null}
            </ScrollView>
          ) : null}

          <Button disabled={disabled || selectionIncomplete} icon="camera-outline" label="Hacer una foto o un vídeo" onPress={onCamera} />
          <Button disabled={disabled || selectionIncomplete} icon="images-outline" label="Elegir de la galería" onPress={onLibrary} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Qué se deja subir: foto o vídeo, como en la web.
 *
 * Estuvo restringido a imágenes mientras la app no tenía reproductor: un vídeo
 * publicado desde el navegador quedaba inconsumible en el teléfono. Desde que
 * `story-viewer.tsx` monta `expo-video` —reproduce dentro de la app, silenciado
 * por defecto y con la barra siguiendo la duración real del clip— esa razón
 * desapareció y las dos plataformas admiten lo mismo. `livePhotos` queda fuera
 * a propósito: el backend recibiría la foto y perdería el vídeo emparejado.
 */
const STORY_MEDIA_TYPES: ImagePicker.MediaType[] = ['images', 'videos'];

/**
 * Tope de grabación, en segundos.
 *
 * 15 s es el tramo de una story y el mismo respaldo que usan los dos visores
 * cuando un clip no declara duración, así que grabando desde la app no se puede
 * producir algo más largo de lo que la barra sabe representar sin medirlo.
 *
 * `videoMaxDuration` sólo gobierna la GRABACIÓN (así lo documenta
 * `expo-image-picker`): un vídeo ya existente que se elija del carrete puede
 * durar más, y eso está bien — el visor mide la duración real y el tramo se
 * ajusta. El tope duro de lo que se puede publicar lo pone el backend por
 * tamaño (`CHAT_MEDIA_MAX_BYTES`), y su error llega tal cual al aviso.
 */
const STORY_VIDEO_MAX_SECONDS = 15;

/** Lo que el backend espera en el multipart, salga de la cámara o del carrete. */
function fileFromAsset(asset: ImagePicker.ImagePickerAsset): { uri: string; name: string; mimeType: string } {
  const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
  return {
    uri: asset.uri,
    name: asset.fileName ?? (isVideo ? 'story.mp4' : 'story.jpg'),
    mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
  };
}

/**
 * Tira horizontal de stories arriba de Comunidad — mismo lenguaje que
 * Instagram/WhatsApp: la propia primero (con "+" si no hay una activa),
 * después el resto del tenant, con anillo si tiene algo sin ver.
 */
export function StoriesBar() {
  const queryClient = useQueryClient();
  const principal = useAuthStore((state) => state.principal);
  /** Por quién se abre el visor; `null` es «cerrado». */
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [sourceVisible, setSourceVisible] = useState(false);
  const [audienceMode, setAudienceMode] = useState<'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS'>('ALL_CONNECTIONS');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const uploadAttemptRef = useRef<{
    file: { uri: string; name: string; mimeType: string };
    requestId: string;
    mode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';
    recipients: string[];
    caption: string | null;
  } | null>(null);
  /** Lo elegido en cámara o carrete, esperando el «Compartir» de la vista previa. */
  const [draft, setDraft] = useState<{
    file: { uri: string; name: string; mimeType: string };
    isVideo: boolean;
    mode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';
    recipients: string[];
  } | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);

  const feed = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: () => storiesService.feed(),
    staleTime: 30_000,
    // Sin sondeo con el visor abierto: cada respuesta nueva re-renderizaba el
    // visor entero en mitad de un vídeo. El feed se refresca al cerrar el visor,
    // al publicar o borrar, y con el gesto de refrescar de Comunidad.
  });
  const myPhotos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });
  const myPhotoUrl = myPhotos.data?.[0]?.url ?? null;
  const myFullName = principal?.nombreCompleto ?? '';
  const currentUserId = principal?.id;

  const upload = useMutation({
    mutationFn: (attempt: NonNullable<typeof uploadAttemptRef.current>) => storiesService.upload(attempt.file, {
      mode: attempt.mode,
      recipientIds: attempt.recipients,
      requestId: attempt.requestId,
    }, attempt.caption),
    onSuccess: async () => {
      uploadAttemptRef.current = null;
      setUploadFailed(false);
      await queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
      notify.success('Story publicada — estará visible 24 horas.');
    },
    onError: (error: Error) => {
      setUploadFailed(true);
      notify.error(error.message);
    },
  });

  function retryUpload() {
    const attempt = uploadAttemptRef.current;
    if (attempt && !upload.isPending) upload.mutate(attempt);
  }

  function openSourceSheet() {
    // Una subida a la vez: sin esto, pulsar «+» tres veces lanza tres stories.
    if (upload.isPending) return;
    setAudienceMode('ALL_CONNECTIONS');
    setRecipientIds([]);
    setSourceVisible(true);
  }

  function submitPicked(result: ImagePicker.ImagePickerResult) {
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;
    const file = fileFromAsset(asset);
    setDraft({
      file,
      isVideo: file.mimeType.startsWith('video/'),
      mode: audienceMode,
      recipients: [...recipientIds],
    });
  }

  function publishDraft(caption: string | null) {
    if (!draft) return;
    const attempt = {
      file: draft.file,
      requestId: requestId(),
      mode: draft.mode,
      recipients: draft.recipients,
      caption,
    };
    setDraft(null);
    uploadAttemptRef.current = attempt;
    setUploadFailed(false);
    upload.mutate(attempt);
  }

  async function handleFromCamera() {
    // La hoja se cierra ANTES de lanzar el selector: en iOS un picker nativo
    // presentado sobre un Modal abierto no llega a aparecer.
    setSourceVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a la cámara para publicar una story.');
      return;
    }
    submitPicked(
      await ImagePicker.launchCameraAsync({
        mediaTypes: STORY_MEDIA_TYPES,
        quality: 0.85,
        videoMaxDuration: STORY_VIDEO_MAX_SECONDS,
      }),
    );
  }

  async function handleFromLibrary() {
    setSourceVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a la galería para publicar una story.');
      return;
    }
    submitPicked(await ImagePicker.launchImageLibraryAsync({ mediaTypes: STORY_MEDIA_TYPES, quality: 0.85 }));
  }

  /**
   * El feed tal y como llega, con una sola corrección: la propia primero.
   *
   * El backend ya devuelve las stories de los matches en el orden de Instagram
   * (sin ver primero, luego por recencia) y **aquí no se reordena nada**: mover
   * la propia al frente es lo único que la tira necesita para pintarse, porque
   * la columna de «Tu historia» va aparte. Se descarta a quien no tenga ninguna
   * story activa: una columna sin contenido no es pulsable.
   */
  const entries = useMemo(() => {
    const all = (feed.data ?? []).filter((entry) => entry.stories.length > 0);
    const mine = all.filter((entry) => entry.userId === currentUserId);
    const others = all.filter((entry) => entry.userId !== currentUserId);
    return [...mine, ...others];
  }, [currentUserId, feed.data]);
  const myEntry = entries.find((entry) => entry.userId === currentUserId);
  const otherEntries = entries.filter((entry) => entry.userId !== currentUserId);

  /**
   * Cerrar es desmontar el visor, no ocultarlo: así no queda ni un temporizador
   * suyo vivo, y la próxima apertura empieza limpia en vez de heredar el índice
   * de la anterior.
   */
  const closeViewer = useCallback(() => {
    setOpenUserId(null);
    void queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
  }, [queryClient]);

  return (
    <>
      {feed.isPending ? (
        <Skeleton height={RING_OUTER + 20} />
      ) : feed.isError ? (
        // Sin esto una caída de red se leía como «nadie ha publicado nada».
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }} horizontal showsHorizontalScrollIndicator={false}>
          {/* Los dos pulsables son hermanos, no uno dentro de otro: en Android
              el padre se queda con el toque destinado al hijo, y el «+» dejaba
              de responder justo en la acción que la tira existe para ofrecer. */}
          <View style={{ alignItems: 'center', gap: 4, width: COLUMN_WIDTH }}>
            <PressableScale
              accessibilityLabel={myEntry ? 'Ver tu story' : 'Publicar una story'}
              haptic="none"
              onPress={() => (myEntry ? setOpenUserId(myEntry.userId) : openSourceSheet())}
              scaleTo={0.94}
            >
              <StoryRing
                fullName={myFullName}
                photoUrl={myPhotoUrl}
                state={!myEntry ? 'none' : myEntry.hasUnviewed ? 'unviewed' : 'viewed'}
              />
            </PressableScale>
            <Text
              accessibilityLiveRegion="polite"
              numberOfLines={1}
              style={{ color: colors.textMuted, fontSize: fontSizes.xs, maxWidth: COLUMN_WIDTH }}
            >
              {upload.isPending ? 'Publicando…' : 'Tu historia'}
            </Text>
            {uploadFailed ? (
              <Pressable accessibilityRole="button" onPress={retryUpload}>
                <Text style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: '700', textDecorationLine: 'underline' }}>
                  Reintentar subida
                </Text>
              </Pressable>
            ) : null}
            <PressableScale
              accessibilityLabel={upload.isPending ? 'Publicando story…' : 'Agregar story'}
              accessibilityState={{ disabled: upload.isPending, busy: upload.isPending }}
              disabled={upload.isPending}
              hitSlop={ADD_BADGE_HIT_SLOP}
              onPress={openSourceSheet}
              scaleTo={0.88}
              style={{
                position: 'absolute',
                // Esquina inferior derecha del anillo, desbordándolo 2pt.
                top: RING_OUTER + 2 - ADD_BADGE_SIZE,
                right: 0,
                width: ADD_BADGE_SIZE,
                height: ADD_BADGE_SIZE,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.volt,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            >
              {upload.isPending ? (
                <ActivityIndicator color={colors.background} size="small" style={{ transform: [{ scale: 0.7 }] }} />
              ) : (
                <Ionicons color={colors.background} name="add" size={14} />
              )}
            </PressableScale>
          </View>

          {otherEntries.map((entry) => (
            <PressableScale
              // El estado del anillo es visual; para un lector de pantalla hay
              // que decirlo con palabras o no existe.
              accessibilityLabel={`Ver story de ${entry.fullName}${entry.hasUnviewed ? ', sin ver' : ''}`}
              haptic="none"
              key={entry.userId}
              onPress={() => setOpenUserId(entry.userId)}
              scaleTo={0.94}
              style={{ alignItems: 'center', gap: 4, width: COLUMN_WIDTH }}
            >
              <StoryRing
                fullName={entry.fullName}
                photoUrl={entry.photoUrl}
                state={entry.hasUnviewed ? 'unviewed' : 'viewed'}
              />
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs, maxWidth: COLUMN_WIDTH }}>
                {entry.fullName.split(' ')[0]}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}

      <StorySourceSheet
        audienceMode={audienceMode}
        disabled={upload.isPending}
        onCamera={() => void handleFromCamera()}
        onClose={() => setSourceVisible(false)}
        onAudienceModeChange={setAudienceMode}
        onRecipientsChange={setRecipientIds}
        onLibrary={() => void handleFromLibrary()}
        recipientIds={recipientIds}
        visible={sourceVisible}
      />

      {draft ? (
        <StoryComposer
          audienceLabel={draft.mode === 'ALL_CONNECTIONS'
            ? 'Todas tus conexiones'
            : draft.recipients.length === 1 ? '1 persona' : `${draft.recipients.length} personas`}
          draft={{ uri: draft.file.uri, isVideo: draft.isVideo }}
          onCancel={() => setDraft(null)}
          onPublish={publishDraft}
        />
      ) : null}

      {/* El visor recibe el feed entero y por quién empezar, no una entrada
          suelta: sin el resto no podría pasar a la siguiente persona al acabar
          las stories de ésta. Montado sólo mientras está abierto. */}
      {openUserId ? (
        <StoryViewer feed={entries} onClose={closeViewer} startUserId={openUserId} />
      ) : null}
    </>
  );
}
