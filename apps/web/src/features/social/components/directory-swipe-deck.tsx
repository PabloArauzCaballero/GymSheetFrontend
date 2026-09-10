'use client';

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Heart, MapPin, Target, User, X } from 'lucide-react';
import { useState } from 'react';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { DomainImage } from '@/shared/components/media/domain-image';
import { trainingGoalLabels } from './directory-labels';

const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

const SWIPE_THRESHOLD = 120;
const EXIT_DISTANCE = 420;

/**
 * Descubrimiento de socios al estilo Tinder: una tarjeta a la vez, se desliza
 * o se decide con los botones. "Pasar" es una decisión de esta sesión, no un
 * rechazo que se guarda — no hay endpoint para "ocultar a esta persona", así
 * que reaparece si se reinicia la cola. Solo entran a la cola quienes aún no
 * tienen ninguna relación (`connectionStatus === 'NONE'`); quien ya está
 * conectado vive en la pestaña "Mis conexiones", no aquí.
 */
export function DirectorySwipeDeck({
  entries,
  onLike,
  likePending,
}: Readonly<{
  entries: GymDirectoryEntry[];
  onLike: (userId: string) => void;
  likePending: boolean;
}>) {
  const [queue, setQueue] = useState(entries);
  const [passedCount, setPassedCount] = useState(0);

  function handlePass() {
    setPassedCount((count) => count + 1);
    setQueue((current) => current.slice(1));
  }

  function handleLike(userId: string) {
    onLike(userId);
    setQueue((current) => current.slice(1));
  }

  if (!queue.length) {
    return (
      <EmptyState
        action={
          passedCount > 0 ? (
            <button
              className="text-sm font-semibold text-[var(--accent-ink)]"
              onClick={() => {
                setQueue(entries);
                setPassedCount(0);
              }}
              type="button"
            >
              Ver de nuevo
            </button>
          ) : undefined
        }
        description="Ajusta los filtros o vuelve más tarde."
        title="No hay más socios para mostrar"
      />
    );
  }

  const visible = queue.slice(0, 3);
  const top = visible[0];

  return (
    <div className="grid justify-items-center gap-6">
      <div className="relative h-[26rem] w-full max-w-sm">
        <AnimatePresence>
          {[...visible].reverse().map((entry, reversedPosition) => (
            <SwipeCard
              entry={entry}
              key={entry.userId}
              onLike={() => handleLike(entry.userId)}
              onPass={handlePass}
              position={visible.length - 1 - reversedPosition}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-5">
        <button
          aria-label="Pasar"
          className="hover-lift tap grid size-14 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)]"
          onClick={handlePass}
          type="button"
        >
          <X className="size-6" />
        </button>
        <button
          aria-label="Conectar"
          className="hover-lift tap grid size-16 place-items-center rounded-full border border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)] disabled:pointer-events-none disabled:opacity-50"
          disabled={likePending}
          onClick={() => top && handleLike(top.userId)}
          type="button"
        >
          <Heart className="size-7" />
        </button>
      </div>
    </div>
  );
}

function SwipeCard({
  entry,
  position,
  onLike,
  onPass,
}: Readonly<{
  entry: GymDirectoryEntry;
  position: number;
  onLike: () => void;
  onPass: () => void;
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
      animate={{
        scale: 1 - position * 0.05,
        y: position * 14,
        opacity: position > 2 ? 0 : 1,
      }}
      className="absolute inset-0 touch-none overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-lowest)] shadow-[0_28px_64px_-28px_rgb(0_0_0/0.4)]"
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      exit={reduceMotion ? { opacity: 0 } : { x: exitX, opacity: 0, rotate: exitX > 0 ? 18 : -18 }}
      initial={false}
      onDragEnd={(_event, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
          setExitX(EXIT_DISTANCE);
          onLike();
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
          setExitX(-EXIT_DISTANCE);
          onPass();
        }
      }}
      style={isTop ? { x, rotate } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <div className="absolute inset-0">
        {entry.photoUrl ? (
          <DomainImage alt={entry.displayName} src={entry.photoUrl} />
        ) : (
          <div className="grid size-full place-items-center bg-[var(--surface-low)] text-[var(--text-disabled)]">
            <User className="size-16" />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 grid gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 pt-16 text-white">
        <p className="text-2xl font-semibold tracking-[-0.02em]">{entry.displayName}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
          {objetivo ? (
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5" />
              {objetivo}
            </span>
          ) : null}
          {entry.branchName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {entry.branchName}
            </span>
          ) : null}
        </div>
        {experience ? (
          <span className="w-fit rounded-[4px] border border-white/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
            {experience}
          </span>
        ) : null}
      </div>
      {isTop ? (
        <>
          <motion.span
            className="absolute right-5 top-6 rounded-[6px] border-4 border-[var(--volt)] px-3 py-1 text-2xl font-black uppercase tracking-wider text-[var(--volt)]"
            style={{ opacity: likeOpacity, rotate: 12 }}
          >
            Conectar
          </motion.span>
          <motion.span
            className="absolute left-5 top-6 rounded-[6px] border-4 border-white px-3 py-1 text-2xl font-black uppercase tracking-wider text-white"
            style={{ opacity: passOpacity, rotate: -12 }}
          >
            Pasar
          </motion.span>
        </>
      ) : null}
    </motion.div>
  );
}
