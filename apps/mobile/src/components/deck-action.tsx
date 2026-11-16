import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { ChatDot } from '@/components/chat-dot';
import { PressableScale } from '@/components/motion';
import { chat, colors, radii } from '@/theme';

/**
 * Round button of a swipe deck's action row: the tappable twin of the gesture.
 *
 * Shared by Descubrir and Comunidad so both decks speak the same visual
 * language: one quiet surface, a 1 pt outline and a glyph in the same tone.
 * The tone carries the meaning; size carries the hierarchy (deciding actions
 * are larger than the ones that correct or shortcut). Disabled state is announced
 * (`accessibilityState.disabled` → `aria-disabled` on web) and drawn dashed.
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
        // Disabled reads as disabled by shape (dashed) and tone, not by fading:
        // textDisabled keeps 3.9:1 on surfaceLow, an opacity would halve it.
        borderStyle: disabled ? 'dashed' : 'solid',
        borderColor: disabled ? colors.textDisabled : accent,
        backgroundColor: colors.surfaceLow,
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

/**
 * The deck's message button: the one vibrant control of the row, in Chat's own
 * accent (`chat` tokens) with its glowing dot at the top-right tip — «a
 * conversation starts here». The tip is decoration (`tone="spark"`, Chat ink, no
 * figure), so the alert pink keeps meaning «someone is waiting». Same size and
 * press spring as its neighbours; nothing moves on its own.
 */
export function ChatDeckAction({ label, loading = false, onPress, size }: { label: string; loading?: boolean; onPress: () => void; size: number }) {
  return (
    <PressableScale accessibilityLabel={label} disabled={loading} onPress={onPress} scaleTo={0.94} style={{ width: size, height: size }}>
      <LinearGradient
        colors={[chat.fillFrom, chat.fillTo]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ flex: 1, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', shadowColor: chat.fillFrom, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
      >
        {loading ? <ActivityIndicator color={chat.onFill} size="small" /> : <Ionicons color={chat.onFill} name="chatbubble" size={size * 0.42} />}
      </LinearGradient>
      <ChatDot halo={colors.background} style={{ position: 'absolute', top: 1, right: 1 }} tone="spark" />
    </PressableScale>
  );
}
