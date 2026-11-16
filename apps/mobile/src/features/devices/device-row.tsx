import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { UserDevice } from '@gymsheet/schemas';
import { deviceCopy, deviceLabel } from '@gymsheet/domain';
import { Badge } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';
import { lastSeenLabel } from './devices-logic';

const PLATFORM_ICON: Record<UserDevice['platform'], keyof typeof Ionicons.glyphMap> = {
  IOS: 'phone-portrait-outline',
  ANDROID: 'phone-portrait-outline',
  WEB: 'desktop-outline',
  UNKNOWN: 'hardware-chip-outline',
};

/**
 * One device of the account. This device carries the badge and no sign-out:
 * leaving here is «Cerrar sesión» in Ajustes, which also cleans up locally.
 */
export function DeviceRow({
  device,
  revoking,
  onRevoke,
}: {
  device: UserDevice;
  revoking: boolean;
  onRevoke: (deviceId: string, label: string) => void;
}) {
  const label = deviceLabel(device);
  return (
    <View
      accessible={device.current}
      accessibilityLabel={device.current ? `${label}. ${deviceCopy.current}. ${lastSeenLabel(device)}` : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: comfortableTouchTarget, paddingVertical: spacing.sm }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name={PLATFORM_ICON[device.platform]}
        size={iconSizes.lg}
      />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text numberOfLines={2} variant="headline">{label}</Text>
        <Text numberOfLines={1} tone="muted" variant="footnote">{lastSeenLabel(device)}</Text>
        {device.current ? <Badge label={deviceCopy.current} tone="success" /> : null}
      </View>
      {device.current ? null : (
        <Button
          accessibilityLabel={`${deviceCopy.revoke} en ${label}`}
          label={deviceCopy.revoke}
          loading={revoking}
          onPress={() => onRevoke(device.id, label)}
          size="sm"
          variant="ghost"
        />
      )}
    </View>
  );
}
