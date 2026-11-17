import { verificationReviewCopy as copy } from '@gymsheet/domain';
import type { ReactNode } from 'react';
import type { VerificationQueueItem } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';

const tile = 'aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-low)]';

/**
 * The selfie next to the visible profile photos, every tile the same size and
 * each group labelled above it. From `sm` up the selfie takes one of three
 * equal columns and the photos the other two (same gap inside and out, so the
 * tiles match); on a phone the selfie sits on top and the photos pair below.
 */
export function VerificationComparison({
  item,
  selfieSrc,
}: Readonly<{ item: Pick<VerificationQueueItem, 'member' | 'profilePhotos'>; selfieSrc: string | null }>) {
  return (
    <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
      <Group label={copy.selfie}>
        <div className={tile}>
          {selfieSrc ? (
            <DomainImage alt={`${copy.selfie} de ${item.member.name}`} proxy={false} src={selfieSrc} />
          ) : (
            <p className="t-subhead grid size-full place-items-center p-4 text-center text-[var(--text-muted)]">{copy.noSelfie}</p>
          )}
        </div>
      </Group>
      <Group className="sm:col-span-2" label={copy.photos}>
        <ul className="grid grid-cols-2 gap-4" data-testid="compared-photos">
          {item.profilePhotos.map((photo, index) => (
            <li className={tile} key={photo.id}>
              {/* Same path as every other member photo: the BFF media proxy. */}
              <DomainImage alt={`Foto ${index + 1} del perfil de ${item.member.name}`} src={photo.url} />
            </li>
          ))}
        </ul>
      </Group>
    </div>
  );
}

function Group({ className, label, children }: Readonly<{ className?: string; label: string; children: ReactNode }>) {
  return (
    <figure className={cn('grid content-start gap-2', className)}>
      <figcaption className="data-label text-[var(--text-muted)]">{label}</figcaption>
      {children}
    </figure>
  );
}
