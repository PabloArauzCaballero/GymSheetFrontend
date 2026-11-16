import { Text, View } from 'react-native';
import { fontSizes, onMedia } from '@/theme';

/** Dynamic Type cap for the details over a photo (×1.6): legible, and the photo still shows. */
const DETAIL_SCALE_LIMIT = 1.6;

/** Gap between parts; the «·» is drawn inside it. */
const DOT_WIDTH = 14;

/**
 * «Objetivo · sede · nivel · puntos» that never leaves a lone «·» at a wrap.
 *
 * Each part draws its separator in the gap before it, positioned outside the
 * part. The part that starts a line has its dot past the clipped left edge of
 * the row, so a line neither starts nor ends with «·».
 */
export function MetaLine({ parts }: { parts: string[] }) {
  if (parts.length === 0) return null;
  const text = { color: onMedia.textSoft, fontSize: fontSizes.sm, lineHeight: 19 } as const;
  return (
    <View
      accessibilityLabel={parts.join(', ')}
      accessible
      style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: DOT_WIDTH, overflow: 'hidden', marginTop: 2 }}
    >
      {parts.map((part) => (
        <View key={part} style={{ flexShrink: 1 }}>
          <Text maxFontSizeMultiplier={DETAIL_SCALE_LIMIT} style={[text, { position: 'absolute', right: '100%', width: DOT_WIDTH, textAlign: 'center' }]}>·</Text>
          <Text maxFontSizeMultiplier={DETAIL_SCALE_LIMIT} style={[text, { flexShrink: 1 }]}>{part}</Text>
        </View>
      ))}
    </View>
  );
}
