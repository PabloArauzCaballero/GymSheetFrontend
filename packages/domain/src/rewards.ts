/**
 * Premios, retos y racha (contrato 12): los textos y las cuentas que comparten
 * el móvil y la web.
 *
 * Solo funciones puras y tipos estructurales: el dominio no depende de los
 * esquemas, así que aquí se describe la forma mínima que cada función necesita.
 */

function format(value: number): string {
  return value.toLocaleString("es-ES");
}

function plural(count: number, one: string, many: string): string {
  return `${format(count)} ${count === 1 ? one : many}`;
}

/* ─── Modo: escalones del multiplicador ──────────────────────────────────── */

const MULTIPLIER_TIERS: readonly { min: number; name: string }[] = [
  { min: 2.0, name: "Leyenda" },
  { min: 1.8, name: "Imparable" },
  { min: 1.6, name: "En llamas" },
  { min: 1.4, name: "Encendido" },
  { min: 1.2, name: "En marcha" },
  { min: 0, name: "Arrancando" },
];

/**
 * Nombre del escalón del multiplicador. El servidor lo manda en
 * `nivelMultiplicador`; esto es la red para un servidor anterior. Tolera el
 * redondeo flotante (1,4 puede llegar como 1,3999…).
 */
export function multiplierTier(multiplier: number): string {
  const value = Math.round(multiplier * 10) / 10;
  return (
    MULTIPLIER_TIERS.find((tier) => value >= tier.min) ??
    MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1]!
  ).name;
}

/** El escalón de un programa: el nombre del servidor o, si no llega, el deducido. */
export function modeTierName(view: {
  multiplicador: number;
  nivelMultiplicador?: string | null;
}): string {
  return view.nivelMultiplicador ?? multiplierTier(view.multiplicador);
}

/** «Escudo listo» si el programa guarda uno; nada si no (o si el servidor no lo manda). */
export function shieldLabel(escudos: number | null | undefined): string | null {
  return escudos && escudos > 0 ? "Escudo listo" : null;
}

/* ─── Retos de la semana ─────────────────────────────────────────────────── */

export type ChallengeDifficultyKey = "FACIL" | "MEDIO" | "DIFICIL";

export const CHALLENGE_DIFFICULTY_LABEL: Readonly<
  Record<ChallengeDifficultyKey, string>
> = {
  FACIL: "Fácil",
  MEDIO: "Medio",
  DIFICIL: "Difícil",
};

/**
 * Cuánto queda de la semana de retos, en palabras: «Quedan 3 días»,
 * «Queda 1 día», «Quedan 5 h», «Termina en menos de 1 h». Se cuenta hacia
 * arriba (un lunes a las 00:00 y faltan 2 días y 1 hora → «Quedan 3 días»): la
 * gente lee «quedan 2 días» como «pasado mañana se acaba», y a medio día del
 * sábado eso sería decir que no queda el domingo.
 */
export function weekCountdownLabel(
  endsAt: string,
  now: Date = new Date(),
): string {
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return "";
  const ms = end - now.getTime();
  if (ms <= 0) return "Semana cerrada";
  const hours = ms / 3_600_000;
  if (hours < 1) return "Termina en menos de 1 h";
  if (hours < 24) {
    const whole = Math.ceil(hours);
    return `${whole === 1 ? "Queda" : "Quedan"} ${whole} h`;
  }
  const days = Math.ceil(hours / 24);
  return days === 1 ? "Queda 1 día" : `Quedan ${days} días`;
}

/** «2 de 3 retos» y, con los tres, «Semana redonda». */
export function challengesSummary(view: {
  completedCount: number;
  items: readonly unknown[];
  perfect: boolean;
}): string {
  if (view.perfect) return "Semana redonda";
  return `${view.completedCount} de ${view.items.length} retos`;
}

/* ─── Racha con comodines ────────────────────────────────────────────────── */

/** «12 días · 1 comodín». Sin racha: «Sin racha todavía». */
export function streakSummary(streak: {
  current: number;
  freezes: number;
}): string {
  const days =
    streak.current > 0
      ? plural(streak.current, "día", "días")
      : "Sin racha todavía";
  if (streak.freezes <= 0) return days;
  return `${days} · ${plural(streak.freezes, "comodín", "comodines")}`;
}

/**
 * La línea del próximo hito, sin culpa: «Faltan 2 días para el hito de 14».
 * Nula pasado el último hito.
 */
export function streakMilestoneLabel(streak: {
  current: number;
  nextMilestone: number | null;
}): string | null {
  if (streak.nextMilestone === null) return null;
  const left = Math.max(0, streak.nextMilestone - streak.current);
  if (left === 0)
    return `Hito de ${format(streak.nextMilestone)} días alcanzado`;
  return `${left === 1 ? "Falta 1 día" : `Faltan ${format(left)} días`} para el hito de ${format(streak.nextMilestone)}`;
}

