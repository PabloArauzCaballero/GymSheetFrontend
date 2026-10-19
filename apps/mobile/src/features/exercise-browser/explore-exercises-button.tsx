import { useRouter } from 'expo-router';
import { Button, type ButtonSize } from '@/components/ui';
import { routes } from '@/lib/routes';

/**
 * «Explorar ejercicios» en la cabecera de Rutinas.
 *
 * Desde C4 el catálogo de ejercicios no tiene pestaña: es la herramienta con la
 * que se arman las rutinas, así que su puerta está donde se arman. Secundario
 * (`ghost`) y compacto, alineado a la izquierda bajo el título: la acción
 * principal de la pantalla sigue siendo «Crear rutina», la única en acento.
 */
export function ExploreExercisesButton({ size = 'md' }: { size?: ButtonSize } = {}) {
  const router = useRouter();
  return (
    <Button
      size={size}
      icon="search-outline"
      label="Explorar ejercicios"
      onPress={() => router.push(routes.exercises())}
      style={{ alignSelf: 'flex-start' }}
      variant="ghost"
    />
  );
}
