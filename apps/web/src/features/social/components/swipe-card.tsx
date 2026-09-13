'use client';

import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useState } from 'react';
import type { GymDirectoryEntry, SwipeDirection } from '@/shared/api/schemas';
import { DirectoryCardFace, galleryOf } from './directory-card-face';

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
 *
 * La cara —foto a sangre, carrusel, nombre y edad— es la misma pieza que usan
 * las tarjetas del directorio (`DirectoryCardFace`). Lo propio de la baraja es
 * lo de fuera: el arrastre, los sellos y la salida.
 */
export function SwipeCard({
  entry,
  position,
  onDecide,
  onInfo,
}: Readonly<{
  entry: GymDirectoryEntry;
  position: number;
  onDecide: (direction: SwipeDirection) => void;
  onInfo: () => void;
}>) {
  const reduceMotion = useReducedMotion();
  const isTop = position === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const likeOpacity = useTransform(x, [24, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24], [1, 0]);
  const [exitX, setExitX] = useState(0);
  // La foto visible se ata a la carta: heredar la cuarta foto de la anterior
  // abriría la baraja por la mitad de la historia de otra persona.
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoCount = galleryOf(entry).length;

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
      <DirectoryCardFace
        entry={entry}
        fill
        interactive={isTop}
        onInfo={onInfo}
        onStepPhoto={(delta) =>
          setPhotoIndex((value) => Math.min(Math.max(value + delta, 0), photoCount - 1))
        }
        photoIndex={photoIndex}
      />
      {isTop ? (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute right-5 top-6 rounded-[var(--radius-md)] border-4 border-[var(--volt)] px-3 py-1 text-2xl font-black uppercase tracking-wider text-[var(--volt)]"
            style={{ opacity: likeOpacity, rotate: 12 }}
          >
            Me interesa
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
