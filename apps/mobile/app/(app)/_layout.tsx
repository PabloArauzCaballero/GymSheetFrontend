import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { TourOverlay } from '@/components/tour';
import { detailStackOptions } from '@/lib/screen-options';
import { useAuthStore } from '@/state/auth-store';
import { useTourStore } from '@/state/tour-store';

/**
 * The private area: a stack whose first screen is the tab bar.
 *
 * The six screens below the tabs — Trayectoria, Nuevo ejercicio, Ajustes,
 * Editar perfil, Membresía, Notificaciones — are reached from Home, Ejercicios
 * or Perfil and pushed over the bar. Four of them used to be declared inside
 * the tab navigator with `href: null`, which hides the button but keeps the
 * screen a member of the bar: VoiceOver announced «Inicio, pestaña, 1 de 9»
 * over five reachable destinations. As stack siblings they keep their URLs,
 * get the push transition and edge-swipe every other detail screen has, and
 * the bar counts to five.
 *
 * La senda entra aquí por la misma regla: cinco es el techo de una barra
 * inferior antes de que las etiquetas empiecen a truncarse. Se abre desde una
 * tarjeta destacada en Inicio, que además la pone en el recorrido diario en vez
 * de esconderla detrás de un sexto icono.
 *
 * The session guard and the tour live here rather than one level down so both
 * cover the pushed screens too.
 */
export default function AppLayout() {
  const status = useAuthStore((state) => state.status);
  // Se hidrata una vez, aqui: montarlo en una pantalla haria que el tour
  // reapareciera cada vez que esa pantalla se remonta.
  const hydrateTour = useTourStore((state) => state.hydrate);
  useEffect(() => {
    void hydrateTour();
  }, [hydrateTour]);

  // Protect the entire private group from unauthenticated access.
  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <Stack screenOptions={detailStackOptions}>
        {/* The tab bar itself. No push animation: it is the root of this
            stack, not something you navigate to. */}
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="trayectoria" />
        <Stack.Screen name="ejercicio-nuevo" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="registrar-peso" />
        <Stack.Screen name="membership" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="comunidad-mensajes" />
        {/* La baraja de descubrimiento: se abre desde Comunidad y se cierra
            volviendo, así que es una hermana del resto de pantallas de detalle
            y no una sexta pestaña. */}
        <Stack.Screen name="descubrir" />
        <Stack.Screen name="chat" />
      </Stack>
      <TourOverlay />
    </>
  );
}
