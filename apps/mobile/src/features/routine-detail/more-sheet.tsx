import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedIconBadge } from '@/components/animated-icon-badge';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { alpha, colors, comfortableTouchTarget, iconSizes, radii, spacing } from '@/theme';

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
      gradient: ['rgba(255, 133, 119, 0.28)', 'rgba(136, 19, 55, 0.14)'] as const,
      border: 'rgba(255, 133, 119, 0.45)',
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
        gradient: ['rgba(46, 139, 123, 0.32)', 'rgba(20, 60, 52, 0.15)'] as const,
        border: 'rgba(46, 139, 123, 0.5)',
        color: '#48D1B6',
        glow: colors.volt,
        pulsing: true,
      };
    case 'exercises':
    case 'search':
      return {
        gradient: ['rgba(56, 189, 248, 0.28)', 'rgba(30, 58, 138, 0.15)'] as const,
        border: 'rgba(56, 189, 248, 0.45)',
        color: '#38BDF8',
        glow: '#38BDF8',
        pulsing: false,
      };
    case 'download-progress':
    case 'download':
    case 'export':
      return {
        gradient: ['rgba(52, 211, 153, 0.28)', 'rgba(6, 78, 59, 0.15)'] as const,
        border: 'rgba(52, 211, 153, 0.45)',
        color: '#34D399',
        glow: '#34D399',
        pulsing: false,
      };
    case 'cardio':
    case 'heart':
      return {
        gradient: ['rgba(255, 133, 119, 0.28)', 'rgba(136, 19, 55, 0.15)'] as const,
        border: 'rgba(255, 133, 119, 0.45)',
        color: '#ff8577',
        glow: '#ff8577',
        pulsing: false,
      };
    case 'music':
      return {
        gradient: ['rgba(183, 155, 255, 0.28)', 'rgba(88, 28, 135, 0.15)'] as const,
        border: 'rgba(183, 155, 255, 0.45)',
        color: '#b79bff',
        glow: '#b79bff',
        pulsing: false,
      };
    case 'guide':
    case 'help':
    case 'info':
      return {
        gradient: ['rgba(255, 210, 74, 0.28)', 'rgba(120, 80, 20, 0.15)'] as const,
        border: 'rgba(255, 210, 74, 0.45)',
        color: '#ffd24a',
        glow: '#ffd24a',
        pulsing: false,
      };
    case 'publish':
    case 'share':
      return {
        gradient: ['rgba(108, 184, 255, 0.28)', 'rgba(30, 58, 138, 0.15)'] as const,
        border: 'rgba(108, 184, 255, 0.45)',
        color: '#6cb8ff',
        glow: '#6cb8ff',
        pulsing: false,
      };
    case 'reply':
      return {
        gradient: ['rgba(46, 139, 123, 0.28)', 'rgba(20, 60, 52, 0.15)'] as const,
        border: 'rgba(46, 139, 123, 0.45)',
        color: colors.volt,
        glow: colors.volt,
        pulsing: false,
      };
    default:
      return {
        gradient: ['rgba(39, 54, 77, 0.5)', 'rgba(23, 34, 53, 0.3)'] as const,
        border: 'rgba(255, 255, 255, 0.1)',
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
                  borderColor: 'rgba(255, 255, 255, 0.08)',
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
