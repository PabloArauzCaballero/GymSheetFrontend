import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View, findNodeHandle } from 'react-native';
import { PressableScale } from '@/components/motion';
import { PhotoSourceSheet, type PhotoSource } from '@/components/photo-source-sheet';
import { profilePhotosService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { notify } from '@/notifications';
import { Text } from '@/components/text';
import { colors, iconSizes, overlay, radii, spacing } from '@/theme';

const MAX_PHOTOS = 6;
const THUMB_SIZE = 92;

/**
 * Galería de fotos de perfil. No existía ni un avatar único antes de esto —
 * el perfil solo mostraba iniciales.
 *
 * Mismo límite y mismo texto que en el portal web.
 */
/** `header`: first row inside the card (the edit screen puts the pending «+N pts» there, like every section). */
export function ProfilePhotoGallery({ header }: { header?: ReactNode } = {}) {
  const queryClient = useQueryClient();
  const photos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
  });

  const upload = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType: string }) =>
      profilePhotosService.upload(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', 'photos'] });
      notify.success('Foto agregada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const remove = useMutation({
    mutationFn: (photoId: string) => profilePhotosService.remove(photoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', 'photos'] });
      notify.success('Foto eliminada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  // The system picker takes VoiceOver focus; when it closes (picked, cancelled or denied) focus goes back to
  // «Agregar foto», as the web dialog returns it to its opener, instead of restarting at the top of the screen.
  const addRef = useRef<View>(null);
  const [choosing, setChoosing] = useState(false);
  const refocusAdd = () => {
    const handle = findNodeHandle(addRef.current);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  };
  const pickAndUpload = async (source: PhotoSource) => {
    const result = await pick(source);
    refocusAdd();
    if (!result || result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    upload.mutate({
      uri: asset.uri,
      name: asset.fileName ?? 'foto.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const pick = async (source: PhotoSource) => {
    const camera = source === 'camera';
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error(camera ? 'Necesitas dar permiso para usar la cámara.' : 'Necesitas dar permiso para acceder a tus fotos.');
      return null;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1] };
    return camera ? ImagePicker.launchCameraAsync(options) : ImagePicker.launchImageLibraryAsync(options);
  };

  const count = photos.data?.length ?? 0;
  const atLimit = count >= MAX_PHOTOS;

  return (
    <Section title="Fotos de perfil">
      {photos.isPending ? (
        <Skeleton height={THUMB_SIZE} />
      ) : photos.isError ? (
        <ErrorState error={photos.error} onRetry={() => void photos.refetch()} />
      ) : (
        <Card>
          {header}
          {/* The limit said before it is hit, as on the web card. */}
          <Text tone="muted" variant="subhead">{`Hasta ${MAX_PHOTOS} fotos. ${count}/${MAX_PHOTOS} usadas.`}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(photos.data ?? []).map((photo) => (
              <View key={photo.id} style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
                <Image
                  cachePolicy="memory-disk"
                  recyclingKey={photo.url}
                  source={{ uri: photo.url }}
                  style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceHigh,
                  }}
                />
                <PressableScale
                  accessibilityLabel="Eliminar foto"
                  disabled={remove.isPending}
                  haptic="none"
                  hitSlop={10}
                  onPress={() => remove.mutate(photo.id)}
                  scaleTo={0.88}
                  // Same corner, disc and glyph as the web tile (28 px trash disc, 8 px in); hitSlop makes it 44.
                  style={{
                    position: 'absolute',
                    top: spacing.sm,
                    right: spacing.sm,
                    width: 28,
                    height: 28,
                    borderRadius: radii.full,
                    backgroundColor: overlay.scrimSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons color={colors.danger} name="trash-outline" size={16} />
                </PressableScale>
              </View>
            ))}
            {!atLimit ? (
              <PressableScale
                accessibilityLabel="Agregar foto"
                // Busy, not disabled, while uploading: focus has just come back here, and a disabled control
                // drops out of the focus order (on web it is blurred). A tap meanwhile does nothing.
                accessibilityState={{ busy: upload.isPending }}
                onPress={() => upload.isPending || setChoosing(true)}
                ref={addRef}
                scaleTo={0.95}
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  padding: spacing.xs,
                  opacity: upload.isPending ? 0.5 : 1,
                }}
              >
                <Ionicons color={colors.textMuted} name="add" size={iconSizes.lg} />
                {/* Said, not only drawn (same words as the web tile); grows with Dynamic Type up to ×1.3, then wraps. */}
                <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ textAlign: 'center' }} tone="muted" variant="caption">
                  Agregar foto
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </Card>
      )}
      <PhotoSourceSheet
        busy={upload.isPending}
        onClose={() => {
          setChoosing(false);
          refocusAdd();
        }}
        onPick={(source) => void pickAndUpload(source)}
        visible={choosing}
      />
    </Section>
  );
}
