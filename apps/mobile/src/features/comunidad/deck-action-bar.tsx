import * as Haptics from 'expo-haptics';
import { View, useWindowDimensions } from 'react-native';
import { ChatDeckAction, DeckAction } from '@/components/deck-action';
import { accentPolicy, colors, minTouchTarget, spacing } from '@/theme';
import { COMUNIDAD_GUTTER } from './comunidad-header';

/** Deciding actions are larger than the ones that correct or shortcut: that is the screen's real hierarchy. */
const DECIDE_SIZE = minTouchTarget + 20;
const SIDE_SIZE = minTouchTarget + 4;
/** Room kept for the floating tab bar so nothing sits under the glass. */
export const ACTION_BAR_BOTTOM = 84;
/** Below this width the row uses the compact sizes. */
const COMPACT_WIDTH = 360;

/**
 * Comunidad's action row, in the same language as Descubrir's: quiet surfaces
 * with a 1 pt outline. Only the two decisions carry a hue — pass in danger,
 * like in accent ink — undo and super like stay neutral, and the message
 * button wears Chat's own vibrant accent (not the brand's), so the brand
 * accent is not spent on five buttons at once.
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
  // Five buttons on a 320 pt phone: 64·2 + 48·3 leaves no room between them, so the row steps
  // down to 56/44 instead of letting the buttons touch. 44 stays the touch minimum.
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  const decideSize = compact ? DECIDE_SIZE - 8 : DECIDE_SIZE;
  const sideSize = compact ? minTouchTarget : SIDE_SIZE;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        // Spread across the card's width, 8 pt inside its edges at every phone width.
        justifyContent: 'space-between',
        paddingHorizontal: COMUNIDAD_GUTTER + spacing.sm,
        paddingTop: spacing.md,
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
        size={sideSize}
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
        size={decideSize}
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
        size={sideSize}
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
        size={decideSize}
      />
      <ChatDeckAction
        label="Enviar mensaje directo"
        loading={messaging}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onMessage();
        }}
        size={sideSize}
      />
    </View>
  );
}
