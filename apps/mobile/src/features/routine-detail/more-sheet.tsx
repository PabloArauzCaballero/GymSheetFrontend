import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';

export type MoreAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
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
  return (
    <BottomSheet onClose={onClose} testID="routine-more-sheet" title={title} visible={visible}>
      <View>
        {actions.map((action) => (
          <PressableScale
            accessibilityLabel={action.label}
            haptic="none"
            key={action.key}
            onPress={() => {
              onClose();
              action.onPress();
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
export function MoreButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel="Más acciones"
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
      testID="routine-more"
    >
      <Ionicons color={colors.text} name="ellipsis-horizontal" size={iconSizes.md} />
    </PressableScale>
  );
}
