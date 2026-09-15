import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { SessionSummary } from '@/components/session-summary';
import { Button } from '@/components/ui';
import { useSessionRewardStore } from '@/state/session-reward-store';
import { colors, fontSizes } from '@/theme';

/**
 * Pantalla «Sesión terminada».
 *
 * Reemplaza a la sesión en la pila, así que «atrás» no vuelve a una sesión ya
 * cerrada. Lee la recompensa del almacén en memoria; si la app se reinició aquí
 * y ya no está, lo dice y lleva a la senda, donde los puntos sí están.
 */
export default function SessionSummaryScreen() {
  const router = useRouter();
  const last = useSessionRewardStore((state) => state.last);
  const clear = useSessionRewardStore((state) => state.clear);

  // Se vacía al salir, no al pulsar: vaciarlo antes de navegar pintaría un
  // fotograma del estado vacío.
  useEffect(() => clear, [clear]);

  const goToList = () => router.replace('/workouts');

  return (
    <ScrollScreen>
      <ScreenHeader subtitle="Buen trabajo. Esto es lo que te llevas." title="Sesión terminada" />
      {last ? (
        <SessionSummary onContinue={goToList} session={last} />
      ) : (
        <>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, lineHeight: 24 }}>
            Tu sesión se guardó y sus puntos ya están en tu senda.
          </Text>
          <Button label="Ver mi senda" onPress={() => router.replace('/trayectoria')} />
          <Button label="Seguir" onPress={goToList} variant="ghost" />
        </>
      )}
    </ScrollScreen>
  );
}
