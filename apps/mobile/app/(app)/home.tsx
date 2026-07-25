import { Screen, AppText } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { isStaff } from '@gymsheet/domain';

export default function HomeScreen() {
  const principal = useAuthStore((state) => state.principal);

  return (
    <Screen>
      <AppText variant="title">Hola, {principal?.nombreCompleto ?? principal?.email}</AppText>
      <AppText variant="muted">
        {isStaff(principal?.role)
          ? 'Panel de staff disponible en la versión web.'
          : 'Tu resumen de entrenamiento aparecerá aquí.'}
      </AppText>
    </Screen>
  );
}
