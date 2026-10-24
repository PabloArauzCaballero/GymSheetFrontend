/**
 * El motor de los recordatorios burlones (plan 14). Puro: lo usan el widget de
 * iOS, el de Android, la tarjeta de Inicio y las notificaciones locales, así
 * que las cuatro superficies dicen lo mismo a la vez.
 *
 * El widget no corre código de la app cuando quiere, así que la escalada se
 * **precalcula**: `gymTimeline` devuelve las entradas de los próximos días
 * suponiendo que no entrenas, y el sistema las va mostrando a su hora. Al
 * terminar un entreno la app vuelve a calcular y Repi pasa a orgullosa.
 */
import {
  GYM_LINES,
  GYM_TITLES,
  MATCH_LINES,
  MATCH_TITLES,
  pickLine,
  privateMatchLine,
  type GymLevel,
} from './copy.ts';
import type { MascotMood } from './mascot.ts';

/** A partir de esta hora «temprano» pasa a «se te hace tarde». */
export const LATE_HOUR = 18;
/** Una sesión del plan saltada y Repi se pone dramática; dos y cinco días sin ir, se duerme. */
export const SLIPPING_SESSIONS = 1;
export const GONE_DAYS = 5;

export const ROUTINES_URL = 'gymsheet:///routines';
export const CHATS_URL = 'gymsheet:///comunidad-mensajes';

export type NudgeEntry = Readonly<{
  date: Date;
  mood: MascotMood;
  title: string;
  body: string;
  /** Versión sin datos personales para la pantalla bloqueada. Igual a `body` en el de gym. */
  bodyPrivate: string;
  url: string;
}>;

export type GymNudgeInput = Readonly<{
  now: Date;
  lastWorkoutAt: Date | null;
  /** Días ISO (1 = lunes … 7 = domingo) con sesión fija; vacío = rutina sin días. */
  scheduledWeekdays: readonly number[];
  /** Nombre del día de la rutina por día ISO. */
  dayNames: Readonly<Partial<Record<number, string>>>;
  streakWeeks: number;
}>;

const LEVEL_MOOD: Readonly<Record<GymLevel, MascotMood>> = {
  proud: 'proud',
  early: 'wink',
  late: 'impatient',
  slipping: 'dramatic',
  gone: 'asleep',
  rest: 'resting',
};

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes());
}

/** Días de calendario locales entre dos fechas (cambios de hora incluidos). */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/** Semilla del día: misma frase todo el día, otra mañana. */
function daySeed(date: Date): number {
  return Math.floor(startOfDay(date).getTime() / DAY_MS);
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function isScheduled(input: GymNudgeInput, date: Date): boolean {
  return input.scheduledWeekdays.length === 0 || input.scheduledWeekdays.includes(isoWeekday(date));
}

/**
 * Sesiones del plan que se saltaron entre el último entreno y hoy (sin contar
 * ninguno de los dos). Cuenta sesiones y no días: quien entrena el viernes y
 * descansa el fin de semana no llega al lunes en falta. Sin días fijos, cada
 * día cuenta.
 */
export function skippedSessions(input: GymNudgeInput, at: Date): number | null {
  if (!input.lastWorkoutAt) return null;
  let skipped = 0;
  for (let offset = 1; offset < calendarDaysBetween(input.lastWorkoutAt, at); offset += 1) {
    if (isScheduled(input, addDays(startOfDay(input.lastWorkoutAt), offset))) skipped += 1;
  }
  return skipped;
}

/** El nivel en el instante `at`, suponiendo que no hubo entrenos después de `lastWorkoutAt`. */
export function gymLevel(input: GymNudgeInput, at: Date): GymLevel {
  const daysSince = input.lastWorkoutAt ? calendarDaysBetween(input.lastWorkoutAt, at) : null;
  if (daysSince === 0) return 'proud';
  const skipped = skippedSessions(input, at) ?? 0;
  if (daysSince !== null && daysSince >= GONE_DAYS && skipped >= SLIPPING_SESSIONS + 1) return 'gone';
  if (skipped >= SLIPPING_SESSIONS) return 'slipping';
  if (!isScheduled(input, at)) return 'rest';
  return at.getHours() >= LATE_HOUR ? 'late' : 'early';
}

export function gymEntry(input: GymNudgeInput, at: Date): NudgeEntry {
  const level = gymLevel(input, at);
  const context = {
    dayName: input.dayNames[isoWeekday(at)] ?? null,
    daysSince: input.lastWorkoutAt ? calendarDaysBetween(input.lastWorkoutAt, at) : null,
    streakWeeks: input.streakWeeks,
    clock: clock(at),
  };
  const body = pickLine(GYM_LINES[level], context, daySeed(at));
  return { date: at, mood: LEVEL_MOOD[level], title: GYM_TITLES[level](context), body, bodyPrivate: body, url: ROUTINES_URL };
}

/**
 * Ahora y cada cambio previsible de los próximos `days` días: medianoche (cambia
 * el nivel y la frase) y la hora tardía. Entradas consecutivas iguales se funden.
 */
export function gymTimeline(input: GymNudgeInput, days = 3): NudgeEntry[] {
  const today = startOfDay(input.now);
  const moments = [input.now];
  for (let offset = 0; offset <= days; offset += 1) {
    const day = addDays(today, offset);
    if (offset > 0) moments.push(day);
    moments.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), LATE_HOUR));
  }
  const entries: NudgeEntry[] = [];
  for (const moment of moments.filter((at) => at.getTime() >= input.now.getTime())) {
    const entry = gymEntry(input, moment);
    const previous = entries.at(-1);
    if (previous && previous.title === entry.title && previous.body === entry.body) continue;
    entries.push(entry);
  }
  return entries;
}

