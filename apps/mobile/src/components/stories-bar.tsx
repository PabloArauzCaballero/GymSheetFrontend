import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { StoryFeedEntry } from '@gymsheet/schemas';
import { profilePhotosService, storiesService } from '@/api/services';
import { StoryViewer } from '@/components/story-viewer';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { initialsOf } from '@/lib/format';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

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
}: {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.72)' }}>
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
            Se verá 24 horas para el resto del gimnasio.
          </Text>

          <Button icon="camera-outline" label="Hacer una foto" onPress={onCamera} />
          <Button icon="images-outline" label="Elegir de la galería" onPress={onLibrary} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Qué se deja subir: sólo imágenes, y es una limitación temporal.
 *
 * La app no tiene reproductor de vídeo —no hay `expo-av`, `expo-video` ni
 * `react-native-video` instalados—, así que el visor no puede reproducir lo que
 * se suba: un vídeo se abría como quince segundos de pantalla negra con un
 * botón de play. Pedir `['images', 'videos']` era invitar a publicar algo que
 * la app no sabe enseñar, y el que peor lo pasaba era quien publicaba, porque
 * su story quedaba rota para todo el gimnasio sin que él llegara a verlo.
 *
 * Para levantar la restricción: instalar `expo-video`, reproducir el vídeo en
 * `story-viewer.tsx` (donde hoy hay un cartel de «se abre fuera de la app»),
 * pasar la duración del tramo a la real del clip en vez del tope fijo, y
 * devolver aquí `['images', 'videos']`. Mientras tanto, `fileFromAsset` sigue
 * sabiendo empaquetar vídeo: los que ya están en el feed se siguen sirviendo.
 */
const STORY_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

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

  const feed = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: () => storiesService.feed(),
    staleTime: 30_000,
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
    mutationFn: (file: { uri: string; name: string; mimeType: string }) => storiesService.upload(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
      notify.success('Story publicada — estará visible 24 horas.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  function openSourceSheet() {
    // Una subida a la vez: sin esto, pulsar «+» tres veces lanza tres stories.
    if (upload.isPending) return;
    setSourceVisible(true);
  }

  function submitPicked(result: ImagePicker.ImagePickerResult) {
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;
    upload.mutate(fileFromAsset(asset));
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
    submitPicked(await ImagePicker.launchCameraAsync({ mediaTypes: STORY_MEDIA_TYPES, quality: 0.85 }));
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
            <Pressable
              accessibilityLabel={myEntry ? 'Ver tu story' : 'Publicar una story'}
              accessibilityRole="button"
              onPress={() => (myEntry ? setOpenUserId(myEntry.userId) : openSourceSheet())}
            >
              <StoryRing
                fullName={myFullName}
                photoUrl={myPhotoUrl}
                state={!myEntry ? 'none' : myEntry.hasUnviewed ? 'unviewed' : 'viewed'}
              />
            </Pressable>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs, maxWidth: COLUMN_WIDTH }}>
              Tu historia
            </Text>
            <Pressable
              accessibilityLabel={upload.isPending ? 'Publicando story…' : 'Agregar story'}
              accessibilityRole="button"
              accessibilityState={{ disabled: upload.isPending, busy: upload.isPending }}
              disabled={upload.isPending}
              hitSlop={ADD_BADGE_HIT_SLOP}
              onPress={openSourceSheet}
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
            </Pressable>
          </View>

          {otherEntries.map((entry) => (
            <Pressable
              // El estado del anillo es visual; para un lector de pantalla hay
              // que decirlo con palabras o no existe.
              accessibilityLabel={`Ver story de ${entry.fullName}${entry.hasUnviewed ? ', sin ver' : ''}`}
              accessibilityRole="button"
              key={entry.userId}
              onPress={() => setOpenUserId(entry.userId)}
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
            </Pressable>
          ))}
        </ScrollView>
      )}

      <StorySourceSheet
        onCamera={() => void handleFromCamera()}
        onClose={() => setSourceVisible(false)}
        onLibrary={() => void handleFromLibrary()}
        visible={sourceVisible}
      />

      {/* El visor recibe el feed entero y por quién empezar, no una entrada
          suelta: sin el resto no podría pasar a la siguiente persona al acabar
          las stories de ésta. Montado sólo mientras está abierto. */}
      {openUserId ? (
        <StoryViewer feed={entries} onClose={closeViewer} startUserId={openUserId} />
      ) : null}
    </>
  );
}
