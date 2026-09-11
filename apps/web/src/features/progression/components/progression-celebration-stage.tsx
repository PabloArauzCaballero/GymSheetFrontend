'use client';

import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { BadgeRarity, ProgressionBadge, ProgressionLevel } from '@/shared/api/schemas';
import { withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';

/**
 * El escenario de la celebración: todo lo que se mueve y nada de lo que se lee.
 *
 * Vive aparte del diálogo por la misma razón que las demás piezas de la senda
 * —un objeto dibujado por archivo— y porque el reparto es real: aquí no hay
 * texto, y ahí está la clave de que el acercamiento se vea nítido. Solo se
 * escala lo vectorial; los glifos los compone el diálogo, a escala 1.
 */

/** Lo que se celebra, ya normalizado: la escena no sabe de dónde viene. */
export type CelebrationSubject = Readonly<{
  kind: 'insignia' | 'nivel';
  name: string;
  /** Nombre de icono de Ionicons; `ProgressionIcon` lo traduce a lucide (SVG). */
  icon: string;
  color: string;
  flavor: string | null;
  rarity: BadgeRarity | null;
}>;

export function badgeSubject(badge: ProgressionBadge): CelebrationSubject {
  const { name, icon, color, rarity } = badge;
  const flavor = badge.flavorText ?? badge.description;
  return { kind: 'insignia', name, icon, color, rarity, flavor };
}

export function levelSubject(level: ProgressionLevel): CelebrationSubject {
  const { name, icon, color } = level;
  return { kind: 'nivel', name, icon, color, rarity: null, flavor: level.tagline };
}

type Intensity = Readonly<{
  /** Alfa del haz cenital. */ beam: number;
  /** Alfa del halo en reposo; el pico lo deriva el bucle CSS. */ halo: number;
  /** Botes: dos se leen como asentamiento, tres como euforia. */ bounces: number;
  /** Altura del primer bote en px; los siguientes decaen al 45 %. */ lift: number;
  /** Escala del acercamiento antes de atravesar la cámara. */ zoom: number;
}>;

/**
 * La escala de rareza, único parámetro del espectáculo. Sube en los cinco ejes a
 * la vez porque la intensidad se percibe como una sola cosa: una legendaria que
 * rebotara más pero brillara igual se leería como un fallo, no como gradación.
 * Los saltos son amplios a propósito —el haz casi se triplica de común a
 * legendaria— para que la diferencia se note sin verlas una junto a otra.
 *
 * Una subida de rango usa la fila legendaria: es el acontecimiento más grande de
 * la aplicación y nada debería verse por encima de él.
 */
export const INTENSITY: Readonly<Record<BadgeRarity, Intensity>> = {
  COMUN: { beam: 0.24, halo: 0.34, bounces: 2, lift: 12, zoom: 2.1 },
  RARA: { beam: 0.36, halo: 0.48, bounces: 2, lift: 16, zoom: 2.5 },
  EPICA: { beam: 0.48, halo: 0.62, bounces: 3, lift: 20, zoom: 3 },
  LEGENDARIA: { beam: 0.62, halo: 0.78, bounces: 3, lift: 26, zoom: 3.6 },
};

/** Las curvas de la casa (`--ease-out`, `--ease-in`) como las lee framer-motion. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

/**
 * El guion en segundos. Va como datos y no repartido por el JSX porque la
 * secuencia *es* el diseño y hay que poder leerla de un vistazo. Cada paso
 * arranca antes de que acabe el anterior: un relevo limpio se lee como una lista
 * de pasos, y un solapamiento como una sola cosa que ocurre.
 */
export const CUE = {
  beam: { at: 0, dur: 0.7 },
  halo: { at: 0.55, dur: 0.4 },
  bounce: { at: 1.25, dur: 0.9 },
  zoom: { at: 2.2, dur: 0.6 },
  resolve: { at: 2.62, dur: 0.55 },
  text: { at: 2.85, dur: 0.45, step: 0.12 },
} as const;

/** Disolución del haz hacia abajo. Solo importa el alfa: el color da igual. */
const BEAM_FADE =
  'linear-gradient(to bottom, rgb(var(--scrim-channels) / 1) 0%, rgb(var(--scrim-channels) / 0.75) 52%, rgb(var(--scrim-channels) / 0) 94%)';

/** Del brillo al final del acercamiento: el emblema vuela en un solo tramo. */
const FLIGHT = CUE.zoom.at + CUE.zoom.dur - CUE.halo.at;

/**
 * Botes de amplitud decreciente y tiempos que se acortan: un objeto con peso cae
 * más rápido cuanto más bajo bota, así que cada tramo dura proporcionalmente a
 * la raíz de su amplitud. Tiempos iguales darían tres saltitos de metrónomo.
 */
function bounceTimeline(count: number, lift: number) {
  const values: number[] = [0];
  const spans: number[] = [0];
  for (let index = 0; index < count; index += 1) {
    const amplitude = lift * 0.45 ** index;
    const span = Math.sqrt(amplitude / lift);
    values.push(-amplitude, 0);
    spans.push(span, span);
  }
  const total = spans.reduce((sum, span) => sum + span, 0);
  let elapsed = 0;
  const times = spans.map((span) => (elapsed += span) / total);
  const ease = values.slice(1).map((_, i) => (i % 2 === 0 ? 'easeOut' : 'easeIn'));
  return { values, times, ease };
}

/**
 * El emblema: halo, disco, icono y barrido de luz.
 *
 * Todo lo de dentro es vectorial —gradientes CSS y un SVG de lucide—, que es la
 * condición para que el acercamiento hasta 3,6× siga nítido en cualquier
 * densidad de pantalla; un mapa de bits ahí sería papilla al escalarlo.
 */
function Emblem({ subject, power }: Readonly<{ subject: CelebrationSubject; power: Intensity }>) {
  const halo = {
    '--halo-rest': power.halo,
    '--halo-peak': Math.min(1, power.halo * 1.4),
    background: `radial-gradient(circle, ${withAlpha(subject.color, 0.85)} 0%, ${withAlpha(subject.color, 0.22)} 45%, transparent 72%)`,
  } as CSSProperties;

  return (
    <div className="relative grid size-28 place-items-center">
      <span
        aria-hidden
        className="absolute -inset-8 rounded-full motion-safe:animate-[celebration-halo-breath_3.2s_var(--ease-in-out)_infinite]"
        style={halo}
      />
      <span
        className="relative grid size-full place-items-center overflow-hidden rounded-full border-2"
        style={{
          borderColor: withAlpha(subject.color, 0.75),
          backgroundColor: withAlpha(subject.color, 0.16),
          boxShadow: `0 0 48px ${withAlpha(subject.color, 0.55)}, inset 0 0 24px ${withAlpha(subject.color, 0.3)}`,
        }}
      >
        <ProgressionIcon
          className="size-12"
          name={subject.icon}
          style={{
            color: subject.color,
            filter: `drop-shadow(0 0 10px ${withAlpha(subject.color, 0.85)})`,
          }}
        />
        {/* El barrido. El recorte al objeto lo pone el `overflow-hidden` del
            disco, no la franja: así sigue el borde sin repetir la geometría. */}
        <span
          aria-hidden
          className="absolute inset-y-[-40%] left-0 w-1/3 motion-safe:animate-[celebration-sweep_2.6s_var(--ease-in-out)_0.65s_infinite]"
          style={{
            background: `linear-gradient(90deg, transparent, rgb(var(--sheen-channels) / ${0.35 + power.halo * 0.45}), transparent)`,
          }}
        />
      </span>
    </div>
  );
}

/** La escena. El diálogo la remonta con `key` para repetir el guion. */
export function CelebrationStage({
  subject,
  power,
  still,
}: Readonly<{ subject: CelebrationSubject; power: Intensity; still: boolean }>) {
  const hop = bounceTimeline(power.bounces, power.lift);

  return (
    <div
      className="relative isolate grid h-64 place-items-center overflow-hidden rounded-[var(--radius-xl)] sm:h-72"
      style={{
        // Fondo casi negro con el charco de luz del suelo ya dentro: sin ese
        // apoyo el cono flotaría en vez de iluminar algo.
        backgroundImage: `radial-gradient(ellipse 60% 22% at 50% 78%, rgb(var(--sheen-channels) / ${power.beam * 0.42}) 0%, transparent 70%)`,
        backgroundColor: 'rgb(var(--scrim-channels) / 0.94)',
      }}
    >
      {still ? null : (
        <>
          {/* 1 — Luz cenital: una cuña de ±21° alrededor de la vertical hecha con
              un `conic-gradient` anclado en el centro del borde superior y
              disuelta hacia abajo con `mask-image`; la máscara es lo que la hace
              parecer aire iluminado y no un triángulo pintado. Crece en `scaleY`
              desde el origen superior, así que la luz *baja*. */}
          <motion.div
            animate={{ scaleY: 1, opacity: 1 }}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-full origin-top"
            initial={{ scaleY: 0.08, opacity: 0 }}
            style={{
              background: `conic-gradient(from 180deg at 50% 0%, rgb(var(--sheen-channels) / ${power.beam * 1.5}) 0deg, rgb(var(--sheen-channels) / ${power.beam}) 7deg, transparent 21deg, transparent 339deg, rgb(var(--sheen-channels) / ${power.beam}) 353deg, rgb(var(--sheen-channels) / ${power.beam * 1.5}) 360deg)`,
              // El prefijo cubre Safari anterior a 16.4, que todavía pide
              // `-webkit-mask-image`; sin él el cono saldría como un rectángulo.
              WebkitMaskImage: BEAM_FADE,
              maskImage: BEAM_FADE,
              willChange: 'transform, opacity',
            }}
            transition={{
              scaleY: { delay: CUE.beam.at, duration: CUE.beam.dur, ease: EASE_OUT },
              opacity: { delay: CUE.beam.at, duration: CUE.beam.dur * 0.6 },
            }}
          />
          {/* 2, 3 y 4 — aparece brillando, bota con amplitud decreciente y se va
              hacia la cámara desvaneciéndose. Tres propiedades con tres tiempos
              sobre el mismo elemento: es un vuelo, no tres pasos encadenados. */}
          <motion.div
            animate={{ opacity: [0, 1, 1, 0], scale: [0.55, 1, 1, power.zoom], y: hop.values }}
            aria-hidden
            className="absolute"
            style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
            transition={{
              opacity: { delay: CUE.halo.at, duration: FLIGHT, times: [0, 0.18, 0.74, 1] },
              scale: {
                delay: CUE.halo.at,
                duration: FLIGHT,
                times: [0, 0.18, 0.78, 1],
                ease: ['easeOut', 'linear', EASE_IN],
              },
              y: {
                delay: CUE.bounce.at,
                duration: CUE.bounce.dur,
                times: hop.times,
                ease: hop.ease,
              },
            }}
          >
            <Emblem power={power} subject={subject} />
          </motion.div>
        </>
      )}

      {/* 5 — la resolución: el mismo emblema vuelve a posarse, ya en calma. Se
          lee como un solo objeto que atravesó la cámara y volvió, y es lo único
          que queda en pie cuando se pide movimiento reducido. */}
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="absolute"
        initial={still ? false : { opacity: 0, scale: 1.3 }}
        style={{ willChange: 'transform, opacity' }}
        transition={
          still
            ? { duration: 0 }
            : { delay: CUE.resolve.at, duration: CUE.resolve.dur, ease: EASE_OUT }
        }
      >
        <Emblem power={power} subject={subject} />
      </motion.div>
    </div>
  );
}
