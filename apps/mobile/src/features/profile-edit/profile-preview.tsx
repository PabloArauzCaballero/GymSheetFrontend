import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { useState } from 'react';
import { View } from 'react-native';
import { DirectoryCardFace } from '@/components/directory-card';
import { ProfileDetailSheet } from '@/components/profile-detail-sheet';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * «Ver como te ven»: tu carta con los mismos componentes que pinta la baraja
 * de Conocer y la misma ficha ampliada. No es un dibujo aparte que pueda
 * mentir: si algo no sale aquí, tampoco lo ven los demás.
 */
export function ProfilePreview({ entry }: { entry: GymDirectoryEntry }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [detail, setDetail] = useState<GymDirectoryEntry | null>(null);
  const count = Math.max(entry.photos.length, 1);
  return (
    <View style={{ gap: spacing.md }}>
      <Text tone="secondary" variant="subhead">
        Así te ven en Conocer. Tu estado social solo lo ven tus conexiones.
      </Text>
      <View testID="profile-preview-card">
        <DirectoryCardFace
          entry={entry}
          onInfoPress={() => setDetail(entry)}
          onStepPhoto={(delta) => setPhotoIndex((index) => (index + delta + count) % count)}
          photoIndex={photoIndex}
        />
      </View>
      <Button icon="expand-outline" label="Ver ficha completa" onPress={() => setDetail(entry)} variant="ghost" />
      <ProfileDetailSheet entry={detail} onClose={() => setDetail(null)} />
    </View>
  );
}
