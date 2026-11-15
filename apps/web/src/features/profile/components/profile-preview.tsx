'use client';

import { useState } from 'react';
import { DirectoryCardFace } from '@/features/social/components/directory-card-face';
import { MemberDetailSheet } from '@/features/social/components/member-detail-sheet';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';

/**
 * «Ver como te ven»: tu carta con los mismos componentes de la baraja de
 * Conocer y la misma ficha ampliada. Si algo no sale aquí, los demás tampoco lo ven.
 */
export function ProfilePreview({ entry }: Readonly<{ entry: GymDirectoryEntry }>) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [detail, setDetail] = useState<GymDirectoryEntry | null>(null);
  const count = Math.max(entry.photos.length, 1);
  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4" data-testid="profile-preview">
      <p className="t-subhead text-[var(--text-muted)]">Así te ven en Conocer. Tu estado social solo lo ven tus conexiones.</p>
      <DirectoryCardFace
        entry={entry}
        onInfo={() => setDetail(entry)}
        onStepPhoto={(delta) => setPhotoIndex((index) => (index + delta + count) % count)}
        photoIndex={photoIndex}
      />
      <Button onClick={() => setDetail(entry)} variant="ghost">
        Ver ficha completa
      </Button>
      <MemberDetailSheet entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
