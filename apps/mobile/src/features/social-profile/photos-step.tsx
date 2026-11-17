import { View } from 'react-native';
import { ProfilePhotoGallery } from '@/components/profile-photo-gallery';
import { Text } from '@/components/text';
import { spacing } from '@/theme';
import { missingPhotos } from './selection';

/** Reuses the profile gallery (same upload, same cache) and says how many photos are still missing. */
export function PhotosStep({ count }: { count: number | undefined }) {
  const missing = count === undefined ? null : missingPhotos(count);
  return (
    <View style={{ gap: spacing.md }}>
      <ProfilePhotoGallery />
      {missing === null ? null : (
        <Text accessibilityLiveRegion="polite" tone={missing > 0 ? 'secondary' : 'accent'} variant="subhead">
          {missing === 0
            ? 'Listo: ya puedes aparecer en Conocer.'
            : missing === 1
              ? 'Te falta 1 foto para aparecer en Conocer.'
              : `Te faltan ${missing} fotos para aparecer en Conocer.`}
        </Text>
      )}
    </View>
  );
}
