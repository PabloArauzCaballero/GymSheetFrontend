import { ScreenHeader } from '@/components/layout';
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
 */
export default function ExercisesScreen() {
  useScreenTour('exercises');
  return (
    <ExerciseBrowser
      header={(subtitle) => <ScreenHeader subtitle={subtitle} title="Ejercicios" tourKey="exercises" />}
      mode="browse"
    />
  );
}
