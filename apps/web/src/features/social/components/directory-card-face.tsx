'use client';

import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { initialsOf } from '@/shared/components/media/person-avatar';
import { cn } from '@/shared/lib/cn';
import { experienceLevelLabels, trainingGoalLabels } from './directory-labels';

/** `photos` cuando llega; si no, la portada como única foto. */
export function galleryOf(entry: GymDirectoryEntry): { id: string; url: string }[] {
  if (entry.photos.length > 0) return entry.photos;
  return entry.photoUrl ? [{ id: 'cover', url: entry.photoUrl }] : [];
}

/**
 * La cara de una persona: foto a sangre y, encima, lo justo para decidir —
 * nombre, edad y una línea con objetivo, sucursal, experiencia y puntos.
 *
 * Es sólo la superficie: ni gesto de arrastre ni botones de decisión. Por eso
 * la comparten los tres sitios que enseñan a un socio —la baraja de Descubrir,
 * las tarjetas del directorio de Comunidad y la ficha ampliada—, igual que
 * `DirectoryCardFace` en el móvil. Tres variantes parecidas es como empiezan a
 * divergir tres pantallas que deberían sentirse la misma.
 *
 * El carrusel es opcional (`onStepPhoto`): sin él no se pintan ni las barras ni
 * las flechas. Pintarlas en una tarjeta cuyo clic abre el perfil prometería una
 * navegación que ahí no existe, y una promesa así se nota al primer clic que no
 * hace nada.
 */
