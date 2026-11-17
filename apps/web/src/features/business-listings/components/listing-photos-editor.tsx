'use client';

import { listingLimits } from '@gymsheet/schemas';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import type { OwnListing } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { confirmDelete } from '@/shared/notifications';
import { useListingWrite } from '../hooks/use-listing-write';
import { businessListingsService, photoForm } from '../services/listings-client';

/** Photos of a saved listing: add (JPG/PNG, ≤ 10) and remove. Adding is closed while REPP holds the listing. */
export function ListingPhotosEditor({ listing, locked }: Readonly<{ listing: OwnListing; locked: boolean }>) {
  const input = useRef<HTMLInputElement>(null);
  const add = useListingWrite(listing.id, (file: File) => businessListingsService.addPhoto(listing.id, photoForm(file)), 'Foto subida.');
  const remove = useListingWrite(listing.id, (position: number) => businessListingsService.removePhoto(listing.id, position), 'Foto quitada.');
  const archived = listing.status === 'ARCHIVED';
  async function askRemove(position: number) {
    const answer = await confirmDelete({ entity: `la foto ${position + 1} de la publicación` });
    if (answer.confirmed) remove.mutate(position);
  }
  const full = listing.mediaUrls.length >= listingLimits.mediaMax;
  return (
    <section aria-labelledby="listing-photos" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-headline" id="listing-photos">
          Fotos
        </h2>
        <Button
          disabled={locked || archived || full}
          loading={add.isPending}
          onClick={() => input.current?.click()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ImagePlus aria-hidden className="size-4" />
          Añadir
        </Button>
      </div>
      {listing.mediaUrls.length === 0 ? (
        <p className="t-subhead text-[var(--text-muted)]">Sin fotos todavía. La primera que subas es la portada.</p>
      ) : (
        <ul aria-label="Fotos de la publicación" className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4">
          {listing.mediaUrls.map((url, position) => (
            <li className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]" key={url}>
              <DomainImage alt={`Foto ${position + 1}`} className="size-full object-cover" src={url} />
              {archived ? null : (
                <button
                  aria-label={`Quitar la foto ${position + 1}`}
                  className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--background)_78%,transparent)] text-[var(--text)] backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-[var(--volt)] disabled:opacity-50"
                  disabled={remove.isPending}
                  onClick={() => void askRemove(position)}
                  type="button"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <input
        accept="image/jpeg,image/png"
        aria-label="Elegir una foto"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) add.mutate(file);
          event.target.value = '';
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
    </section>
  );
}
