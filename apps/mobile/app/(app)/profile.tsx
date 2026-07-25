import { Screen, AppText } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';

export default function ProfileScreen() {
  const principal = useAuthStore((state) => state.principal);

  return (
    <Screen>
      <AppText variant="title">Perfil</AppText>
      <AppText variant="body">{principal?.nombreCompleto ?? '—'}</AppText>
      <AppText variant="muted">{principal?.email}</AppText>
      <AppText variant="muted">Rol: {principal?.role}</AppText>
    </Screen>
  );
}