export function DirectoryCardFace({
  entry,
  fill = false,
  interactive = true,
  onInfo,
  onOpen,
  onStepPhoto,
  photoIndex,
}: Readonly<{
  entry: GymDirectoryEntry;
  /** Ocupa el contenedor entero en vez de reservar un 4:5. Lo usa la baraja. */
  fill?: boolean;
  /** Las cartas de debajo del mazo son profundidad, no contenido enfocable. */
  interactive?: boolean;
  /** Si se pasa, aparece el botón de la esquina que abre la ficha ampliada. */
  onInfo?: () => void;
  /**
   * Abrir el perfil al pulsar la foto.
   *
   * Es un botón **hermano** de los controles, no un envoltorio: los pasos de
   * galería y la esquina de información son botones de verdad, y un botón
   * dentro de otro es HTML inválido — el navegador deshace el anidamiento y el
   * resultado depende de él, no del código. Va antes en el DOM y sin `z`, así
   * que los controles quedan por encima y se llevan sus propios clics.
   */
  onOpen?: () => void;
  /** Mover el carrusel: +1 adelante, −1 atrás. Sin él, el carrusel es estático. */
  onStepPhoto?: (delta: number) => void;
  /** Foto visible. La posición la lleva quien monta la tarjeta. */
  photoIndex?: number;
}>) {
  // Carrusel no controlado cuando nadie lo gobierna desde fuera: una tarjeta de
  // lista quiere pasar fotos sin que la pantalla entera tenga que llevar cuenta.
  const [ownIndex, setOwnIndex] = useState(0);
  const photos = galleryOf(entry);
  const controlled = photoIndex !== undefined;
  const index = Math.min(Math.max(controlled ? photoIndex : ownIndex, 0), Math.max(photos.length - 1, 0));
  const current = photos[index] ?? null;

  const step = (delta: number) => {
    if (onStepPhoto) onStepPhoto(delta);
    else setOwnIndex((value) => Math.min(Math.max(value + delta, 0), photos.length - 1));
  };
  const canStep = photos.length > 1 && interactive;

  const meta = [
    entry.objetivo ? (trainingGoalLabels[entry.objetivo] ?? entry.objetivo) : null,
    entry.branchName,
    entry.experienceLevel ? (experienceLevelLabels[entry.experienceLevel] ?? entry.experienceLevel) : null,
    typeof entry.points === 'number' ? `${entry.points.toLocaleString('es-ES')}\u00A0pts` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    // Its own size container: the large-text layout (info button under the details) follows the card's width
    // wherever it is shown — deck, list or the profile preview — not whichever ancestor happens to be one.
    <div className={cn('@container relative overflow-hidden bg-[var(--surface-high)]', fill ? 'size-full' : 'aspect-[4/5] w-full')}>
      {current ? (
        <DomainImage alt={`Foto de ${entry.displayName}`} src={current.url} />
      ) : (
        // Same no-photo face as the app: the person's initials in a disc, not a generic glyph.
        <span className="grid size-full place-items-center bg-[var(--surface-high)]">
          <span aria-hidden className="grid size-24 place-items-center rounded-full bg-[var(--surface-highest)] text-2xl font-semibold text-[var(--text-muted)]">
            {initialsOf(entry.displayName)}
          </span>
        </span>
      )}

      {onOpen && interactive ? (
        <button
          aria-label={`Ver el perfil de ${entry.displayName}`}
          className="absolute inset-0"
          onClick={onOpen}
          type="button"
        />
      ) : null}

      {photos.length > 1 ? (
        <>
          {/* Un degradado corto arriba: sin él las barras blancas desaparecen
              sobre una foto clara, que es justo cuando hacen falta. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[rgb(var(--scrim-channels)/0.45)] to-transparent"
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-3 top-3 z-10 flex gap-1.5">
            {photos.map((photo, position) => (
              <span
                className={cn(
                  'h-[3px] flex-1 rounded-full',
                  position === index ? 'bg-white' : 'bg-white/35',
                )}
                key={photo.id}
              />
            ))}
          </div>
        </>
      ) : null}

      {canStep ? (
        <>
          <GalleryStep
            direction="prev"
            disabled={index === 0}
            label="Foto anterior"
            onStep={() => step(-1)}
          />
          <GalleryStep
            direction="next"
            disabled={index === photos.length - 1}
            label="Foto siguiente"
            onStep={() => step(1)}
          />
          <p aria-live="polite" className="sr-only">
            Foto {index + 1} de {photos.length}
          </p>
        </>
      ) : null}

      {/* Tres paradas y no dos: con dos, el tramo medio sube demasiado rápido y
          el degradado vuelve a leerse como una banda cortada a media foto. */}
      {/* Insets and controls stop growing past ×1.2 (px caps): at 200 % text the room goes to the words.
          With very large text (a card under 14rem wide, its own `@container`) the info button
          leaves the details' side and drops under them, so the details keep the card's full width. */}
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-10 grid gap-0.5 bg-[linear-gradient(to_top,rgb(var(--scrim-channels)/0.88)_0%,rgb(var(--scrim-channels)/0.45)_55%,transparent_100%)] px-[min(1.25rem,24px)] pb-[min(1.25rem,24px)] pt-16 text-white @max-[14rem]:pt-8', onInfo && interactive && 'pr-16 @max-[14rem]:pr-[min(1.25rem,24px)]')}>
        {/* Same steps as the app (2xl 34 / lg 22, bold). Text grows with the reader's size up to ×1.35 for the
            name and ×1.6 for the details (the app's maxFontSizeMultiplier): past that a photo card is all band. */}
        <p className={cn('font-bold leading-[1.1] tracking-[-0.02em] [overflow-wrap:anywhere]', fill ? 'text-[min(2.125rem,46px)]' : 'text-[min(1.375rem,30px)]')}>
          {entry.displayName}
          {entry.age !== null ? (
            <span className="ml-2 font-normal opacity-90">{entry.age}</span>
          ) : null}
        </p>
        {/* One plain line, as on the app: objetivo · sede · nivel · puntos. Chips over a photo were noise. */}
        {/* The «·» sits in the gap before each part, positioned outside it: the part that starts a
            line has its dot past the clipped left edge, so no line starts or ends with «·». */}
        {meta.length > 0 ? (
          <p className="mt-1 flex flex-wrap gap-x-3.5 overflow-hidden text-[min(0.9375rem,24px)] leading-[1.3] text-white/85">
            {meta.map((part) => (
              <span className="relative min-w-0" key={part}>
                <span aria-hidden className="absolute right-full w-3.5 text-center">·</span>
                {part}
              </span>
            ))}
          </p>
        ) : null}
        {onInfo && interactive ? (
          <button
            aria-label={`Ver la ficha de ${entry.displayName}`}
            className="tap pointer-events-auto absolute bottom-4 right-4 z-10 grid size-[min(2.75rem,56px)] place-items-center @max-[14rem]:static @max-[14rem]:mt-3 @max-[14rem]:justify-self-end rounded-full border border-white/30 bg-[rgb(var(--scrim-channels)/0.45)] text-white"
            onClick={(event) => {
              event.stopPropagation();
              onInfo();
            }}
            type="button"
          >
            <Info aria-hidden className="size-[min(1.25rem,24px)]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Los pasos son botones de verdad —no zonas táctiles— para que el teclado
 * llegue a ellos y el lector de pantalla anuncie en qué foto está.
 */
function GalleryStep({
  direction,
  disabled,
  label,
  onStep,
}: Readonly<{ direction: 'prev' | 'next'; disabled: boolean; label: string; onStep: () => void }>) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  // At 40 %, not 50 %: on a short card the middle is already the name band and the info button.
  // With very large text the band covers most of the card, so the arrows sit right under the progress bars.
  return (
    <button
      aria-label={label}
      className={cn(
        'absolute top-[40%] z-10 grid size-[min(2.75rem,56px)] -translate-y-1/2 place-items-center @max-[14rem]:top-14 @max-[14rem]:translate-y-0 rounded-full border border-white/30 bg-[rgb(var(--scrim-channels)/0.45)] text-white transition-opacity duration-[var(--dur-2)] disabled:pointer-events-none disabled:opacity-0',
        direction === 'prev' ? 'left-3' : 'right-3',
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onStep();
      }}
      type="button"
    >
      <Icon aria-hidden className="size-[min(1.25rem,24px)]" />
    </button>
  );
}
