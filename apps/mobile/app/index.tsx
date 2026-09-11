import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/state/auth-store';
import { colors } from '@/theme';

/** Entry gate: waits for session hydration, then routes to the right group. */
export default function Index() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    /**
     * Fondo, no `ActivityIndicator`.
     *
     * Esta vista está **debajo** de la cortinilla de marca (`BrandIntro`, que la
     * raíz monta encima mientras arranca la aplicación), así que casi nunca se
     * ve: la cortinilla espera a que la sesión resuelva. Sólo asoma si la
     * resolución se pasa del presupuesto de la cortinilla, y justo por eso tiene
     * que ser el mismo negro del que sale la escena. Un indicador de carga ahí
     * sería un salto: la marca disolviéndose y, de golpe, una ruedecita
     * genérica. El negro continuo hace que la entrega se lea como parte del
     * arranque y no como una pantalla más.
     */
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Redirect href={status === 'authenticated' ? '/home' : '/(auth)/login'} />;
}
