import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DirectoryCardFace } from '@/components/directory-card';
import { ProfileDetailSheet } from '@/components/profile-detail-sheet';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

/** Room the screen keeps around the card: back link and a breathing margin above and below. */
const PREVIEW_CHROME = spacing.xl * 2;
/** Never shrink the card below a readable face, even in landscape. */
const MIN_CARD_WIDTH = 240;

/**
 * «Ver como te ven»: tu carta con los mismos componentes que pinta la baraja
 * de Conocer y la misma ficha ampliada. No es un dibujo aparte que pueda
 * mentir: si algo no sale aquí, tampoco lo ven los demás.
 */
export function ProfilePreview({ entry }: { entry: GymDirectoryEntry }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [detail, setDetail] = useState<GymDirectoryEntry | null>(null);
  const count = Math.max(entry.photos.length, 1);
  // The whole card fits on screen: its 4:5 width is capped by the height left after the safe areas
  // (and the tab bar, when this screen sits under one), as on the web preview.
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? insets.bottom;
  const fitHeight = windowHeight - insets.top - tabBarHeight - PREVIEW_CHROME;
  const width = Math.min(windowWidth - spacing.lg * 2, Math.max(fitHeight * 0.8, MIN_CARD_WIDTH));
  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{ width, alignSelf: 'center', borderRadius: radii.xxl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceHigh }}
        testID="profile-preview-card"
      >
        <DirectoryCardFace
          entry={entry}
          onInfoPress={() => setDetail(entry)}
          onStepPhoto={(delta) => setPhotoIndex((index) => (index + delta + count) % count)}
          photoIndex={photoIndex}
        />
      </View>
      <Button icon="expand-outline" label="Ver ficha completa" onPress={() => setDetail(entry)} variant="ghost" />
      {/* The hint goes last, as on the web: the card is what you came to see. */}
      <Text style={{ textAlign: 'center' }} tone="secondary" variant="footnote">
        Así te ven en Conocer. Tu estado social solo lo ven tus conexiones.
      </Text>
      <ProfileDetailSheet entry={detail} onClose={() => setDetail(null)} />
    </View>
  );
}
