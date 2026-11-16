import { ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/motion';
import { accentHues, alpha, colors, darkSurfaces, radii, spacing } from '@/theme';

type ActionProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  background: string;
  major?: boolean;
  size?: number;
  iconSize?: number;
  borderColor?: string;
  shadowOpacity: number;
  shadowRadius?: number;
  disabled?: boolean;
  dimmed?: boolean;
  loading?: boolean;
  onPress: () => void;
};

function ActionButton(props: ActionProps) {
  const { label, icon, accent, background, major = false, size = 50, iconSize = 24, borderColor } = props;
  const { shadowOpacity, shadowRadius = 8, disabled, dimmed, loading, onPress } = props;
  const diameter = major ? 64 : size;
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: diameter,
        height: diameter,
        borderRadius: radii.full,
        backgroundColor: background,
        borderWidth: major ? 2 : 1.5,
        borderColor: borderColor ?? accent,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dimmed ? 0.35 : 1,
        shadowColor: accent,
        shadowOffset: { width: 0, height: major ? 6 : 4 },
        shadowOpacity,
        shadowRadius,
      }}
    >
      {loading ? <ActivityIndicator color={accent} size="small" /> : <Ionicons color={accent} name={icon} size={major ? 34 : iconSize} />}
    </PressableScale>
  );
}

/** Undo, pass, super like, like and direct message: only rendered with a card in front. */
export function DeckActions({
  canUndo,
  undoPending,
  swipePending,
  messagePending,
  onUndo,
  onDecide,
  onMessage,
}: {
  canUndo: boolean;
  undoPending: boolean;
  swipePending: boolean;
  messagePending: boolean;
  onUndo: () => void;
  onDecide: (direction: 'LIKE' | 'PASS') => void;
  onMessage: () => void;
}) {
  const undoOff = !canUndo || undoPending;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 84, zIndex: 10 }}>
      <ActionButton
        accent={accentHues.amber}
        background={alpha(darkSurfaces.card, 0.85)}
        borderColor={alpha(accentHues.amber, 0.55)}
        dimmed={undoOff}
        disabled={undoOff}
        icon="reload-outline"
        iconSize={22}
        label="Deshacer último swipe"
        loading={undoPending}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUndo();
        }}
        shadowOpacity={0.2}
        size={48}
      />
      <ActionButton
        accent={accentHues.red}
        background={alpha(darkSurfaces.rewind, 0.9)}
        disabled={swipePending}
        icon="close"
        label="No me interesa"
        major
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDecide('PASS');
        }}
        shadowOpacity={0.3}
        shadowRadius={12}
      />
      <ActionButton
        accent={accentHues.cyan}
        background={alpha(darkSurfaces.superLike, 0.85)}
        disabled={swipePending}
        icon="star"
        label="Super Like"
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onDecide('LIKE');
        }}
        shadowOpacity={0.25}
      />
      <ActionButton
        accent={colors.volt}
        background={alpha(darkSurfaces.like, 0.9)}
        disabled={swipePending}
        icon="heart"
        label="Me interesa entrenar"
        major
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onDecide('LIKE');
        }}
        shadowOpacity={0.35}
        shadowRadius={14}
      />
      <ActionButton
        accent={accentHues.purple}
        background={alpha(darkSurfaces.boost, 0.85)}
        disabled={messagePending}
        icon="flash"
        iconSize={22}
        label="Enviar mensaje directo"
        loading={messagePending}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onMessage();
        }}
        shadowOpacity={0.25}
      />
    </View>
  );
}