export type PendingMatch = Readonly<{
  userId: string;
  name: string;
  conversationId: string | null;
  /** Desde cuándo espera respuesta: su último mensaje, o el match si no hay chat. */
  since: Date;
}>;

export type MatchNudgeInput = Readonly<{
  now: Date;
  pending: number;
  oldest: PendingMatch | null;
  /** Ajuste «Mostrar nombres en el widget». La pantalla bloqueada nunca los muestra. */
  showNames: boolean;
}>;

/** «hace un rato», «hace 5 h», «ayer», «hace 3 días». */
export function waitedLabel(since: Date, now: Date): string {
  const hours = Math.floor((now.getTime() - since.getTime()) / 3_600_000);
  if (hours < 1) return 'hace un rato';
  const days = calendarDaysBetween(since, now);
  if (days === 0) return `hace ${hours} h`;
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

export function matchEntry(input: MatchNudgeInput, at: Date = input.now): NudgeEntry {
  const waiting = input.pending > 0;
  const context = {
    pending: input.pending,
    name: input.showNames && input.oldest ? input.oldest.name : null,
    waited: input.oldest ? waitedLabel(input.oldest.since, at) : null,
  };
  const kind = waiting ? 'waiting' : 'clear';
  const conversation = input.oldest?.conversationId;
  return {
    date: at,
    mood: waiting ? 'flirty' : 'proud',
    title: MATCH_TITLES[kind](context),
    body: pickLine(MATCH_LINES[kind], context, daySeed(at)),
    bodyPrivate: privateMatchLine(input.pending),
    url: waiting && conversation ? `gymsheet:///chat/${conversation}` : CHATS_URL,
  };
}

/** Ahora y las próximas medianoches: «ayer» pasa a «hace 2 días» sin abrir la app. */
export function matchTimeline(input: MatchNudgeInput, days = 3): NudgeEntry[] {
  const today = startOfDay(input.now);
  const moments = [input.now];
  for (let offset = 1; offset <= days; offset += 1) moments.push(addDays(today, offset));
  return moments.map((at) => matchEntry(input, at));
}

/** Hora de la notificación diaria de gym y de la de matches (fuera de 22:00–08:00). */
export const GYM_NOTIFY_HOUR = 19;
export const MATCH_NOTIFY_AT = { hour: 12, minute: 30 } as const;
/** Margen para no programar algo que ya casi pasó. */
const NOTIFY_MARGIN_MS = 5 * 60_000;

export type PlannedNotification = Readonly<{ id: string; date: Date; title: string; body: string; url: string }>;

/**
 * Notificaciones locales de los próximos días, como mucho una de gym al día y
 * una de matches. Ninguna si ya entrenaste o es día de descanso; la de matches
 * nunca lleva nombres (se ve con el teléfono bloqueado). Identificadores fijos:
 * reprogramar sustituye, no acumula.
 */
export function planNotifications(gym: GymNudgeInput, matches: MatchNudgeInput, days = 3): PlannedNotification[] {
  const planned: PlannedNotification[] = [];
  const earliest = gym.now.getTime() + NOTIFY_MARGIN_MS;
  const today = startOfDay(gym.now);
  for (let offset = 0; offset < days; offset += 1) {
    const day = addDays(today, offset);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), GYM_NOTIFY_HOUR);
    if (at.getTime() < earliest) continue;
    const entry = gymEntry(gym, at);
    if (entry.mood === 'proud' || entry.mood === 'resting') continue;
    planned.push({ id: `repi-gym-${offset}`, date: at, title: entry.title, body: entry.body, url: entry.url });
  }
  if (matches.pending > 0) {
    let at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), MATCH_NOTIFY_AT.hour, MATCH_NOTIFY_AT.minute);
    if (at.getTime() < earliest) at = addDays(at, 1);
    const entry = matchEntry({ ...matches, showNames: false }, at);
    planned.push({ id: 'repi-matches', date: at, title: entry.title, body: entry.body, url: entry.url });
  }
  return planned;
}
