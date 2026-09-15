/**
 * El guion de la carta de recompensa, compartido por móvil y web.
 *
 * Aquí solo hay datos y funciones puras: tiempos, escala de rareza, sacudida,
 * partículas y duración de los contadores. Cada plataforma lo pinta con su
 * motor (Reanimated o framer-motion), pero ninguna decide sus propios números:
 * así una legendaria dura, tiembla y revienta igual en el teléfono y en la web.
 */

export type CardRarity = 'COMUN' | 'RARA' | 'EPICA' | 'LEGENDARIA';

export type CardHaptic = 'light' | 'medium' | 'heavy';

export type CardTier = Readonly<{
  /** Degradado del marco, de claro a oscuro. */
  frame: readonly [string, string, string];
  /** Color de las partículas, los rayos y el brillo del sello. */
  glow: string;
  /** Alfa de los rayos detrás de la carta. Cero = sin rayos. */
  rays: number;
  /** Los rayos giran despacio en reposo. */
  raysSpin: boolean;
  /** Amplitud máxima de la sacudida de pantalla en px. Cero = no sacude. */
  shake: number;
  /** Partículas que salen en el reventón. */
  particles: number;
  /** Brillo holográfico: ninguno, suave del color, o arcoíris. */
  holo: 'none' | 'soft' | 'rainbow';
  /** Cuánto tiembla de dorso antes de revelar, en ms. */
  tensionMs: number;
  /** Amplitud máxima del temblor de la carta, en grados de rotación. */
  wobbleDeg: number;
  haptic: CardHaptic;
}>;

/**
 * La escala de rareza. Sube en todos los ejes a la vez: la intensidad se percibe
 * como una sola cosa, y una legendaria que temblara más pero brillara igual se
 * leería como un fallo, no como gradación.
 */
export const CARD_TIERS: Readonly<Record<CardRarity, CardTier>> = {
  COMUN: {
    frame: ['#F4F6F8', '#AEB6C0', '#5E6670'],
    glow: '#DDE3EA',
    rays: 0,
    raysSpin: false,
    shake: 0,
    particles: 0,
    holo: 'none',
    tensionMs: 420,
    wobbleDeg: 2,
    haptic: 'light',
  },
  RARA: {
    frame: ['#BDE6FF', '#3D9BFF', '#1B3FA8'],
    glow: '#5AB0FF',
    rays: 0.22,
    raysSpin: false,
    shake: 0,
    particles: 14,
    holo: 'none',
    tensionMs: 620,
    wobbleDeg: 3,
    haptic: 'light',
  },
  EPICA: {
    frame: ['#F0C8FF', '#A64DFF', '#4B1A9E'],
    glow: '#C37BFF',
    rays: 0.34,
    raysSpin: true,
    shake: 3,
    particles: 26,
    holo: 'soft',
    tensionMs: 820,
    wobbleDeg: 4,
    haptic: 'medium',
  },
  LEGENDARIA: {
    frame: ['#FFF6C2', '#F5C542', '#A8691A'],
    glow: '#FFD86B',
    rays: 0.5,
    raysSpin: true,
    shake: 6,
    particles: 40,
    holo: 'rainbow',
    tensionMs: 940,
    wobbleDeg: 6,
    haptic: 'heavy',
  },
};

export const CARD_RARITY_LABEL: Readonly<Record<CardRarity, string>> = {
  COMUN: 'Común',
  RARA: 'Rara',
  EPICA: 'Épica',
  LEGENDARIA: 'Legendaria',
};

/** Una frase por rareza, para explicarla sin jerga. */
export const CARD_RARITY_HINT: Readonly<Record<CardRarity, string>> = {
  COMUN: 'Llega pronto si entrenas con regularidad.',
  RARA: 'Pide constancia de varias semanas.',
  EPICA: 'Solo la consigue quien sostiene el esfuerzo meses.',
  LEGENDARIA: 'La más difícil del gimnasio. Muy pocos la tienen.',
};

/** Proporción de la carta: ancho / alto. */
export const CARD_ASPECT = 5 / 7;

/** Perspectiva del volteo 3D, en px. */
export const CARD_PERSPECTIVE = 1000;

export type CardTimeline = Readonly<{
  enter: { at: number; dur: number };
  tension: { at: number; dur: number };
  burst: { at: number; dur: number };
  flip: { at: number; dur: number };
  stamp: { at: number; dur: number };
  text: { at: number; dur: number; step: number };
  /** Cuando todo está quieto y empieza el bucle de reposo. */
  rest: number;
}>;

/**
 * El guion en milisegundos. Cada paso arranca antes de que acabe el anterior:
 * un relevo limpio se lee como una lista de pasos, un solapamiento como una
 * sola cosa que ocurre.
 */
export function cardTimeline(tier: CardTier): CardTimeline {
  const enter = { at: 0, dur: 520 };
  const tension = { at: enter.at + enter.dur - 40, dur: tier.tensionMs };
  const burstAt = tension.at + tension.dur;
  const burst = { at: burstAt, dur: 220 };
  const flip = { at: burstAt + 20, dur: 560 };
  const stamp = { at: flip.at + flip.dur - 80, dur: 380 };
  const text = { at: stamp.at + 160, dur: 360, step: 90 };
  return { enter, tension, burst, flip, stamp, text, rest: text.at + text.dur + text.step * 3 };
}

/** Guion sin espectáculo, para «reducir movimiento»: todo visible de inmediato. */
export const STILL_TIMELINE: CardTimeline = {
  enter: { at: 0, dur: 0 },
  tension: { at: 0, dur: 0 },
  burst: { at: 0, dur: 0 },
  flip: { at: 0, dur: 0 },
  stamp: { at: 0, dur: 0 },
  text: { at: 0, dur: 0, step: 0 },
  rest: 0,
};

