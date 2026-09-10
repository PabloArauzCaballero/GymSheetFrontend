import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors, fontSizes, radii, semibold } from '@/theme';

/**
 * Oro/plata/bronce, no un número más — un podio que solo diferencia el primer
 * lugar por texto no se lee como podio. Estos tres colores son deliberadamente
 * los únicos "hardcodeados" fuera de `theme`: son metales, no la paleta de la
 * marca, y se repetirían igual sea cual sea el tenant activo.
 */
const MEDAL_COLOR: Record<number, string> = {
  1: '#F4C430',
  2: '#C7CDD6',
  3: '#CE8946',
};
const MEDAL_ICON_COLOR = '#241A05';

export function RankBadge({
  position,
  isMe,
  size = 28,
}: {
  position: number;
  isMe?: boolean;
  size?: number;
}) {
  const medalColor = MEDAL_COLOR[position];
  if (medalColor) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: medalColor,
        }}
      >
        <Ionicons color={MEDAL_ICON_COLOR} name="medal" size={size * 0.62} />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isMe ? colors.volt : colors.surfaceHigh,
      }}
    >
      <Text
        style={{
          color: isMe ? colors.background : colors.textMuted,
          fontSize: fontSizes.xs,
          fontWeight: semibold,
        }}
      >
        {position}
      </Text>
    </View>
  );
}
