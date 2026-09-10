import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { profilePhotosService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { notify } from '@/notifications';
import { colors, iconSizes, radii, spacing } from '@/theme';

const MAX_PHOTOS = 6;
const THUMB_SIZE = 92;

/**
 * Galería de fotos de perfil. No existía ni un avatar único antes de esto —
 * el perfil solo mostraba iniciales.
 *
 * Mismo límite y mismo texto que en el portal web.
 */
export function ProfilePhotoGallery() {
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

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error('Necesitas dar permiso para acceder a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    upload.mutate({
      uri: asset.uri,
      name: asset.fileName ?? 'foto.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const count = photos.data?.length ?? 0;
  const atLimit = count >= MAX_PHOTOS;

  return (
    <Section icon="images-outline" title="Fotos de perfil">
      {photos.isPending ? (
        <Skeleton height={THUMB_SIZE} />
      ) : photos.isError ? (
        <ErrorState error={photos.error} onRetry={() => void photos.refetch()} />
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(photos.data ?? []).map((photo) => (
              <View key={photo.id} style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
                <Image
                  source={{ uri: photo.url }}
                  style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceHigh,
                  }}
                />
                <Pressable
                  accessibilityLabel="Eliminar foto"
                  disabled={remove.isPending}
                  onPress={() => remove.mutate(photo.id)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    borderRadius: radii.full,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons color="#fff" name="close" size={14} />
                </Pressable>
              </View>
            ))}
            {!atLimit ? (
              <Pressable
                accessibilityLabel="Agregar foto"
                disabled={upload.isPending}
                onPress={() => void pickAndUpload()}
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons color={colors.textMuted} name="add" size={iconSizes.lg} />
              </Pressable>
            ) : null}
          </View>
        </Card>
      )}
    </Section>
  );
}
