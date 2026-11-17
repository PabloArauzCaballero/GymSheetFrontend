import { Redirect, Stack } from 'expo-router';
import { businessShellRedirect } from '@/features/business/business-routing';
import { detailStackOptions } from '@/lib/screen-options';
import { useAuthStore } from '@/state/auth-store';

/**
 * The business shell (ADR-0020): mounted only for a business session. A
 * person goes to the person tabs; a signed-out session to login. Above the
 * tabs, «completar» finishes the signup (steps 2–3), «verificar» the KYC
 * (steps 4–7) and «verificacion» shows its status.
 */
export default function BusinessLayout() {
  const status = useAuthStore((state) => state.status);
  const principal = useAuthStore((state) => state.principal);
  const away = businessShellRedirect(status, principal);
  if (away) return <Redirect href={away} />;
  return (
    <Stack screenOptions={detailStackOptions}>
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="completar" />
      <Stack.Screen name="verificar" />
      <Stack.Screen name="verificacion" />
      {/* Franja 8c: a new listing, one listing, and a location of «Perfil». */}
      <Stack.Screen name="publicacion-nueva" />
      <Stack.Screen name="publicacion/[id]" />
      <Stack.Screen name="sede" />
      {/* Franja 8d: one order of «Pedidos» and «Cobro» (bank data and QR). */}
      <Stack.Screen name="pedido/[id]" />
      <Stack.Screen name="cobro" />
      {/* Franja 7b: a gym's «Socios» and a coach's «Mis gimnasios»; 8e: «Suscriptores». */}
      <Stack.Screen name="socios" />
      <Stack.Screen name="suscriptores" />
      <Stack.Screen name="gimnasios" />
      {/* Franja 8f: one conversation of «Mensajes». */}
      <Stack.Screen name="conversacion/[id]" />
    </Stack>
  );
}
