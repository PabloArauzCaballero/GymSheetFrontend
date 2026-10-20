/**
 * El camino de arenas como datos. Puro (sin React Native): lo prueba
 * `road.test.ts` con `node --test`.
 *
 * La pantalla solo pinta lo que sale de aquí: en qué estado está cada arena,
 * qué rango vive en ella, cuánto de su tramo llevas y cuántos puntos te
 * faltan. Así la coreografía no decide nada y las reglas se prueban sin
 * simulador.
 */

/** Lo que la pantalla necesita de un rango del servidor. */
export type RoadLevel = Readonly<{
  code: string;
  name: string;
  tagline: string;
  minPoints: number;
  sortOrder: number;
  color: string;
  icon: string;
}>;

/** Lo que la pantalla necesita de una arena del servidor. */
export type RoadArenaSource = Readonly<{
  code: string;
  name: string;
  tagline: string;
  minPoints: number;
  milestones: readonly string[];
}>;

/**
 * - `done`: ya la dejaste atrás.
 * - `current`: estás aquí.
 * - `next`: la siguiente; se ve cuánto falta.
 * - `locked`: más adelante; solo se ve desde cuántos puntos.
 */
export type ArenaState = 'done' | 'current' | 'next' | 'locked';

export type RoadArena = Readonly<{
  code: string;
  /** 1 = la primera arena del camino. */
  order: number;
  name: string;
  tagline: string;
  milestones: readonly string[];
  minPoints: number;
  /** El rango vigente dentro de esta arena (el último con umbral ≤ el de la arena). */
  rank: RoadLevel | null;
  /** Entrar aquí es subir de rango: el umbral de la arena es el de un rango. */
  rankUp: boolean;
  state: ArenaState;
  /** Puntos que faltan para entrar (0 si ya se entró). */
  pointsToEnter: number;
  /**
   * Cuánto llevas del tramo que sale de esta arena hacia la siguiente, 0–1.
   * La última arena no tiene tramo: vale 1 si la alcanzaste.
   */
  segmentProgress: number;
}>;

export type Road = Readonly<{
  /** De la primera (La Puerta) a la última (la cima). */
  arenas: readonly RoadArena[];
  /** Índice en `arenas` de la arena actual, o -1 antes de la primera. */
  currentIndex: number;
  next: RoadArena | null;
}>;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Un servidor anterior no manda arenas: cada rango hace de arena, con su
 * nombre y sin hitos. El camino se ve igual, solo más corto.
 */
function arenasFromLevels(levels: readonly RoadLevel[]): RoadArenaSource[] {
  return levels.map((level) => ({
    code: level.code,
    name: level.name,
    tagline: level.tagline,
    minPoints: level.minPoints,
    milestones: [],
  }));
}

export function buildRoad(
  sources: readonly RoadArenaSource[],
  path: readonly RoadLevel[],
  points: number,
): Road {
  const levels = [...path].sort((left, right) => left.sortOrder - right.sortOrder);
  const arenaList = [...(sources.length > 0 ? sources : arenasFromLevels(levels))].sort(
    (left, right) => left.minPoints - right.minPoints,
  );
  const currentIndex = arenaList.reduce((found, arena, index) => (points >= arena.minPoints ? index : found), -1);

  const arenas = arenaList.map((arena, index): RoadArena => {
    const following = arenaList[index + 1];
    let state: ArenaState = 'locked';
    if (index < currentIndex) state = 'done';
    else if (index === currentIndex) state = 'current';
    else if (index === currentIndex + 1) state = 'next';

    let segmentProgress = 0;
    if (index < currentIndex) segmentProgress = 1;
    else if (index === currentIndex) {
      segmentProgress = following
        ? clamp01((points - arena.minPoints) / Math.max(1, following.minPoints - arena.minPoints))
        : 1;
    }

    const rank = levels.reduce<RoadLevel | null>(
      (found, level) => (level.minPoints <= arena.minPoints ? level : found),
      null,
    );

    return {
      code: arena.code,
      order: index + 1,
      name: arena.name,
      tagline: arena.tagline,
      milestones: arena.milestones,
      minPoints: arena.minPoints,
      rank,
      rankUp: rank !== null && rank.minPoints === arena.minPoints,
      state,
      pointsToEnter: Math.max(0, arena.minPoints - points),
      segmentProgress,
    };
  });

  return { arenas, currentIndex, next: arenas[currentIndex + 1] ?? null };
}

/** La primera arena es donde se empieza: no se desbloquea. */
const FIRST_UNLOCKABLE_ORDER = 2;

/**
 * Qué arena celebrar al abrir el camino, o `null`.
 *
 * Se compara con la última arena **vista** por esta cuenta en este teléfono.
 * La primera visita (sin nada guardado) también celebra si ya pasaste de la
 * primera arena: es la presentación del camino, el pico que se recuerda. En la
 * primera arena no hay nada que desbloquear.
 */
export function arenaToCelebrate(road: Road, lastSeenOrder: number | null): RoadArena | null {
  const current = road.arenas[road.currentIndex];
  if (!current || current.order < FIRST_UNLOCKABLE_ORDER) return null;
  if (lastSeenOrder !== null && current.order <= lastSeenOrder) return null;
  return current;
}

const DIGITS_PER_GROUP = 3;

/** «12.350» con el separador de miles de aquí (sin depender de `Intl` en Hermes). */
export function formatPoints(value: number): string {
  const digits = Math.abs(Math.round(value)).toString();
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= DIGITS_PER_GROUP) {
    groups.unshift(digits.slice(Math.max(0, end - DIGITS_PER_GROUP), end));
  }
  return (value < 0 ? '-' : '') + groups.join('.');
}
