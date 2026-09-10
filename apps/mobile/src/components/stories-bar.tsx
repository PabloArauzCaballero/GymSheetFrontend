import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { StoryFeedEntry } from '@gymsheet/schemas';
import { profilePhotosService, storiesService } from '@/api/services';
import { StoryViewer } from '@/components/story-viewer';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

const AVATAR_SIZE = 60;
/** Diámetro del botón «+» sobre el avatar propio. */
const ADD_BADGE_SIZE = 22;

function RingedAvatar({ photoUrl, fullName, ringed }: { photoUrl: string | null; fullName: string; ringed: boolean }) {
  return (
    <View
      style={{
        width: AVATAR_SIZE + 6,
        height: AVATAR_SIZE + 6,
        borderRadius: radii.full,
        borderWidth: ringed ? 2.5 : 0,
        borderColor: ringed ? colors.volt : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: photoUrl }}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
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
          <Text style={{ color: colors.background, fontSize: fontSizes.md, fontWeight: '700' }}>
            {initialsOf(fullName, undefined)}
          </Text>
        </View>
      )}
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
  const [viewingEntry, setViewingEntry] = useState<StoryFeedEntry | null>(null);
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
    submitPicked(await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 }));
  }

  async function handleFromLibrary() {
    setSourceVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a la galería para publicar una story.');
      return;
    }
    submitPicked(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 }));
  }

  const entries = feed.data ?? [];
  const myEntry = entries.find((entry) => entry.userId === currentUserId);
  const otherEntries = entries.filter((entry) => entry.userId !== currentUserId);

  return (
    <>
      {feed.isPending ? (
        <Skeleton height={AVATAR_SIZE + 26} />
      ) : feed.isError ? (
        // Sin esto una caída de red se leía como «nadie ha publicado nada».
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }} horizontal showsHorizontalScrollIndicator={false}>
          {/* Los dos pulsables son hermanos, no uno dentro de otro: en Android
              el padre se queda con el toque destinado al hijo, y el «+» dejaba
              de responder justo en la acción que la tira existe para ofrecer. */}
          <View style={{ alignItems: 'center', gap: 4, width: AVATAR_SIZE + 16 }}>
            <Pressable
              accessibilityLabel={myEntry ? 'Ver tu story' : 'Publicar una story'}
              accessibilityRole="button"
              onPress={() => (myEntry ? setViewingEntry(myEntry) : openSourceSheet())}
            >
              <RingedAvatar fullName={myFullName} photoUrl={myPhotoUrl} ringed={Boolean(myEntry?.hasUnviewed)} />
            </Pressable>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs, maxWidth: AVATAR_SIZE + 16 }}>
              Tu historia
            </Text>
            <Pressable
              accessibilityLabel={upload.isPending ? 'Publicando story…' : 'Agregar story'}
              accessibilityRole="button"
              accessibilityState={{ disabled: upload.isPending, busy: upload.isPending }}
              disabled={upload.isPending}
              onPress={openSourceSheet}
              style={{
                position: 'absolute',
                // Esquina inferior derecha del anillo (alto AVATAR_SIZE + 6),
                // desbordándolo 2pt como cuando era su hijo.
                top: AVATAR_SIZE + 8 - ADD_BADGE_SIZE,
                right: 3,
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
              accessibilityLabel={`Ver story de ${entry.fullName}`}
              accessibilityRole="button"
              key={entry.userId}
              onPress={() => setViewingEntry(entry)}
              style={{ alignItems: 'center', gap: 4, width: AVATAR_SIZE + 16 }}
            >
              <RingedAvatar fullName={entry.fullName} photoUrl={entry.photoUrl} ringed={entry.hasUnviewed} />
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs, maxWidth: AVATAR_SIZE + 16 }}>
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

      <StoryViewer
        entry={viewingEntry}
        onClose={() => {
          setViewingEntry(null);
          void queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
        }}
      />
    </>
  );
}
