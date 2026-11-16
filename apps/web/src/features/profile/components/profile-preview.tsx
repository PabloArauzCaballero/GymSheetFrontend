'use client';

import { useRef, useState } from 'react';
import { DirectoryCardFace } from '@/features/social/components/directory-card-face';
import { MemberDetailSheet } from '@/features/social/components/member-detail-sheet';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { useFitCardWidth } from '../hooks/use-fit-card-width';

/**
 * «Ver como te ven»: tu carta con los mismos componentes de la baraja de
 * Conocer y la misma ficha ampliada. Si algo no sale aquí, los demás tampoco lo ven.
 */
export function ProfilePreview({ entry }: Readonly<{ entry: GymDirectoryEntry }>) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [detail, setDetail] = useState<GymDirectoryEntry | null>(null);
  const count = Math.max(entry.photos.length, 1);
  const cardRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const width = useFitCardWidth(cardRef, ctaRef);
  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4" data-testid="profile-preview">
      {/* Card + CTA fit above the tab bar (see useFitCardWidth); before measuring, a CSS cap from the
          viewport height minus the app chrome. The hint goes last: the card is what you came to see. */}
      <div
        className="mx-auto grid w-[min(100%,calc((100dvh-var(--preview-chrome))*0.8))] gap-4 [--preview-chrome:13rem] lg:[--preview-chrome:9rem]"
        ref={cardRef}
        style={width ? { width } : undefined}
      >
        <div className="overflow-hidden rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)]" data-testid="profile-preview-card">
          <DirectoryCardFace
            entry={entry}
            onInfo={() => setDetail(entry)}
            onStepPhoto={(delta) => setPhotoIndex((index) => (index + delta + count) % count)}
            photoIndex={photoIndex}
          />
        </div>
        <Button onClick={() => setDetail(entry)} ref={ctaRef} variant="ghost">
          Ver ficha completa
        </Button>
      </div>
      <p className="t-footnote text-pretty text-center text-[var(--text-muted)]">Así te ven en Conocer. Tu estado social solo lo ven tus conexiones.</p>
      <MemberDetailSheet entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
