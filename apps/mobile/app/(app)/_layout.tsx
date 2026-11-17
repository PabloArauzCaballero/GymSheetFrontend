import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { TourOverlay } from '@/components/tour';
import { NudgeSync } from '@/features/nudge/nudge-sync';
import { OnboardingGuard } from '@/features/onboarding-guard/onboarding-guard';
import { detailStackOptions } from '@/lib/screen-options';
import { personShellRedirect } from '@/features/business/business-routing';
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
 * The session guard, the onboarding guard and the tour live here rather than one
 * level down so they cover the pushed screens too. The onboarding guard is the
 * only thing that routes a CLIENTE into (or out of) `/onboarding`.
 */
export default function AppLayout() {
  const status = useAuthStore((state) => state.status);
  const farewell = useAuthStore((state) => state.farewell);
  const principal = useAuthStore((state) => state.principal);
  // Se hidrata una vez, aqui: montarlo en una pantalla haria que el tour
  // reapareciera cada vez que esa pantalla se remonta.
  const hydrateTour = useTourStore((state) => state.hydrate);
  useEffect(() => {
    void hydrateTour();
  }, [hydrateTour]);

  // Protect the entire private group from unauthenticated access.
  // A closed account says goodbye first; any other exit goes to login.
  if (status === 'unauthenticated') {
    return <Redirect href={farewell ? '/(auth)/hasta-pronto' : '/(auth)/login'} />;
  }
  // A business account never mounts the person tabs (ADR-0020).
  const businessHome = personShellRedirect(principal);
  if (businessHome) return <Redirect href={businessHome} />;

  return (
    <>
      <Stack screenOptions={detailStackOptions}>
        {/* The tab bar itself. No push animation: it is the root of this
            stack, not something you navigate to. */}
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" />
        {/* Optional «Conocer» step after the questionnaire; also opened from Perfil. */}
        <Stack.Screen name="onboarding-conocer" />
        {/* Inicio dejó de ser pestaña (08/11/2026): la barra pasó a Mensajes ·
            Comunidad · Marketplace · Rutinas · Perfil. La pantalla sigue
            existiendo en la pila con la misma URL (`/home`). */}
        <Stack.Screen name="home" />
        <Stack.Screen name="trayectoria" />
        <Stack.Screen name="camino" />
        {/* Entrenos. Era la cuarta pestaña hasta que Comunidad hizo seis y
            «Comunidad» dejó de caber en la barra. Baja aquí por la misma regla
            que el resto: es historial que se consulta, no un destino diario. Se
            alcanza desde «Últimas sesiones» en Inicio y desde Perfil. La URL no
            cambia —los grupos no aparecen en la ruta—, así que `/workouts` y
            `/workouts/[id]` siguen siendo las mismas. */}
        <Stack.Screen name="workouts" />
        {/* El catálogo de ejercicios. Era pestaña hasta C4; ahora es una pila
            propia (buscador → ficha, músculos → músculo) que se abre desde
            Rutinas y desde Perfil. Las rutas salen de `@/lib/routes`. */}
        <Stack.Screen name="ejercicios" />
        <Stack.Screen name="ejercicio-nuevo" />
        <Stack.Screen name="settings" />
        {/* Marketplace (franja 8c): a business profile by @handle and a public listing. */}
        <Stack.Screen name="negocio/[handle]" />
        <Stack.Screen name="publicacion/[id]" />
        {/* «Mis compras» under Perfil and one order (franja 8d). */}
        <Stack.Screen name="compras/index" />
        <Stack.Screen name="compras/[id]" />
        {/* «Mi gimnasio» by the confirmed SOCIO and «Mis afiliaciones» (franjas 7b–7c). */}
        <Stack.Screen name="mi-gimnasio" />
        <Stack.Screen name="afiliaciones" />
        <Stack.Screen name="dispositivos" />
        {/* Privacidad y datos (franja 4): consents, export and account rights. */}
        <Stack.Screen name="datos-privacidad" />
        <Stack.Screen name="cambiar-correo" />
        <Stack.Screen name="cambiar-nombre" />
        <Stack.Screen name="cerrar-cuenta" />
        <Stack.Screen name="verificar-correo" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="registrar-peso" />
        <Stack.Screen name="membership" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="notifications-inbox" />
        <Stack.Screen name="reels" />
        <Stack.Screen name="training-invitations" />
        <Stack.Screen name="chat" />
      </Stack>
      <TourOverlay />
      {/* Repi: widgets, tarjeta de Inicio y notificaciones. Solo con sesión. */}
      {status === 'authenticated' ? <NudgeSync /> : null}
      {/* Last, so its overlay covers the stack and the tour while it decides. */}
      <OnboardingGuard />
    </>
  );
}
