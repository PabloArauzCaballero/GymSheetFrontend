import { Screen, AppText, Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { env } from '@/config/env';

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <Screen>
      <AppText variant="title">Ajustes</AppText>
      <AppText variant="muted">Entorno: {env.environment}</AppText>
      <AppText variant="muted">Versión 1.0.0</AppText>
      <Button label="Cerrar sesión" onPress={() => void logout()} />
    </Screen>
  );
}
