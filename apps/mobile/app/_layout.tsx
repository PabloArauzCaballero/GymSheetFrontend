import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/app-providers';
import { useAuthStore } from '@/state/auth-store';

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  // El icono se dibuja con una fuente que se carga aparte, asi que en el primer
  // render sale un hueco. Da igual en una pestana, pero la primera pantalla que
  // ve alguien nuevo es el tutorial, y ahi el hueco es lo primero que se ve.
  // Esperar a la fuente cuesta unos milisegundos y evita esa primera impresion.
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Negro, no un spinner: es el mismo color que el fondo de la app, asi que la
  // espera se lee como parte del arranque y no como una pantalla mas.
  if (!fontsLoaded) return null;

  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
