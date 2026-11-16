import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, radii } from '@/theme';

/**
 * Round button of a swipe deck's action row: the tappable twin of the gesture.
 *
 * Shared by Descubrir and Comunidad so both decks speak the same visual
 * language: one quiet surface, a 1 pt outline and a glyph in the same tone.
 * The tone carries the meaning; size carries the hierarchy (deciding actions
 * are larger than the ones that correct or shortcut).
 */
export function DeckAction({
  accent,
  disabled = false,
  icon,
  inert = false,
  label,
  loading = false,
  onPress,
  size,
}: {
  accent: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  /** Ignores presses without dimming: a request in flight, not an unavailable action. */
  inert?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  size: number;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled || inert || loading}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: disabled ? colors.borderSubtle : accent,
        backgroundColor: colors.surfaceLow,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={accent} size="small" />
      ) : (
        <Ionicons color={disabled ? colors.textDisabled : accent} name={icon} size={size * 0.42} />
      )}
    </PressableScale>
  );
}
