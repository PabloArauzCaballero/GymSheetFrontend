'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { usePrivateImage } from '@/shared/components/media/private-image';
import { Button } from '@/shared/components/ui/button';

const ZOOMS = [1, 1.5, 2, 3] as const;

/**
 * The private receipt with zoom (plan §4.2), fetched with the session through
 * the BFF (`no-store`) into an object URL. Zoom widens the image inside a
 * scrollable frame: the operation number and the amount can be read without
 * downloading anything.
 */
export function ReceiptViewer({ path, label }: Readonly<{ path: string; label: string }>) {
  const image = usePrivateImage(path);
  const [zoom, setZoom] = useState(0);
  const factor = ZOOMS[zoom] ?? 1;

  return (
    <figure className="m-0 grid gap-2">
      <div className="max-h-[70vh] overflow-auto overscroll-contain rounded-[var(--radius-lg)] bg-[var(--surface)]" aria-label={`${label}, ampliado ${factor}×`} role="group" tabIndex={0}>
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL of an authenticated, no-store fetch.
          <img alt={label} className="mx-auto block max-w-none object-contain" src={image.url} style={{ width: `${factor * 100}%` }} />
        ) : image.failed ? (
          <div className="grid min-h-48 place-items-center gap-2 p-6 text-center" role="alert">
            <p className="t-subhead text-[var(--text-muted)]">No se pudo cargar el comprobante.</p>
            <Button onClick={image.retry} size="sm" variant="ghost">Reintentar</Button>
          </div>
        ) : (
          <div aria-busy className="h-72 animate-pulse motion-reduce:animate-none" />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2">
        <span className="t-footnote text-[var(--text-muted)]">Privado: no se guarda en tu dispositivo.</span>
        <span className="flex items-center gap-1">
          <Button aria-label="Alejar" disabled={zoom === 0 || !image.url} onClick={() => setZoom((value) => value - 1)} size="icon" variant="ghost">
            <Minus aria-hidden className="size-4" />
          </Button>
          <output className="min-w-10 text-center text-sm tabular-nums">{factor}×</output>
          <Button aria-label="Acercar" disabled={zoom === ZOOMS.length - 1 || !image.url} onClick={() => setZoom((value) => value + 1)} size="icon" variant="ghost">
            <Plus aria-hidden className="size-4" />
          </Button>
        </span>
      </figcaption>
    </figure>
  );
}
