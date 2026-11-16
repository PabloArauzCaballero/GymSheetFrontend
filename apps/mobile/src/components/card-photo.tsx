import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, radii, semibold } from '@/theme';

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

/**
 * The photo of a directory card, or the person's initials in a disc when there is no photo or it fails to
 * load (the same face as the web card; never a broken-image glyph under the name).
 */
export function CardPhoto({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (url && failed !== url) {
    return (
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setFailed(url)}
        priority="low"
        recyclingKey={url}
        source={{ uri: url }}
        style={FILL}
        // Between photos of one person the cross-fade is short: navigation inside a card, not a new card.
        transition={140}
      />
    );
  }
  return (
    // The disc sits above the name band, as on the web.
    <View style={[FILL, { alignItems: 'center', justifyContent: 'center', paddingBottom: '25%', backgroundColor: colors.surfaceHigh }]}>
      <View style={{ width: 96, height: 96, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHighest }}>
        <Text maxFontSizeMultiplier={1.2} style={{ color: colors.textSecondary, fontSize: fontSizes.xl, fontWeight: semibold }}>
          {initialsOf(name, undefined)}
        </Text>
      </View>
    </View>
  );
}
