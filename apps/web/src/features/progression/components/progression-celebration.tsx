'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { ProgressionLevel } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { useReducedMotion } from '@/shared/hooks/use-reduced-motion';
import {
  CelebrationStage,
  CUE,
  EASE_OUT,
  INTENSITY,
  type CelebrationSubject,
} from './progression-celebration-stage';
import { RARITY_LABEL } from './progression-colors';

export {
  badgeSubject,
  levelSubject,
  type CelebrationSubject,
} from './progression-celebration-stage';

/**
 * La celebración de la senda.
 *
 * Nunca se dispara sola, y esa decisión sostiene el resto: una animación de tres
 * segundos que aparece sin pedirla es una interrupción; la misma pedida es un
 * premio. El disparador vive en la insignia y en el rango, no en un efecto al
 * cargar la pantalla.
 *
 * El guion —luz cenital, brillo, botes, acercamiento, texto— y su escala de
 * rareza viven en `progression-celebration-stage.tsx`. Aquí queda el marco: el
 * diálogo, lo que se lee y lo que se anuncia.
 */

/** Una línea del desenlace. Entra, pero nunca se escala: el texto no se estira. */
function Line(
  props: Readonly<{
    at: number;
    still: boolean;
    className: string;
    style?: CSSProperties;
    children: ReactNode;
  }>,
) {
  const { at, still, className, style, children } = props;
  return (
    <motion.p
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={still ? false : { opacity: 0, y: 10 }}
      style={style}
      transition={still ? { duration: 0 } : { delay: at, duration: CUE.text.dur, ease: EASE_OUT }}
    >
      {children}
    </motion.p>
  );
}

/**
 * El `Dialog` del repo aporta foco atrapado y `Escape` sin escribir una línea.
 * El anuncio va aparte, en una región viva: una celebración que solo existe como
 * luz no existe para quien no la ve. `useReducedMotion` se pasa a mano a cada
 * `motion.*` porque framer-motion no obedece al kill-switch de `animations.css`;
 * con él activo la celebración sigue existiendo —se abre, se ve el emblema y se
 * lee el texto— pero quieta.
 */
export function ProgressionCelebration({
  subject,
  onClose,
}: Readonly<{ subject: CelebrationSubject | null; onClose: () => void }>) {
  const still = useReducedMotion();
  // Cada repetición remonta el escenario, que es lo que rebobina el guion.
  const [take, setTake] = useState(0);

  if (!subject) return null;
  const isLevel = subject.kind === 'nivel';
  const power = INTENSITY[subject.rarity ?? 'LEGENDARIA'];
  const rarity = subject.rarity ? (RARITY_LABEL[subject.rarity] ?? subject.rarity) : null;
  const heading = isLevel ? '¡Has subido de rango!' : '¡Insignia conseguida!';
  const cue = (step: number) => CUE.text.at + step * CUE.text.step;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent
        className="max-w-md"
        description={isLevel ? 'Tu senda acaba de avanzar.' : 'Ya vive en tu colección.'}
        title={heading}
      >
        <div className="grid gap-6">
          <p aria-live="polite" className="sr-only" role="status">
            {`${heading} ${subject.name}.${rarity ? ` Rareza: ${rarity}.` : ''}${
              subject.flavor ? ` ${subject.flavor}` : ''
            }`}
          </p>

          <CelebrationStage
            key={`${subject.name}-${take}`}
            power={power}
            still={still}
            subject={subject}
          />

          <div className="grid gap-2 text-center">
            {/* El antetítulo de una insignia toma el color del catálogo, que el
                gimnasio elige pensando en claro y oscuro. El del rango no tiene
                color propio y usa `--accent-ink`, nunca `--volt`: en claro
                `--volt` sobre superficie clara da 1.3:1 y el texto desaparece
                (ver `senda-card.tsx:65-68` y `progression-parts.tsx:63-66`). */}
            {rarity ? (
              <Line
                at={cue(0)}
                className="text-xs font-semibold uppercase tracking-[0.16em]"
                still={still}
                style={{ color: subject.color }}
              >
                {rarity}
              </Line>
            ) : null}
            {isLevel ? (
              <Line
                at={cue(0)}
                className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-ink)]"
                still={still}
              >
                Nuevo rango
              </Line>
            ) : null}
            <Line
              at={cue(1)}
              className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text)]"
              still={still}
            >
              {subject.name}
            </Line>
            {subject.flavor ? (
              <Line
                at={cue(2)}
                className="text-sm leading-6 text-[var(--text-muted)]"
                still={still}
              >
                {subject.flavor}
              </Line>
            ) : null}
          </div>

          <div className="grid gap-2">
            {still ? null : (
              <Button onClick={() => setTake((value) => value + 1)} variant="secondary">
                Volver a verla
              </Button>
            )}
            <Button onClick={onClose} variant="ghost">
              Seguir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Detecta una subida de rango sin tocar el backend.
 *
 * `progressionSchema` trae `unlockedNow` para las insignias pero no hay nada
 * equivalente para los niveles, y ampliar el contrato ahora empeoraría un
 * conflicto de ramas abierto. En el servidor lo correcto sería un `leveledUpNow`
 * —rango anterior y nuevo— confirmado por el `acknowledge` que ya existe:
 * sobreviviría a otro navegador y a un borrado de datos del sitio. Hasta
 * entonces esto es una marca local y se comporta como tal.
 *
 * Va en cookie y no en el almacenamiento web porque `scripts/source-check.mjs`
 * prohíbe esa API en toda la web; el precedente del repo para una preferencia de
 * cliente es la cookie del tema (`theme-provider.tsx:37`). Es un dato no
 * sensible —código de rango y su orden— y viaja con `samesite=lax`.
 *
 * La primera visita nunca celebra: sin marca previa no se distingue «acaba de
 * subir» de «siempre estuvo ahí», y felicitar por lo segundo abarata la
 * celebración. Todo en try/catch: con las cookies bloqueadas —una ventana
 * privada— esto debe no hacer nada, no romper la pantalla.
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

function writeSeen(level: ProgressionLevel): void {
  try {
    const value = encodeURIComponent(`${level.code}|${level.sortOrder}`);
    document.cookie = `${SEEN_COOKIE}=${value}; path=/; max-age=${SEEN_MAX_AGE}; samesite=lax`;
  } catch {
    // Cookies bloqueadas: se pierde la marca, no la pantalla.
  }
}

export function useLevelUpWatch(level: ProgressionLevel | null): ProgressionLevel | null {
  // La marca se lee una sola vez, en el inicializador perezoso. Leerla en cada
  // render no serviría: el efecto de abajo la sobrescribe con el rango actual y
  // en la pasada siguiente el ascenso ya no se distinguiría de la normalidad.
  // `useState` sin setter es exactamente eso, «un valor capturado al montar», y
  // deja el resultado como un cálculo de render en vez de un estado que un
  // efecto tenga que empujar.
  const [seen] = useState<number | null>(() =>
    typeof document === 'undefined' ? null : readSeenOrder(),
  );
  // react-query devuelve un objeto nuevo en cada respuesta; la identidad que
  // importa es el código del rango, no la referencia.
  const code = level?.code ?? null;

  // Guardar la marca sí es trabajo de efecto: sincroniza un sistema externo
  // —la cookie— con lo que React acaba de pintar. No toca ningún estado.
  useEffect(() => {
    if (level) writeSeen(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!level || seen === null || level.sortOrder <= seen) return null;
  return level;
}
