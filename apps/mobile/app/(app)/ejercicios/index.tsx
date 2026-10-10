import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { useScreenTour } from '@/components/tour';
import { ExerciseBrowser } from '@/features/exercise-browser/exercise-browser';

/**
 * The exercise catalogue. Artwork does the identifying work here — a name like
 * "Press inclinado con mancuernas" is far slower to recognise than its picture,
 * so every row leads with the image.
 *
 * El cuerpo (figura, buscador, zonas y lista) vive en `ExerciseBrowser`, que
 * también sirve de selector dentro del asistente de rutinas; esta pantalla lo
 * usa en modo `browse`.
 *
 * Desde C4 ya no es una pestaña sino una pantalla de la pila: se entra desde
 * Rutinas («Explorar ejercicios») o desde Perfil («Mis ejercicios y
 * favoritos», que llega con `?favoritos=1` y abre el filtro ☆ puesto), así que
 * lleva su «Volver». El tour `exercises` se dispara aquí la primera vez.
 */
export default function ExercisesScreen() {
  useScreenTour('exercises');
  const { favoritos } = useLocalSearchParams<{ favoritos?: string }>();
  const onlyFavorites = favoritos === '1' || favoritos === 'true';
  return (
    <ExerciseBrowser
      header={(subtitle) => (
        <>
          <BackLink />
          <ScreenHeader subtitle={subtitle} title="Ejercicios" tourKey="exercises" />
        </>
      )}
      initialFavorites={onlyFavorites}
      mode="browse"
    />
  );
}
