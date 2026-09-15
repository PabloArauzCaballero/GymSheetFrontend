'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProgressionBadge, ProgressionLevel } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { useReducedMotion } from '@/shared/hooks/use-reduced-motion';
import {
  badgeSubject,
  CelebrationStage,
  levelSubject,
  celebrationAnnouncement,
  celebrationHeading,
  type CelebrationSubject,
} from './progression-celebration-stage';

export {
  badgeSubject,
  levelSubject,
  sessionRewardSubjects,
  type CelebrationSubject,
} from './progression-celebration-stage';

/**
 * La recompensa: una cola de cartas a pantalla completa.
 *
 * Se abre sola solo para lo **nuevo** —al terminar una sesión o al entrar a la
 * senda con insignias sin celebrar— y una única vez. Las revisitas (tocar una
 * insignia o el rango) siguen siendo bajo demanda: el mismo guion, sin sello.
 *
 * Usa el `Dialog` de Radix del repo por el foco atrapado y `Escape`, pero no el
 * panel de `DialogContent`: aquí el contenido es el escenario entero, siempre
 * oscuro, y el título se lee en la propia escena.
 */
export function ProgressionCelebration({
  subjects,
  onClose,
}: Readonly<{ subjects: readonly CelebrationSubject[]; onClose: () => void }>) {
  if (subjects.length === 0) return null;
  const queueKey = subjects.map((subject) => `${subject.kind}:${subject.name}`).join('|');
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <CelebrationQueue key={queueKey} onClose={onClose} subjects={subjects} />
    </Dialog>
  );
}

/** Botón claro sobre el escenario oscuro. Los del sistema asumen superficie del tema. */
const STAGE_GHOST =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-medium text-[rgb(var(--sheen-channels)/0.78)] transition-colors hover:bg-[rgb(var(--sheen-channels)/0.1)] hover:text-[rgb(var(--sheen-channels))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sheen-channels))]';

