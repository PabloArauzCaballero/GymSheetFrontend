'use client';

import { listingLimits } from '@gymsheet/schemas';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { confirmDelete, notify } from '@/shared/notifications';
import { listingErrorText } from '../lib/listing-errors';
import { businessListingsService, photoForm } from '../services/listings-client';

/** «Fotos» of the public profile (≤ 10): each write answers the whole gallery, which replaces the local copy. */
export function GalleryPanel({ initial }: Readonly<{ initial: string[] }>) {
  const [gallery, setGallery] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  const add = useMutation({
    mutationFn: (file: File) => businessListingsService.addGalleryPhoto(photoForm(file)),
    onSuccess: (result) => {
      setGallery(result.gallery);
      notify.success('Foto añadida a tu perfil.');
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const remove = useMutation({
    mutationFn: (position: number) => businessListingsService.removeGalleryPhoto(position),
    onSuccess: (result) => {
      setGallery(result.gallery);
      notify.success('Foto quitada.');
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
  async function askRemove(position: number) {
    const answer = await confirmDelete({ entity: `la foto ${position + 1} de tu perfil` });
    if (answer.confirmed) remove.mutate(position);
  }
  return (
    <section aria-labelledby="business-gallery" className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-headline" id="business-gallery">
          Fotos del perfil
        </h2>
        <Button disabled={gallery.length >= listingLimits.galleryMax} loading={add.isPending} onClick={() => input.current?.click()} size="sm" type="button" variant="ghost">
          <ImagePlus aria-hidden className="size-4" />
          Añadir
        </Button>
      </div>
      {gallery.length === 0 ? (
        <p className="t-subhead text-[var(--text-muted)]">Muestra tu local, tu equipo o tus productos. Se ven en tu perfil público.</p>
      ) : (
        <ul aria-label="Fotos del perfil" className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4">
          {gallery.map((url, position) => (
            <li className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]" key={url}>
              <DomainImage alt={`Foto ${position + 1} del perfil`} className="size-full object-cover" src={url} />
              <button
                aria-label={`Quitar la foto ${position + 1}`}
                className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--background)_78%,transparent)] text-[var(--text)] backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-[var(--volt)] disabled:opacity-50"
                disabled={remove.isPending}
                onClick={() => void askRemove(position)}
                type="button"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        accept="image/jpeg,image/png"
        aria-label="Elegir una foto del perfil"
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
