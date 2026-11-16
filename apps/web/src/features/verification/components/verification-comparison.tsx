import { verificationReviewCopy as copy } from '@gymsheet/domain';
import type { VerificationQueueItem } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';

/** Selfie and the visible profile photos side by side (stacked on narrow screens). */
export function VerificationComparison({
  item,
  selfieSrc,
}: Readonly<{ item: Pick<VerificationQueueItem, 'member' | 'profilePhotos'>; selfieSrc: string | null }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="grid gap-2">
        <div className="aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-low)]">
          {selfieSrc ? (
            <DomainImage alt={`${copy.selfie} de ${item.member.name}`} proxy={false} src={selfieSrc} />
          ) : (
            <p className="t-subhead grid size-full place-items-center p-4 text-center text-[var(--text-muted)]">{copy.noSelfie}</p>
          )}
        </div>
        <figcaption className="data-label text-[var(--text-muted)]">{copy.selfie}</figcaption>
      </figure>
      <figure className="grid content-start gap-2">
        <ul className="grid grid-cols-2 gap-2" data-testid="compared-photos">
          {item.profilePhotos.map((photo, index) => (
            <li className="aspect-[3/4] overflow-hidden rounded-[var(--radius-md)]" key={photo.id}>
              <DomainImage alt={`Foto ${index + 1} del perfil de ${item.member.name}`} src={photo.url} />
            </li>
          ))}
        </ul>
        <figcaption className="data-label text-[var(--text-muted)]">{copy.photos}</figcaption>
      </figure>
    </div>
  );
}
