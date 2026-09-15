import { Redirect, Stack } from 'expo-router';
import { authDestination } from '@gymsheet/domain';
import { useAuthStore } from '@/state/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);

  // Never show auth screens to an already-authenticated user.
  if (status === 'authenticated') {
    // El destino sale del paquete compartido: la web y el móvil usan rutas
    // distintas para la misma pantalla, pero la intención se declara una vez.
    return <Redirect href={authDestination.mobile.afterLogin} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
