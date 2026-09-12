'use client';

import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Target, User } from 'lucide-react';
import { useState } from 'react';
import type { GymDirectoryEntry, SwipeDirection } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { chipHeartbeat } from '@/shared/components/ui/badge';
import { trainingGoalLabels } from './directory-labels';

const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

/** Umbral de arrastre que confirma la decisión, en píxeles. */
export const SWIPE_THRESHOLD = 120;
/** A dónde sale la tarjeta al confirmarse: fuera del viewport, sin rebote. */
const EXIT_DISTANCE = 420;

/**
 * Una tarjeta de la baraja.
 *
 * Sólo la de arriba arrastra y responde: las de abajo son profundidad, no
 * contenido interactivo, y dejarlas enfocables duplicaría cada control en el
 * recorrido con teclado.
 */
export function SwipeCard({
  entry,
  position,
  onDecide,
}: Readonly<{
  entry: GymDirectoryEntry;
  position: number;
  onDecide: (direction: SwipeDirection) => void;
}>) {
  const reduceMotion = useReducedMotion();
  const isTop = position === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const likeOpacity = useTransform(x, [24, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24], [1, 0]);
  const [exitX, setExitX] = useState(0);

  const experience = entry.experienceLevel ? EXPERIENCE_LABELS[entry.experienceLevel] : null;
  const objetivo = entry.objetivo ? (trainingGoalLabels[entry.objetivo] ?? entry.objetivo) : null;

  return (
    <motion.div
      animate={{ scale: 1 - position * 0.05, y: position * 14, opacity: position > 2 ? 0 : 1 }}
      className="absolute inset-0 touch-none overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-lowest)] shadow-[var(--shadow-lg)]"
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      exit={reduceMotion ? { opacity: 0 } : { x: exitX, opacity: 0, rotate: exitX > 0 ? 18 : -18 }}
      initial={false}
      onDragEnd={(_event, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
          setExitX(EXIT_DISTANCE);
          onDecide('LIKE');
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
          setExitX(-EXIT_DISTANCE);
          onDecide('PASS');
        }
      }}
      style={isTop ? { x, rotate } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <CardGallery entry={entry} interactive={isTop} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-2 bg-gradient-to-t from-[rgb(var(--scrim-channels)/0.85)] via-[rgb(var(--scrim-channels)/0.4)] to-transparent p-5 pt-16 text-white">
        <p className="text-2xl font-semibold tracking-[-0.02em]">
          {entry.displayName}
          {entry.age !== null ? (
            <span className="ml-2 font-normal opacity-90">{entry.age}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90">
          {objetivo ? (
            <span className="inline-flex items-center gap-1.5">
              <Target aria-hidden className="size-3.5" />
              {objetivo}
            </span>
          ) : null}
          {entry.branchName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5" />
              {entry.branchName}
            </span>
          ) : null}
        </div>
        {/* Este chip no puede ser `Badge`: va sobre la foto, con la paleta
            invertida del degradado. Toma de alli solo el latido, para que sea
            literalmente el mismo movimiento que el del resto de la aplicacion y
            no una copia que se desincronice al retocar uno de los dos.

            Late solo el de la carta de encima. Las de debajo asoman por los
            bordes, y algo latiendo en un monton de cartas apiladas parece un
            fallo de pintado, no un acento. */}
        {experience ? (
          <span
            className={`w-fit rounded-[var(--radius-sm)] border border-white/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${isTop ? chipHeartbeat : ''}`}
          >
            {experience}
          </span>
        ) : null}
      </div>
      {isTop ? (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute right-5 top-6 rounded-[var(--radius-md)] border-4 border-[var(--volt)] px-3 py-1 text-2xl font-black uppercase tracking-wider text-[var(--volt)]"
            style={{ opacity: likeOpacity, rotate: 12 }}
          >
            Me gusta
          </motion.span>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-5 top-6 rounded-[var(--radius-md)] border-4 border-white px-3 py-1 text-2xl font-black uppercase tracking-wider text-white"
            style={{ opacity: passOpacity, rotate: -12 }}
          >
            Paso
          </motion.span>
        </>
      ) : null}
    </motion.div>
  );
}

/**
 * La galería de la tarjeta.
 *
 * Los pasos son botones de verdad —no zonas táctiles— para que el teclado
 * llegue a ellos y el lector de pantalla anuncie en qué foto está. Con una
 * sola foto no se pinta ningún control: un carrusel de un elemento es ruido.
 */
function CardGallery({
  entry,
  interactive,
}: Readonly<{ entry: GymDirectoryEntry; interactive: boolean }>) {
  const [index, setIndex] = useState(0);
  // `photos` es la galería ordenada; `photoUrl` es su portada. Si el backend
  // todavía no devolvió galería para alguien, la portada sola sigue sirviendo.
  const photos = entry.photos.length
    ? entry.photos.map((photo) => photo.url)
    : entry.photoUrl
      ? [entry.photoUrl]
      : [];
  const current = photos[Math.min(index, photos.length - 1)];

  return (
    <div className="absolute inset-0">
      {current ? (
        <DomainImage alt={`Foto de ${entry.displayName}`} src={current} />
      ) : (
        <div className="grid size-full place-items-center bg-[var(--surface-low)] text-[var(--text-disabled)]">
          <User aria-hidden className="size-16" />
        </div>
      )}
      {photos.length > 1 ? (
        <>
          <div aria-hidden className="absolute inset-x-3 top-3 flex gap-1.5">
            {photos.map((photo, position) => (
              <span
                className={
                  position === index
                    ? 'h-1 flex-1 rounded-full bg-white'
                    : 'h-1 flex-1 rounded-full bg-white/35'
                }
                key={photo}
              />
            ))}
          </div>
          {interactive ? (
            <>
              <GalleryStep
                direction="prev"
                disabled={index === 0}
                label="Foto anterior"
                onStep={() => setIndex((value) => Math.max(0, value - 1))}
              />
              <GalleryStep
                direction="next"
                disabled={index === photos.length - 1}
                label="Foto siguiente"
                onStep={() => setIndex((value) => Math.min(photos.length - 1, value + 1))}
              />
              <p className="sr-only" aria-live="polite">
                Foto {index + 1} de {photos.length}
              </p>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

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
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[rgb(var(--scrim-channels)/0.45)] text-white transition-opacity duration-[var(--dur-2)] disabled:pointer-events-none disabled:opacity-0 ${
        direction === 'prev' ? 'left-3' : 'right-3'
      }`}
      disabled={disabled}
      onClick={onStep}
      type="button"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
