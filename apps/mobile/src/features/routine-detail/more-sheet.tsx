import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Platform, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';

export type MoreAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  /**
   * La acción abre otro Modal (la guía, una denuncia): espera a que la hoja se
   * vaya. Dos Modales encadenados en iOS dejan el segundo sin presentarse.
   */
  afterClose?: boolean;
  onPress: () => void;
};

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
      <View>
        {actions.map((action) => (
          <PressableScale
            accessibilityLabel={action.label}
            haptic="none"
            key={action.key}
            onPress={() => {
              onClose();
              // `onDismiss` solo existe en iOS; en Android el Modal se cierra sin esperar.
              if (action.afterClose && Platform.OS === 'ios') pending.current = action.onPress;
              else action.onPress();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.smd,
              minHeight: comfortableTouchTarget,
            }}
            testID={`more-${action.key}`}
          >
            <Ionicons
              accessibilityElementsHidden
              color={action.destructive ? colors.danger : colors.textSecondary}
              importantForAccessibility="no-hide-descendants"
              name={action.icon}
              size={iconSizes.md}
            />
            <Text tone={action.destructive ? 'danger' : 'default'} variant="body">
              {action.label}
            </Text>
          </PressableScale>
        ))}
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
