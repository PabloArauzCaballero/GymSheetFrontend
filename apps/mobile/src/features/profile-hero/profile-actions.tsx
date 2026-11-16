import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentContrast, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

export type ProfileAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  /** Kept in its slot but inert, so the row never reflows while data loads or after an error. */
  disabled?: boolean;
  /** Spoken instead of the label when disabled: says why. */
  disabledLabel?: string;
  testID?: string;
};

/**
 * Las acciones bajo la cara, en círculo y con su nombre debajo (el patrón de
 * Tinder). Columnas iguales: a 320 pt ninguna etiqueta se corta ni empuja a la
 * de al lado; con texto grande pasa a dos líneas. La principal es la única en relleno de acento.
 */
export function ProfileActions({ actions }: { actions: readonly ProfileAction[] }) {
  // Dynamic Type past ×1.3: three columns cannot hold «Compartir» without breaking it mid-word, so the actions
  // stack as rows (circle, then the label beside it), as iOS does at accessibility sizes.
  const stacked = useWindowDimensions().fontScale > 1.3;
  return (
    <View style={stacked ? { alignSelf: 'stretch', gap: spacing.sm } : { flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'stretch' }}>
      {actions.map((action) => {
        const size = action.primary && !stacked ? 64 : 52; // one size when stacked: the labels line up
        return (
          <PressableScale
            accessibilityLabel={action.disabled ? (action.disabledLabel ?? action.label) : action.label}
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            // Haptic map (repp-diseno §6): the screen's main action lands with medium; the others navigate (light).
            haptic={action.primary ? 'medium' : 'light'}
            key={action.key}
            onPress={action.onPress}
            scaleTo={0.94}
            style={[
              { minHeight: minTouchTarget, alignItems: 'center', opacity: action.disabled ? 0.45 : 1 },
              stacked ? { flexDirection: 'row', gap: spacing.smd } : { flex: 1, minWidth: 0, gap: spacing.xs },
            ]}
            testID={action.testID}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: action.primary ? colors.volt : colors.surfaceHigh,
                borderWidth: action.primary ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons
                color={action.primary ? accentContrast() : colors.text}
                name={action.icon}
                size={action.primary ? iconSizes.lg : iconSizes.md}
              />
            </View>
            {/* Two lines, then shrink a little: large text never cuts a label to «Compar…». */}
            <Text adjustsFontSizeToFit={!stacked} minimumFontScale={0.8} numberOfLines={stacked ? undefined : 2} strong={action.primary} style={stacked ? { flex: 1 } : { textAlign: 'center' }} tone={action.primary ? 'default' : 'secondary'} variant="footnote">
              {action.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
