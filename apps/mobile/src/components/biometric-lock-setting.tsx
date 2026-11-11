import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { notify } from '@/notifications';
import { availableBiometric, verifyBiometric, type BiometricKind } from '@/security/biometrics';
import { useAppLockStore } from '@/state/app-lock-store';
import { colors, fontSizes, minTouchTarget, spacing } from '@/theme';

/**
 * «Desbloquear con Face ID» (iPhone) / «Desbloquear con huella» (Android).
 * Turning it on asks for the biometric once, so nobody can switch it on for
 * someone else. Without an enrolled biometric it explains how to get one
 * instead of showing a switch that cannot work.
 */
export function BiometricLockSetting() {
  const enabled = useAppLockStore((state) => state.enabled);
  const setEnabled = useAppLockStore((state) => state.setEnabled);
  const [kind, setKind] = useState<BiometricKind | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void availableBiometric().then(setKind);
  }, []);

  const onChange = async (next: boolean) => {
    if (!kind) return;
    setBusy(true);
    try {
      if (!next) {
        await setEnabled(false);
        return;
      }
      const lock = useAppLockStore.getState();
      lock.setPrompting(true);
      const result = await verifyBiometric(`Activa el desbloqueo con ${kind.label}`);
      lock.setPrompting(false);
      if (result !== 'passed') {
        if (result === 'failed') notify.warning(`No se activó: no pudimos verificar tu ${kind.label}.`);
        return;
      }
      await setEnabled(true);
      notify.success(`Listo: GymSheet se abrirá con ${kind.label}.`);
    } finally {
      setBusy(false);
    }
  };

  const title = kind ? `Desbloquear con ${kind.label}` : 'Desbloquear con Face ID o huella';
  const description =
    kind === undefined
      ? 'Revisando qué ofrece este teléfono…'
      : kind === null
        ? 'Registra tu rostro o tu huella en los ajustes del teléfono para usarlo.'
        : enabled
          ? `Activado. Tu sesión queda abierta y GymSheet te pide ${kind.label} al abrirse.`
          : `Abre GymSheet con ${kind.label} en lugar de tu contraseña.`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
        paddingVertical: spacing.xs,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
      {kind ? (
        <Switch
          accessibilityLabel={title}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled, disabled: busy }}
          disabled={busy}
          ios_backgroundColor={colors.surfaceHigh}
          onValueChange={(value) => void onChange(value)}
          thumbColor={busy ? colors.textDisabled : colors.surfaceHigh}
          trackColor={{ false: colors.surfaceHigh, true: colors.volt }}
          value={enabled}
        />
      ) : null}
    </View>
  );
}
