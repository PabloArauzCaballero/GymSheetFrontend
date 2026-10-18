import { ExerciseCommentsScreen } from '@/features/exercise-comments/exercise-comments-screen';

/** Comentarios de un ejercicio: `/ejercicios/:id/comentarios?escribir=1&responder=:commentId`. */
export default function ExerciseCommentsRoute() {
  return <ExerciseCommentsScreen />;
}
