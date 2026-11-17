import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accentHues, alpha, colors, fontSizes, ink, radii } from '@/theme';

/** A pill over the card photo: icon plus word. `level` is the one accent chip. */
export function CardChip({
  icon,
  iconColor = colors.volt,
  children,
  level = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: ReactNode;
  level?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.full,
        backgroundColor: level ? alpha(accentHues.volt, 0.18) : alpha(colors.background, 0.7),
        borderWidth: 1,
        borderColor: level ? alpha(accentHues.volt, 0.4) : alpha(ink.white, 0.14),
      }}
    >
      <Ionicons color={iconColor} name={icon} size={13} />
      <Text
        style={{
          color: level ? colors.volt : ink.white,
          fontSize: fontSizes.xs,
          fontWeight: level ? '700' : '600',
          fontVariant: level ? ['tabular-nums'] : undefined,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
