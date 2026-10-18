import { Ionicons } from '@expo/vector-icons';
import { prizeCodeGroups } from '@gymsheet/domain';
import * as Clipboard from 'expo-clipboard';
import { Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * El código de un premio, grande y en dos grupos («K7M 2QX») para leerlo en voz
 * alta en recepción. Se puede seleccionar (mantener pulsado) y copiar con un
 * toque. El lector de pantalla lo deletrea carácter a carácter.
 */
export function PrizeCode({
  code,
  ink,
  size = 'lg',
  muted = false,
}: {
  code: string;
  /** Tinta del código: el rótulo del material de la carta. */
  ink: string;
  size?: 'lg' | 'md';
  /** Canjeado o caducado: se lee, pero no se ofrece copiar. */
  muted?: boolean;
}) {
  const fontSize = size === 'lg' ? fontSizes.xl : fontSizes.lg;
  const copy = () => {
    void Clipboard.setStringAsync(code).then(() => notify.success('Código copiado.'));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text
        accessibilityLabel={`Código ${code.split('').join(' ')}`}
        selectable
        style={{
          color: muted ? colors.textMuted : ink,
          fontSize,
          lineHeight: Math.round(fontSize * 1.15),
          fontWeight: semibold,
          fontVariant: ['tabular-nums'],
          letterSpacing: fontSize * 0.14,
          textDecorationLine: muted ? 'line-through' : 'none',
        }}
      >
        {prizeCodeGroups(code)}
      </Text>
      {muted ? null : (
        <PressableScale
          accessibilityLabel="Copiar el código"
          haptic="selection"
          onPress={copy}
          scaleTo={0.94}
          style={{
            minWidth: minTouchTarget,
            height: minTouchTarget,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.textSecondary} name="copy-outline" size={iconSizes.md} />
        </PressableScale>
      )}
    </View>
  );
}
