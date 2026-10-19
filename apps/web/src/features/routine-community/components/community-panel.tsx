import type { ContentKind } from '@gymsheet/types';
import { CommentsSection } from './comments-section';
import { RatingStars } from './rating-stars';

/** Valoración y comentarios de una rutina pública o de un ejercicio privado dentro de ella (RF-12). */
export function CommunityPanel({
  kind,
  id,
  isOwner,
  routineId,
  title = 'Comunidad',
}: Readonly<{ kind: ContentKind; id: string; isOwner: boolean; routineId?: string; title?: string }>) {
  return (
    <section aria-labelledby={`community-${id}`} className="panel grid gap-5 p-5" data-testid="community">
      <h2 className="text-lg font-semibold tracking-[-0.02em]" id={`community-${id}`}>
        {title}
      </h2>
      <RatingStars id={id} isOwner={isOwner} kind={kind} {...(routineId ? { routineId } : {})} />
      <CommentsSection id={id} kind={kind} />
    </section>
  );
}
