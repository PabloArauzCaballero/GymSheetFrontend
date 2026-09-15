'use client';

import { BREAKDOWN_LABEL, countUpDuration, type PointRuleLine } from '@gymsheet/domain';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionReward } from '@/shared/api/schemas';
import { progressionService } from '@/features/progression/services/progression-service';
import { writeSeen } from '@/features/progression/components/progression-celebration';
import {
  ProgressionCelebration,
  sessionRewardSubjects,
} from '@/features/progression/components/progression-celebration';
import { ProgressionIcon } from '@/features/progression/components/progression-icon';
import { CountUp } from '@/shared/components/motion/count-up';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { useReducedMotion } from '@/shared/hooks/use-reduced-motion';

/**
 * «Sesión terminada»: el momento en que la app enseña causa y efecto.
 *
 * Antes era un aviso de una línea. Ahora dice cuánto ganaste, por qué —cada
 * partida del desglose—, cómo mueve eso tu rango, y abre las cartas de lo que
 * conseguiste. Los números cuentan desde cero: verlos subir es lo que convierte
 * «tengo 74 puntos» en «he ganado 74 puntos».
 */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const BREAKDOWN_ORDER: ReadonlyArray<PointRuleLine['key']> = ['session', 'sets', 'volume', 'streak', 'badges'];
/** Pausa tras la última cifra antes de abrir las cartas solas. */
const AUTO_OPEN_PAUSE_MS = 600;