function CelebrationQueue({
  subjects,
  onClose,
}: Readonly<{ subjects: readonly CelebrationSubject[]; onClose: () => void }>) {
  const still = useReducedMotion();
  const [index, setIndex] = useState(0);
  // Cada repetición remonta el escenario, que es lo que rebobina el guion.
  const [take, setTake] = useState(0);
  const subject = subjects[Math.min(index, subjects.length - 1)] as CelebrationSubject;
  const hasNext = index < subjects.length - 1;

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="dialog-overlay fixed inset-0 z-50"
        style={{ backgroundColor: 'rgb(var(--scrim-channels) / 0.94)' }}
      />
      <DialogPrimitive.Content
        className="fixed inset-0 z-50 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain outline-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 60% at 50% 42%, rgb(var(--sheen-channels) / 0.06), transparent 70%)',
        }}
      >
        <DialogPrimitive.Title className="sr-only">{celebrationHeading(subject)}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          {subjects.length > 1
            ? `Recompensa ${index + 1} de ${subjects.length}.`
            : 'Tu recompensa.'}
        </DialogPrimitive.Description>
        <p aria-live="polite" className="sr-only" key={`${index}`} role="status">
          {celebrationAnnouncement(subject)}
        </p>

        <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <span className="text-sm font-medium tabular-nums text-[rgb(var(--sheen-channels)/0.7)]">
            {subjects.length > 1 ? `${index + 1} de ${subjects.length}` : ''}
          </span>
          <DialogPrimitive.Close aria-label="Cerrar" className={`${STAGE_GHOST} size-11 px-0`}>
            <X aria-hidden className="size-5" />
          </DialogPrimitive.Close>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <CelebrationStage key={`${index}-${take}`} still={still} subject={subject} />
        </div>

        <div className="mx-auto grid w-full max-w-sm gap-2 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={() => (hasNext ? setIndex((value) => value + 1) : onClose())}
            size="lg"
            variant="primary"
          >
            {hasNext ? 'Siguiente' : 'Seguir'}
          </Button>
          {still ? null : (
            <button className={STAGE_GHOST} onClick={() => setTake((value) => value + 1)} type="button">
              <RotateCcw aria-hidden className="size-4" />
              Volver a verla
            </button>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/**
 * La cola de la senda: lo nuevo se abre solo, una vez por visita; lo demás, al tocar.
 *
 * «Nuevo» es `isNew` —conseguida y sin celebrar—, no solo `unlockedNow`: al
 * cerrar una sesión el servidor ya otorga las insignias, así que al entrar a la
 * senda `unlockedNow` llega vacío y lo pendiente es lo que sigue sin verse.
 *
 * La cola automática se captura la primera vez que hay algo que celebrar
 * (ajuste de estado durante el render, no un efecto) y queda fija: un refetch
 * al volver a la pestaña trae `isNew` en falso y no debe cerrar la carta a
 * medias. Cerrarla la vacía para el resto de la visita.
 *
 * Se confirma al servidor en cuanto aparece, no al salir: si la pestaña se
 * cierra desde aquí, ya se vio. `onAcknowledge` cambia de identidad en cada
 * render (react-query), así que el efecto depende solo de que haya novedades.
 */
export function useRewardQueue(
  badges: readonly ProgressionBadge[] | undefined,
  levelUp: ProgressionLevel | null,
  onAcknowledge: () => void,
) {
  const [manual, setManual] = useState<readonly CelebrationSubject[] | null>(null);
  const [auto, setAuto] = useState<readonly CelebrationSubject[] | null>(null);
  const fresh = (badges ?? []).filter((badge) => badge.earned && badge.isNew);
  if (auto === null && (fresh.length > 0 || levelUp)) {
    setAuto([
      ...fresh.map((badge) => badgeSubject(badge, true)),
      ...(levelUp ? [levelSubject(levelUp, true)] : []),
    ]);
  }

  const autoCount = auto?.length ?? 0;
  useEffect(() => {
    if (autoCount > 0) onAcknowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCount]);

  return {
    subjects: manual ?? auto ?? [],
    show: (next: readonly CelebrationSubject[]) => setManual(next),
    close: () => {
      setManual(null);
      setAuto([]);
    },
  };
}

/**
 * Detecta una subida de rango sin tocar el backend.
 *
 * `progressionSchema` trae `unlockedNow` para las insignias pero no hay nada
 * equivalente para los niveles fuera de la respuesta de cerrar sesión
 * (`SessionReward.leveledUp`). Para quien sube de rango sin pasar por ahí —un
 * administrador cambia umbrales— esto es una marca local y se comporta como tal.
 *
 * Va en cookie y no en el almacenamiento web porque `scripts/source-check.mjs`
 * prohíbe esa API en toda la web; el precedente del repo para una preferencia de
 * cliente es la cookie del tema (`theme-provider.tsx:37`). Es un dato no
 * sensible —código de rango y su orden— y viaja con `samesite=lax`.
 *
 * La primera visita nunca celebra: sin marca previa no se distingue «acaba de
 * subir» de «siempre estuvo ahí». Todo en try/catch: con las cookies bloqueadas
 * esto debe no hacer nada, no romper la pantalla.
 */
const SEEN_COOKIE = 'gs-senda-rango';
const SEEN_MAX_AGE = 60 * 60 * 24 * 365;

function readSeenOrder(): number | null {
  try {
    const found = new RegExp(`(?:^|;\\s*)${SEEN_COOKIE}=([^;]*)`, 'u').exec(document.cookie);
    if (!found?.[1]) return null;
    const order = Number.parseInt(decodeURIComponent(found[1]).split('|')[1] ?? '', 10);
    return Number.isFinite(order) ? order : null;
  } catch {
    return null;
  }
}

/** También lo usa el resumen de sesión, para que la senda no repita la carta de rango. */
export function writeSeen(level: ProgressionLevel): void {
  try {
    const value = encodeURIComponent(`${level.code}|${level.sortOrder}`);
    document.cookie = `${SEEN_COOKIE}=${value}; path=/; max-age=${SEEN_MAX_AGE}; samesite=lax`;
  } catch {
    // Cookies bloqueadas: se pierde la marca, no la pantalla.
  }
}

export function useLevelUpWatch(level: ProgressionLevel | null): ProgressionLevel | null {
  // La marca se lee una sola vez, en el inicializador perezoso: el efecto de
  // abajo la sobrescribe con el rango actual y en la pasada siguiente el
  // ascenso ya no se distinguiría de la normalidad.
  const [seen] = useState<number | null>(() =>
    typeof document === 'undefined' ? null : readSeenOrder(),
  );
  // react-query devuelve un objeto nuevo en cada respuesta; la identidad que
  // importa es el código del rango, no la referencia.
  const code = level?.code ?? null;

  useEffect(() => {
    if (level) writeSeen(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!level || seen === null || level.sortOrder <= seen) return null;
  return level;
}
