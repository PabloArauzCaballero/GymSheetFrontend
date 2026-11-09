'use client';

import { ChevronLeft, ChevronRight, Dumbbell, Info, MapPin, Trophy, User } from 'lucide-react';
import { useState } from 'react';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';
import { experienceLevelLabels, trainingGoalLabels } from './directory-labels';

/** `photos` cuando llega; si no, la portada como única foto. */
export function galleryOf(entry: GymDirectoryEntry): { id: string; url: string }[] {
  if (entry.photos.length > 0) return entry.photos;
  return entry.photoUrl ? [{ id: 'cover', url: entry.photoUrl }] : [];
}

/**
 * La cara de una persona: foto a sangre y, encima, lo justo para decidir —
 * nombre, edad, objetivo, sucursal y experiencia.
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

  const objetivo = entry.objetivo ? (trainingGoalLabels[entry.objetivo] ?? entry.objetivo) : null;
  const experience = entry.experienceLevel
    ? (experienceLevelLabels[entry.experienceLevel] ?? entry.experienceLevel)
    : null;

  return (
    <div className={cn('relative overflow-hidden bg-[var(--surface-high)]', fill ? 'size-full' : 'aspect-[4/5] w-full')}>
      {current ? (
        <DomainImage alt={`Foto de ${entry.displayName}`} src={current.url} />
      ) : (
        <span className="grid size-full place-items-center bg-[var(--surface-low)] text-[var(--text-disabled)]">
          <User aria-hidden className="size-16" />
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 grid gap-2 bg-[linear-gradient(to_top,rgb(var(--scrim-channels)/0.88)_0%,rgb(var(--scrim-channels)/0.45)_55%,transparent_100%)] p-5 pt-16 text-white">
        <p className={cn('font-semibold tracking-[-0.02em]', fill ? 'text-3xl' : 'text-xl')}>
          {entry.displayName}
          {entry.age !== null ? (
            <span className="ml-2 font-normal opacity-90">{entry.age}</span>
          ) : null}
        </p>
        {/* Chips del móvil sobre la foto: sede, objetivo y puntos (este en acento). */}
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.branchName ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--background)_70%,transparent)] px-2.5 py-1 text-xs font-semibold">
              <MapPin aria-hidden className="size-3 opacity-85" />
              {entry.branchName}
            </span>
          ) : null}
          {objetivo ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--background)_70%,transparent)] px-2.5 py-1 text-xs font-semibold">
              <Dumbbell aria-hidden className="size-3 text-[var(--accent-ink)]" />
              {objetivo}
            </span>
          ) : null}
          {typeof entry.points === 'number' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--volt)_18%,transparent)] px-2.5 py-1 text-xs font-bold tabular-nums text-[var(--accent-ink)]">
              <Trophy aria-hidden className="size-3" />
              {`${entry.points.toLocaleString('es-ES')} pts`}
            </span>
          ) : null}
          {experience ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--background)_70%,transparent)] px-2.5 py-1 text-xs font-semibold">
              {experience}
            </span>
          ) : null}
        </div>
      </div>

      {onInfo && interactive ? (
        <button
          aria-label={`Ver la ficha de ${entry.displayName}`}
          className="tap absolute bottom-4 right-4 z-10 grid size-11 place-items-center rounded-full border border-white/30 bg-[rgb(var(--scrim-channels)/0.45)] text-white"
          onClick={(event) => {
            event.stopPropagation();
            onInfo();
          }}
          type="button"
        >
          <Info aria-hidden className="size-5" />
        </button>
      ) : null}
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
  return (
    <button
      aria-label={label}
      className={cn(
        'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[rgb(var(--scrim-channels)/0.45)] text-white transition-opacity duration-[var(--dur-2)] disabled:pointer-events-none disabled:opacity-0',
        direction === 'prev' ? 'left-3' : 'right-3',
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onStep();
      }}
      type="button"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