/**
 * Temblor de dorso: oscilación alterna con amplitud creciente, como algo que
 * está a punto de romperse. Devuelve ángulos en grados, empezando y acabando en 0.
 */
export function wobbleKeyframes(maxDeg: number, swings = 10): number[] {
  const values = [0];
  for (let index = 0; index < swings; index += 1) {
    const growth = (index + 1) / swings;
    const sign = index % 2 === 0 ? 1 : -1;
    values.push(Number((sign * maxDeg * growth * growth).toFixed(3)));
  }
  values.push(0);
  return values;
}

/**
 * Sacudida de pantalla tras el reventón: amplitud decreciente en x e y
 * desfasadas, para que no se lea como un vaivén de metrónomo.
 */
export function shakeKeyframes(amplitude: number, steps = 8): { x: number[]; y: number[] } {
  if (amplitude <= 0) return { x: [0], y: [0] };
  const x = [0];
  const y = [0];
  for (let index = 0; index < steps; index += 1) {
    const decay = 1 - index / steps;
    const sign = index % 2 === 0 ? 1 : -1;
    x.push(Number((sign * amplitude * decay).toFixed(2)));
    y.push(Number((-sign * amplitude * 0.6 * decay).toFixed(2)));
  }
  x.push(0);
  y.push(0);
  return { x, y };
}

/**
 * Momentos de los tics hápticos durante la tensión, cada vez más juntos.
 * Relativos al inicio de la tensión, en ms.
 */
export function tensionTicks(durationMs: number): number[] {
  const ticks: number[] = [];
  let gap = 200;
  let at = 0;
  while (at + gap < durationMs) {
    at += gap;
    ticks.push(Math.round(at));
    gap = Math.max(60, gap * 0.78);
  }
  return ticks;
}

export type Particle = Readonly<{
  /** Ángulo en radianes. */
  angle: number;
  /** Distancia final desde el centro, en múltiplos del ancho de la carta. */
  distance: number;
  /** Diámetro en px. */
  size: number;
  /** Retraso sobre el reventón, en ms. */
  delay: number;
  /** Duración del vuelo, en ms. */
  duration: number;
  /** Giro final en grados, para las chispas alargadas. */
  spin: number;
}>;

/**
 * Generador pseudoaleatorio determinista (mulberry32). Mismas partículas en
 * cada repetición y en cada render: nada salta al volver a pintar.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function particleField(count: number, seed = 7): Particle[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, index) => {
    const base = (index / Math.max(1, count)) * Math.PI * 2;
    return {
      angle: base + (random() - 0.5) * 0.5,
      distance: 0.9 + random() * 1.1,
      size: 4 + Math.round(random() * 6),
      delay: Math.round(random() * 90),
      duration: 700 + Math.round(random() * 500),
      spin: Math.round((random() - 0.5) * 360),
    };
  });
}

/** Semilla estable a partir de un texto, para que cada insignia tenga su propio estallido. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isCardRarity(value: string | null | undefined): value is CardRarity {
  return value === 'COMUN' || value === 'RARA' || value === 'EPICA' || value === 'LEGENDARIA';
}

/** Un rango nuevo es el acontecimiento más grande: usa la fila legendaria. */
export function tierFor(rarity: string | null | undefined): CardTier {
  return isCardRarity(rarity) ? CARD_TIERS[rarity] : CARD_TIERS.LEGENDARIA;
}

/* ─── Contadores ─────────────────────────────────────────────────────────── */

/**
 * Duración de un contador según la magnitud del salto: contar hasta 40 en casi
 * dos segundos se hace eterno, y contar hasta 12.000 en medio segundo no se lee.
 */
export function countUpDuration(from: number, to: number): number {
  const distance = Math.abs(to - from);
  if (distance === 0) return 0;
  if (distance <= 100) return 600;
  if (distance <= 1000) return 1000;
  if (distance <= 10000) return 1400;
  return 1800;
}

export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - clamped, 3);
}

/** Valor entero del contador en un instante, de 0 a 1. */
export function countUpValue(from: number, to: number, progress: number): number {
  return Math.round(from + (to - from) * easeOutCubic(progress));
}

/* ─── Reglas de puntos, explicadas ───────────────────────────────────────── */

export type PointRuleLine = Readonly<{
  key: 'session' | 'sets' | 'volume' | 'streak' | 'badges';
  label: string;
  rate: string;
}>;

/**
 * Las partidas de los puntos en palabras. Las tarifas llegan del servidor
 * (`/me/progression/rules`); aquí solo se redactan.
 */
export function pointRuleLines(rules: {
  perSession: number;
  perSet: number;
  perVolumeUnitKg: number;
  perLongestStreakDay: number;
}): PointRuleLine[] {
  const kg = rules.perVolumeUnitKg.toLocaleString('es-ES');
  return [
    { key: 'session', label: 'Terminar un entreno', rate: `+${rules.perSession} pts` },
    { key: 'sets', label: 'Cada serie registrada', rate: `+${rules.perSet} pts` },
    { key: 'volume', label: `Cada ${kg} kg levantados`, rate: '+1 pt' },
    {
      key: 'streak',
      label: 'Cada día de tu racha más larga',
      rate: `+${rules.perLongestStreakDay} pts`,
    },
    { key: 'badges', label: 'Cada insignia conseguida', rate: 'Lo que indique la insignia' },
  ];
}

/** Etiquetas del desglose de una sesión, en el orden en que se leen. */
export const BREAKDOWN_LABEL: Readonly<Record<PointRuleLine['key'], string>> = {
  session: 'Por terminar la sesión',
  sets: 'Por las series',
  volume: 'Por los kilos levantados',
  streak: 'Por tu racha',
  badges: 'Por insignias nuevas',
};
