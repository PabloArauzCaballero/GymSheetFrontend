'use client';

import { listingActions } from '@gymsheet/domain';
import { Archive, Pause, Play } from 'lucide-react';
import type { OwnListing } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { confirm } from '@/shared/notifications';
import { useListingWrite } from '../hooks/use-listing-write';
import { businessListingsService } from '../services/listings-client';

/** Pause, resume and archive (terminal). Open even while REPP holds the listing. */
export function ListingStateActions({ listing }: Readonly<{ listing: OwnListing }>) {
  const actions = listingActions(listing.status);
  const pause = useListingWrite(listing.id, () => businessListingsService.pause(listing.id), 'Pausada: nadie la ve hasta que la reanudes.');
  const resume = useListingWrite(listing.id, () => businessListingsService.resume(listing.id), 'Reanudada.');
  const archive = useListingWrite(listing.id, () => businessListingsService.archive(listing.id), 'Archivada.');
  const busy = pause.isPending || resume.isPending || archive.isPending;

  async function askArchive() {
    const answer = await confirm({
      title: '¿Archivar la publicación?',
      message: 'Sale del marketplace y ya no se puede volver a publicar ni editar.',
      confirmLabel: 'Archivar',
      severity: 'danger',
    });
    if (answer.confirmed) archive.mutate(undefined);
  }

  if (!actions.pause && !actions.resume && !actions.archive) return null;
  return (
    <section aria-labelledby="listing-state" className="grid gap-3">
      <h2 className="t-headline" id="listing-state">
        Estado
      </h2>
      <div className="flex flex-wrap gap-2">
        {actions.pause ? (
          <Button disabled={busy} loading={pause.isPending} onClick={() => pause.mutate(undefined)} type="button" variant="ghost">
            <Pause aria-hidden className="size-4" />
            Pausar
          </Button>
        ) : null}
        {actions.resume ? (
          <Button disabled={busy} loading={resume.isPending} onClick={() => resume.mutate(undefined)} type="button" variant="ghost">
            <Play aria-hidden className="size-4" />
            Reanudar
          </Button>
        ) : null}
        {actions.archive ? (
          <Button disabled={busy} loading={archive.isPending} onClick={() => void askArchive()} type="button" variant="ghost">
            <Archive aria-hidden className="size-4" />
            Archivar
          </Button>
        ) : null}
      </div>
    </section>
  );
}
