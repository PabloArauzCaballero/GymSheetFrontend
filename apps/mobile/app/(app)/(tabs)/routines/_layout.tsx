import { Stack } from 'expo-router';
import { detailStackOptions } from '@/lib/screen-options';

/**
 * Entrando por un enlace directo a una rutina (o a sus comentarios), debajo
 * queda el catálogo: «volver» lleva a Rutinas y no a la pestaña Inicio.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function RoutinesLayout() {
  return (
    <Stack screenOptions={detailStackOptions}>
      {/* El detalle tiene una fila de estrellas que se elige ARRASTRANDO el
          dedo en horizontal. En iOS 26 «volver» se puede iniciar desde
          cualquier punto de la pantalla y se llevaba ese arrastre (la pantalla
          se iba de lado en vez de valorar). Aquí volver es desde el borde, el
          botón de la barra o, si se llegó desde una tarjeta, tirando hacia
          abajo (transición de zoom). */}
      <Stack.Screen name="[id]" options={{ fullScreenGestureEnabled: false }} />
    </Stack>
  );
}