export function SessionSummary({
  reward,
  sets,
  duration,
  onClose,
}: Readonly<{ reward: SessionReward; sets: number; duration: string; onClose: () => void }>) {
  const still = useReducedMotion();
  const subjects = useMemo(() => sessionRewardSubjects(reward), [reward]);
  const [showingCards, setShowingCards] = useState(false);
  // El ascenso ya se anuncia aquí: se anota en la marca de la senda para que,
  // al entrar después, no vuelva a detectarlo contra el rango anterior.
  const levelAfter = reward.leveledUp ? reward.levelAfter : null;
  useEffect(() => {
    if (levelAfter) writeSeen(levelAfter);
  }, [levelAfter]);

  const acknowledged = useRef(false);
  const autoOpened = useRef(false);

  const rows = BREAKDOWN_ORDER.map((key) => ({ key, value: reward.breakdown[key] })).filter(
    (row) => row.value > 0,
  );
  const earnedMs = countUpDuration(0, reward.pointsEarned);
  const totalDelayMs = earnedMs * 0.5;
  const totalMs = countUpDuration(reward.pointsBefore, reward.pointsAfter);

  function openCards() {
    setShowingCards(true);
    // Vistas aquí, no vuelven a abrirse solas al entrar a la senda.
    if (!acknowledged.current) {
      acknowledged.current = true;
      progressionService.acknowledge().catch(() => undefined);
    }
  }

  // Las cartas se abren solas cuando las cifras terminan de contar, una vez.
  // Con «reducir movimiento» esperan al botón: nada aparece sin pedirlo.
  useEffect(() => {
    if (still || subjects.length === 0 || autoOpened.current) return;
    const timer = window.setTimeout(
      () => {
        autoOpened.current = true;
        openCards();
      },
      Math.max(earnedMs, totalDelayMs + totalMs) + AUTO_OPEN_PAUSE_MS,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, subjects.length]);

  const barColor = reward.nextLevel?.color ?? reward.levelAfter?.color ?? 'var(--volt)';
  const barFrames = reward.leveledUp
    ? [reward.levelProgressBefore, 1, 0, reward.levelProgress]
    : [reward.levelProgressBefore, reward.levelProgress];

  return (
    <>
      <Dialog onOpenChange={(open) => !open && onClose()} open={!showingCards}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[var(--overlay)]" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[var(--surface-lowest)] outline-none">
            <div className="mx-auto grid min-h-full w-full max-w-md content-center gap-8 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
              <header className="grid gap-2 text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-ink)]">
                  Buen trabajo
                </span>
                <DialogPrimitive.Title className="text-balance text-3xl font-semibold tracking-[-0.02em] text-[var(--text)]">
                  Sesión terminada
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-[var(--text-muted)]">
                  {`${duration} · ${sets} ${sets === 1 ? 'serie' : 'series'}`}
                </DialogPrimitive.Description>
              </header>

              <section className="grid justify-items-center gap-1">
                <p
                  aria-hidden
                  className="text-6xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] tabular-nums"
                >
                  +<CountUp value={reward.pointsEarned} />
                </p>
                <p aria-hidden className="text-sm text-[var(--text-muted)]">
                  puntos ganados
                </p>
                <p className="sr-only">{`Has ganado ${reward.pointsEarned} puntos.`}</p>
              </section>

              {rows.length > 0 ? (
                <ul aria-label="De dónde salen tus puntos" className="grid">
                  {rows.map((row, position) => (
                    <motion.li
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] py-3 text-sm last:border-b-0"
                      initial={still ? false : { opacity: 0, y: 8 }}
                      key={row.key}
                      transition={still ? { duration: 0 } : { delay: 0.2 + position * 0.08, duration: 0.3, ease: EASE_OUT }}
                    >
                      <span className="text-[var(--text-muted)]">{BREAKDOWN_LABEL[row.key]}</span>
                      <span className="font-semibold tabular-nums text-[var(--text)]">
                        +{row.value.toLocaleString('es-ES')}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm leading-6 text-[var(--text-muted)]">
                  Esta sesión no sumó puntos. Registra al menos una serie para que cuente.
                </p>
              )}

              <section className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-[var(--text-muted)]">Tu total</span>
                  <span aria-hidden className="text-xl font-semibold tabular-nums text-[var(--text)]">
                    <CountUp delayMs={totalDelayMs} from={reward.pointsBefore} value={reward.pointsAfter} /> pts
                  </span>
                  <span className="sr-only">{`${reward.pointsAfter.toLocaleString('es-ES')} puntos en total`}</span>
                </div>
                <div
                  aria-label={reward.nextLevel ? `Avance hacia ${reward.nextLevel.name}` : 'Avance de la senda'}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(reward.levelProgress * 100)}
                  className="h-2 overflow-hidden rounded-full bg-[var(--surface-high)]"
                  role="progressbar"
                >
                  <motion.div
                    animate={{ scaleX: still ? reward.levelProgress : barFrames }}
                    className="h-full origin-left rounded-full"
                    initial={still ? false : { scaleX: reward.levelProgressBefore }}
                    style={{ backgroundColor: barColor }}
                    transition={
                      still
                        ? { duration: 0 }
                        : {
                            delay: totalDelayMs / 1000,
                            duration: Math.max(0.6, totalMs / 1000),
                            times: reward.leveledUp ? [0, 0.45, 0.46, 1] : [0, 1],
                            ease: 'easeOut',
                          }
                    }
                  />
                </div>
                {reward.leveledUp && reward.levelAfter ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                    <ProgressionIcon
                      className="size-4"
                      name={reward.levelAfter.icon}
                      style={{ color: reward.levelAfter.color }}
                    />
                    {`¡Has subido a ${reward.levelAfter.name}!`}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--text-muted)]">
                  {reward.nextLevel && reward.pointsToNextLevel !== null
                    ? `Te faltan ${reward.pointsToNextLevel.toLocaleString('es-ES')} puntos para ${reward.nextLevel.name}.`
                    : 'Has llegado al final de la senda. Ahora se trata de mantenerlo.'}
                </p>
              </section>

              <div className="grid gap-2">
                {subjects.length > 0 ? (
                  <>
                    <Button onClick={openCards} size="lg" variant="primary">
                      <Gift aria-hidden className="size-5" />
                      {subjects.length === 1 ? 'Abrir recompensa' : `Abrir ${subjects.length} recompensas`}
                    </Button>
                    <Button onClick={onClose} variant="ghost">
                      Seguir
                    </Button>
                  </>
                ) : (
                  <Button onClick={onClose} size="lg" variant="primary">
                    Seguir
                  </Button>
                )}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>

      {showingCards ? (
        <ProgressionCelebration onClose={() => setShowingCards(false)} subjects={subjects} />
      ) : null}
    </>
  );
}