/** Cómo funcionan los comodines, con las reglas que publica el servidor. */
export function freezeRuleLabel(rules: {
  freezeEveryDays?: number;
  maxFreezes?: number;
}): string {
  const every = rules.freezeEveryDays ?? 7;
  const max = rules.maxFreezes ?? 2;
  return `Cada ${every} días de racha ganas un comodín (guardas ${max} como máximo). Si un día no puedes venir, se gasta solo y tu racha sigue.`;
}

/* ─── Premios ────────────────────────────────────────────────────────────── */

export type PrizeStatusKey = "DISPONIBLE" | "CANJEADO" | "CADUCADO";

export const PRIZE_STATUS_LABEL: Readonly<Record<PrizeStatusKey, string>> = {
  DISPONIBLE: "Disponible",
  CANJEADO: "Canjeado",
  CADUCADO: "Caducado",
};

const shortDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

/** «Caduca el 12 oct», «Canjeado el 3 oct», «Sin caducidad». */
export function prizeDateLabel(prize: {
  status: PrizeStatusKey;
  expiresAt: string | null;
  redeemedAt: string | null;
}): string {
  if (prize.status === "CANJEADO") {
    return prize.redeemedAt
      ? `Canjeado el ${shortDate.format(new Date(prize.redeemedAt))}`
      : "Canjeado";
  }
  if (!prize.expiresAt) return "Sin caducidad";
  const date = shortDate.format(new Date(prize.expiresAt));
  return prize.status === "CADUCADO"
    ? `Caducó el ${date}`
    : `Caduca el ${date}`;
}

/** El código en grupos de tres para leerlo en voz alta en recepción: «K7M 2QX». */
export function prizeCodeGroups(code: string): string {
  const clean = code.replace(/\s+/g, "").toUpperCase();
  return clean.length === 6 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
}

/** Primero los disponibles (los que se pueden usar), después el resto; cada grupo del más reciente al más antiguo. */
export function sortPrizes<
  T extends { status: PrizeStatusKey; awardedAt: string },
>(prizes: readonly T[]): T[] {
  const rank = (status: PrizeStatusKey) => (status === "DISPONIBLE" ? 0 : 1);
  return [...prizes].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      Date.parse(b.awardedAt) - Date.parse(a.awardedAt),
  );
}

/* ─── Insignias: «Lo más cerca» y cadenas ────────────────────────────────── */

type ChainBadge = {
  code: string;
  name: string;
  earned: boolean;
  progress: number | null;
  threshold?: number | null;
  chain?: string | null;
  chainStep?: number | null;
  chainLength?: number | null;
};

/** Unidad de cada criterio: [singular, plural]. Las abreviaturas no cambian. */
const CRITERION_UNIT: Readonly<Record<string, readonly [string, string]>> = {
  SESSION_COUNT: ["sesión", "sesiones"],
  EARLY_SESSIONS: ["sesión", "sesiones"],
  NIGHT_SESSIONS: ["sesión", "sesiones"],
  WEEKEND_SESSIONS: ["sesión", "sesiones"],
  MONDAY_SESSIONS: ["lunes", "lunes"],
  GEO_VERIFIED_SESSIONS: ["sesión", "sesiones"],
  SUPERSET_SESSIONS: ["sesión", "sesiones"],
  MAX_SESSIONS_IN_WEEK: ["sesión", "sesiones"],
  STREAK_DAYS: ["día", "días"],
  DISTINCT_WEEKDAYS: ["día", "días"],
  WEEKLY_STREAK: ["semana", "semanas"],
  OVERLOAD_WEEKS_STREAK: ["semana", "semanas"],
  CARDIO_WEEKLY_MINUTES: ["semana", "semanas"],
  TOTAL_VOLUME_KG: ["kg", "kg"],
  SINGLE_SESSION_VOLUME_KG: ["kg", "kg"],
  MAX_SET_WEIGHT_KG: ["kg", "kg"],
  TOTAL_SETS: ["serie", "series"],
  TOTAL_REPS: ["repetición", "repeticiones"],
  DISTINCT_MUSCLE_GROUPS: ["grupo muscular", "grupos musculares"],
  DISTINCT_EXERCISES: ["ejercicio", "ejercicios"],
  PERSONAL_RECORDS: ["récord", "récords"],
  TOTAL_TRAINING_MINUTES: ["min", "min"],
  CARDIO_TOTAL_MINUTES: ["min", "min"],
  CARDIO_TOTAL_KM: ["km", "km"],
  TIMED_SECONDS_TOTAL: ["s", "s"],
  STRENGTH_GOAL_REACHED: ["meta", "metas"],
  ROUTINES_CREATED: ["rutina", "rutinas"],
  ROUTINES_PUBLISHED: ["rutina", "rutinas"],
  ROUTINE_COPIES_RECEIVED: ["descarga", "descargas"],
  COMMENTS_WRITTEN: ["comentario", "comentarios"],
  RATINGS_GIVEN: ["valoración", "valoraciones"],
  COMMENT_LIKES_RECEIVED: ["me gusta", "me gusta"],
};

/**
 * «Te faltan 2 sesiones para Medio centenar». La unidad sale del criterio que
 * manda el servidor; con un criterio desconocido solo se nombra la meta, que es
 * mejor que inventar si son kilos o días.
 */
