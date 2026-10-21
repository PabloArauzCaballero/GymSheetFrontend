import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedIconBadge } from '@/components/animated-icon-badge';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentHues, alpha, colors, comfortableTouchTarget, darkSurfaces, iconSizes, ink, radii, reppJade, spacing } from '@/theme';

export type MoreAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  destructive?: boolean;
  iconColor?: string;
  gradient?: readonly [string, string];
  borderColor?: string;
  glowColor?: string;
  pulsing?: boolean;
  /**
   * La acción abre otro Modal (la guía, una denuncia): espera a que la hoja se
   * vaya. Dos Modales encadenados en iOS dejan el segundo sin presentarse.
   */
  afterClose?: boolean;
  onPress: () => void;
};

function getActionVisual(action: MoreAction) {
  if (action.destructive) {
    return {
      gradient: [alpha(accentHues.coral, 0.28), alpha(accentHues.roseDeep, 0.14)] as const,
      border: alpha(accentHues.coral, 0.45),
      color: colors.danger,
      glow: colors.danger,
      pulsing: false,
    };
  }
  if (action.gradient && action.iconColor) {
    return {
      gradient: action.gradient,
      border: action.borderColor || action.gradient[0],
      color: action.iconColor,
      glow: action.glowColor || action.iconColor,
      pulsing: action.pulsing ?? false,
    };
  }
  switch (action.key) {
    case 'create':
    case 'add':
      return {
        gradient: [alpha(reppJade, 0.32), alpha(accentHues.tealDeep, 0.15)] as const,
        border: alpha(reppJade, 0.5),
        color: accentHues.teal,
        glow: colors.volt,
        pulsing: true,
      };
    case 'exercises':
    case 'search':
      return {
        gradient: [alpha(accentHues.sky, 0.28), alpha(accentHues.blueDeep, 0.15)] as const,
        border: alpha(accentHues.sky, 0.45),
        color: accentHues.sky,
        glow: accentHues.sky,
        pulsing: false,
      };
    case 'download-progress':
    case 'download':
    case 'export':
      return {
        gradient: [alpha(accentHues.emeraldSoft, 0.28), alpha(accentHues.emeraldDeep, 0.15)] as const,
        border: alpha(accentHues.emeraldSoft, 0.45),
        color: accentHues.emeraldSoft,
        glow: accentHues.emeraldSoft,
        pulsing: false,
      };
    case 'cardio':
    case 'heart':
      return {
        gradient: [alpha(accentHues.coral, 0.28), alpha(accentHues.roseDeep, 0.15)] as const,
        border: alpha(accentHues.coral, 0.45),
        color: accentHues.coral,
        glow: accentHues.coral,
        pulsing: false,
      };
    case 'music':
      return {
        gradient: [alpha(accentHues.lilac, 0.28), alpha(accentHues.purpleDeep, 0.15)] as const,
        border: alpha(accentHues.lilac, 0.45),
        color: accentHues.lilac,
        glow: accentHues.lilac,
        pulsing: false,
      };
    case 'guide':
    case 'help':
    case 'info':
      return {
        gradient: [alpha(accentHues.sun, 0.28), alpha(accentHues.sunDeep, 0.15)] as const,
        border: alpha(accentHues.sun, 0.45),
        color: accentHues.sun,
        glow: accentHues.sun,
        pulsing: false,
      };
    case 'publish':
    case 'share':
      return {
        gradient: [alpha(accentHues.azure, 0.28), alpha(accentHues.blueDeep, 0.15)] as const,
        border: alpha(accentHues.azure, 0.45),
        color: accentHues.azure,
        glow: accentHues.azure,
        pulsing: false,
      };
    case 'reply':
      return {
        gradient: [alpha(reppJade, 0.28), alpha(accentHues.tealDeep, 0.15)] as const,
        border: alpha(reppJade, 0.45),
        color: colors.volt,
        glow: colors.volt,
        pulsing: false,
      };
    default:
      return {
        gradient: [alpha(darkSurfaces.panel, 0.5), alpha(colors.surfaceLow, 0.3)] as const,
        border: alpha(ink.white, 0.1),
        color: colors.textSecondary,
        glow: colors.textSecondary,
        pulsing: false,
      };
  }
}

/** El menú ⋯ del detalle: lo poco frecuente (publicar, denunciar) fuera de la vista. */
export function MoreSheet({
  visible,
  onClose,
  title,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  actions: readonly MoreAction[];
}) {
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const run = pending.current;
    pending.current = null;
    run?.();
  };
  return (
    <BottomSheet
      onClose={onClose}
      onDismiss={runPending}
      testID="routine-more-sheet"
      title={title}
      visible={visible}
    >
      <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        {actions.map((action, index) => {
          const visual = getActionVisual(action);
          return (
            <Animated.View
              entering={FadeInDown.delay(index * 45).springify().damping(17).mass(0.7)}
              key={action.key}
            >
              <PressableScale
                accessibilityLabel={action.label}
                haptic="selection"
                onPress={() => {
                  onClose();
                  // `onDismiss` solo existe en iOS; en Android el Modal se cierra sin esperar.
                  if (action.afterClose && Platform.OS === 'ios') pending.current = action.onPress;
                  else action.onPress();
                }}
                scaleTo={0.98}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.smd,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.xl,
                  backgroundColor: colors.surfaceHigh,
                  borderWidth: 1,
                  borderColor: alpha(ink.white, 0.08),
                }}
                testID={`more-${action.key}`}
              >
                <AnimatedIconBadge
                  borderColor={visual.border}
                  glowColor={visual.glow}
                  gradient={visual.gradient}
                  icon={action.icon}
                  iconColor={visual.color}
                  iconSize={22}
                  pulsing={visual.pulsing}
                  size={46}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text tone={action.destructive ? 'danger' : 'default'} variant="body">
                    {action.label}
                  </Text>
                  {action.description && (
                    <Text tone="muted" variant="caption">
                      {action.description}
                    </Text>
                  )}
                </View>
                <Ionicons
                  color={colors.borderControl}
                  name="chevron-forward"
                  size={iconSizes.sm}
                />
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** Botón ⋯ de la barra superior. */
export function MoreButton({
  onPress,
  testID = 'routine-more',
  accessibilityLabel = 'Más acciones',
}: {
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      haptic="none"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        width: comfortableTouchTarget,
        height: comfortableTouchTarget,
        borderRadius: comfortableTouchTarget / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceHigh,
      }}
      testID={testID}
    >
      <Ionicons color={colors.text} name="ellipsis-horizontal" size={iconSizes.md} />
    </PressableScale>
  );
}
