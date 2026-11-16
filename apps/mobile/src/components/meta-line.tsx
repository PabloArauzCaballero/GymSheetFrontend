import { Text, View } from 'react-native';
import { fontSizes, onMedia } from '@/theme';

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
          <Text style={[text, { position: 'absolute', right: '100%', width: DOT_WIDTH, textAlign: 'center' }]}>·</Text>
          <Text style={[text, { flexShrink: 1 }]}>{part}</Text>
        </View>
      ))}
    </View>
  );
}
