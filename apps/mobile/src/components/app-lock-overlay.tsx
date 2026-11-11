import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { availableBiometric, verifyBiometric, type BiometricKind } from '@/security/biometrics';
import { useAppLockStore } from '@/state/app-lock-store';
import { useAuthStore } from '@/state/auth-store';
import { accentPolicy, colors, fontSizes, radii, spacing } from '@/theme';

/** «María José Pérez Soliz» → «María José»; «Ana Paz» → «Ana». */
function greetingName(fullName: string | undefined): string | null {
  const words = fullName?.trim().split(/\s+/u).filter(Boolean) ?? [];
  if (words.length === 0) return null;
  return words.length >= 4 ? `${words[0]} ${words[1]}` : (words[0] ?? null);
}

/**
 * Covers the app while it is locked. The navigator stays mounted underneath,
 * so the routine or set the member was logging is still there after unlocking.
 * The system prompt opens by itself; the button is for a second try.
 */
export function AppLockOverlay() {
  const locked = useAppLockStore((state) => state.locked);
  if (!locked) return null;
  return <LockScreen />;
}

function LockScreen() {
  const principal = useAuthStore((state) => state.principal);
  const logout = useAuthStore((state) => state.logout);
  const [kind, setKind] = useState<BiometricKind | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    const lock = useAppLockStore.getState();
    setChecking(true);
    setError(null);
    lock.setPrompting(true);
    const detected = kind ?? (await availableBiometric());
    setKind(detected);
    if (!detected) {
      lock.setPrompting(false);
      setChecking(false);
      setError('Este teléfono ya no tiene Face ID ni huella registrados. Entra con tu contraseña.');
      return;
    }
    const result = await verifyBiometric('Desbloquea GymSheet');
    lock.setPrompting(false);
    setChecking(false);
    if (result === 'passed') {
      lock.unlock();
    } else if (result === 'failed') {
      setError('No te reconocimos. Inténtalo de nuevo o entra con tu contraseña.');
    }
  }, [kind]);

  useEffect(() => {
    void unlock();
    // Only on appearing: a retry is the member's decision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = greetingName(principal?.nombreCompleto);
  const label = kind?.label ?? 'Face ID o huella';

  return (
    <View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 1000 }]}
    >
      <SafeAreaView style={{ flex: 1, padding: spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: radii.full,
              borderWidth: 2,
              // Ornamento, no acción: el acento queda para el botón (accentPolicy).
              borderColor: error ? colors.danger : colors.border,
              backgroundColor: colors.surfaceLow,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              color={error ? colors.danger : accentPolicy.glyph}
              name={kind?.icon ?? 'lock-closed-outline'}
              size={52}
            />
          </View>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: '800', textAlign: 'center' }}
          >
            {name ? `Hola, ${name}` : 'Tu sesión sigue abierta'}
          </Text>
          <Text
            style={{
              color: error ? colors.danger : colors.textMuted,
              fontSize: fontSizes.md,
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 320,
            }}
          >
            {error ?? `Para cuidar tus datos, GymSheet se abre con ${label}.`}
          </Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <Button label={`Desbloquear con ${label}`} loading={checking} onPress={() => void unlock()} />
          <Button label="Usar otra cuenta" onPress={() => void logout()} variant="ghost" />
        </View>
      </SafeAreaView>
    </View>
  );
}
