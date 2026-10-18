import type { Metadata } from 'next';
import { ExerciseDetail } from '@/features/exercises/components/exercise-detail';
import { CommentsSection } from '@/features/routine-community/components/comments-section';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Detalle de ejercicio' };

export default async function ExercisePage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [session, routeParams] = await Promise.all([requireSession(), params]);
  return (
    <div className="grid gap-8">
      <ExerciseDetail id={routeParams.id} currentUserId={session.id} role={session.role} />
      {/* Consejos y dudas de otras personas: la misma API que en el móvil. */}
      <section
        aria-labelledby="exercise-comments"
        className="panel grid gap-5 p-5"
        data-testid="exercise-comments"
      >
        <h2 className="text-lg font-semibold tracking-[-0.02em]" id="exercise-comments">
          Comentarios
        </h2>
        <CommentsSection id={routeParams.id} kind="EXERCISE" />
      </section>
    </div>
  );
}