export function nearestLabel(
  badge: Pick<ChainBadge, "name" | "progress" | "threshold"> & {
    criterion?: string | null;
  },
): string {
  if (badge.threshold != null && badge.progress != null) {
    const unit = badge.criterion ? CRITERION_UNIT[badge.criterion] : undefined;
    // Los kilómetros son lo único con decimales («Te faltan 2,5 km»).
    const decimals = badge.criterion === "CARDIO_TOTAL_KM" ? 10 : 1;
    const left = Math.max(
      1 / decimals,
      Math.ceil(
        (badge.threshold - badge.progress * badge.threshold) * decimals,
      ) / decimals,
    );
    const verb = left === 1 ? "Te falta" : "Te faltan";
    const amount = unit
      ? `${format(left)} ${left === 1 ? unit[0] : unit[1]}`
      : format(left);
    return `${verb} ${amount} para ${badge.name}`;
  }
  if (badge.progress != null)
    return `Llevas el ${Math.round(badge.progress * 100)} % de ${badge.name}`;
  return badge.name;
}

export type BadgeChainGroup<T extends ChainBadge> = Readonly<{
  /** Criterio de la cadena; si el servidor no lo manda, el código de la insignia. */
  key: string;
  /** Pasos en orden (1-based en `chainStep`). */
  steps: readonly T[];
  /** Pasos conseguidos. */
  earnedCount: number;
  /** La insignia que representa la cadena: la última conseguida, o la primera. */
  current: T;
  /** La siguiente meta sin conseguir, o nula si la cadena está completa. */
  next: T | null;
  complete: boolean;
}>;

/**
 * Agrupa las insignias por cadena, respetando el orden del catálogo: cada
 * cadena aparece donde aparece su primer paso. Sin `chain` cada insignia es su
 * propia cadena de un paso, así que un servidor anterior pinta lo de siempre.
 */
export function groupBadgeChains<T extends ChainBadge>(
  badges: readonly T[],
): BadgeChainGroup<T>[] {
  const order: string[] = [];
  const byKey = new Map<string, T[]>();
  for (const badge of badges) {
    const key = badge.chain ? `chain:${badge.chain}` : `badge:${badge.code}`;
    const list = byKey.get(key);
    if (list) list.push(badge);
    else {
      byKey.set(key, [badge]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const steps = [...byKey.get(key)!].sort(
      (a, b) =>
        (a.chainStep ?? 0) - (b.chainStep ?? 0) ||
        (a.threshold ?? 0) - (b.threshold ?? 0),
    );
    const earned = steps.filter((step) => step.earned);
    const next = steps.find((step) => !step.earned) ?? null;
    return {
      key: key.slice(key.indexOf(":") + 1),
      steps,
      earnedCount: earned.length,
      current: earned[earned.length - 1] ?? steps[0]!,
      next,
      complete: next === null,
    };
  });
}

/** «Nivel 2 de 4», o nulo en una cadena de un solo paso. */
export function chainLevelLabel(group: {
  steps: readonly unknown[];
  earnedCount: number;
}): string | null {
  if (group.steps.length <= 1) return null;
  return `Nivel ${group.earnedCount} de ${group.steps.length}`;
}

/** Las cadenas con algo conseguido primero (la vitrina), después las demás; cada mitad en el orden del catálogo. */
export function sortChainGroups<G extends { earnedCount: number }>(
  groups: readonly G[],
): G[] {
  return [
    ...groups.filter((group) => group.earnedCount > 0),
    ...groups.filter((group) => group.earnedCount === 0),
  ];
}

/* ─── Reglas nuevas, explicadas ──────────────────────────────────────────── */

export type RewardRuleLine = Readonly<{
  key: "challenges" | "perfect" | "freezes";
  label: string;
  rate: string;
}>;

/** Las líneas de retos y comodines para la hoja de reglas; vacía con un servidor anterior. */
export function rewardRuleLines(rules: {
  challengePoints?: { FACIL: number; MEDIO: number; DIFICIL: number };
  perfectWeekBonus?: number;
  freezeEveryDays?: number;
  maxFreezes?: number;
}): RewardRuleLine[] {
  const lines: RewardRuleLine[] = [];
  if (rules.challengePoints) {
    const { FACIL, MEDIO, DIFICIL } = rules.challengePoints;
    lines.push({
      key: "challenges",
      label: "Cada reto de la semana",
      rate: `+${FACIL} / +${MEDIO} / +${DIFICIL} pts`,
    });
  }
  if (rules.perfectWeekBonus) {
    lines.push({
      key: "perfect",
      label: "Los tres retos: Semana redonda",
      rate: `+${rules.perfectWeekBonus} pts`,
    });
  }
  if (rules.freezeEveryDays) {
    lines.push({
      key: "freezes",
      label: `Cada ${rules.freezeEveryDays} días de racha`,
      rate: `1 comodín${rules.maxFreezes ? ` (máx. ${rules.maxFreezes})` : ""}`,
    });
  }
  return lines;
}
