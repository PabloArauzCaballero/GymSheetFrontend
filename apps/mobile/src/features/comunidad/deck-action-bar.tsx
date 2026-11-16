import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import { DeckAction } from '@/components/deck-action';
import { accentPolicy, colors, minTouchTarget, spacing } from '@/theme';

/** Deciding actions are larger than the ones that correct or shortcut: that is the screen's real hierarchy. */
const DECIDE_SIZE = minTouchTarget + 20;
const SIDE_SIZE = minTouchTarget + 4;
/** Room kept for the floating tab bar so nothing sits under the glass. */
export const ACTION_BAR_BOTTOM = 84;

/**
 * Comunidad's action row, in the same language as Descubrir's: quiet surfaces
 * with a 1 pt outline. Only the two decisions carry a hue — pass in danger,
 * like in accent ink — and the three helpers stay neutral, so the accent is
 * not spent on five buttons at once.
 */
export function DeckActionBar({
  canUndo,
  messaging,
  onLike,
  onMessage,
  onPass,
  onSuperLike,
  onUndo,
  swiping,
  undoing,
}: {
  canUndo: boolean;
  messaging: boolean;
  onLike: () => void;
  onMessage: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  onUndo: () => void;
  swiping: boolean;
  undoing: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: ACTION_BAR_BOTTOM,
        zIndex: 10,
      }}
    >
      <DeckAction
        accent={colors.textSecondary}
        disabled={!canUndo}
        icon="arrow-undo-outline"
        label="Deshacer último swipe"
        loading={undoing}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUndo();
        }}
        size={SIDE_SIZE}
      />
      <DeckAction
        accent={colors.danger}
        inert={swiping}
        icon="close"
        label="No me interesa"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPass();
        }}
        size={DECIDE_SIZE}
      />
      <DeckAction
        accent={colors.textSecondary}
        inert={swiping}
        icon="star"
        label="Super Like"
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuperLike();
        }}
        size={SIDE_SIZE}
      />
      <DeckAction
        accent={accentPolicy.ink}
        inert={swiping}
        icon="heart"
        label="Me interesa entrenar"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onLike();
        }}
        size={DECIDE_SIZE}
      />
      <DeckAction
        accent={colors.textSecondary}
        icon="chatbubble-outline"
        label="Enviar mensaje directo"
        loading={messaging}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onMessage();
        }}
        size={SIDE_SIZE}
      />
    </View>
  );
}
