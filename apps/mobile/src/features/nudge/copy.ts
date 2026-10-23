/**
 * Lo que dice Repi. Voz de REPP: de tú, frases cortas, sin admiraciones en
 * cadena. Se burla del **hábito**, nunca del cuerpo, del peso ni de la comida, y
 * no usa adjetivos con género sobre la persona («listo», «cansada»): Repi sí
 * tiene género (la gota), quien lee no se sabe.
 *
 * Cada nivel tiene varias frases; `pickLine` elige una estable durante el día
 * y distinta al siguiente, para que el widget no se vuelva paisaje.
 */

export type GymLevel = 'proud' | 'early' | 'late' | 'slipping' | 'gone' | 'rest';

export type GymCopyContext = Readonly<{
  /** Nombre del día de la rutina que toca hoy, si lo hay. */
  dayName: string | null;
  /** Días de calendario desde el último entreno (null = nunca entrenó). */
  daysSince: number | null;
  streakWeeks: number;
  /** «19:40» para la frase de la tarde. */
  clock: string;
}>;

type Line = (context: GymCopyContext) => string | null;

const weeks = (count: number) => `${count} ${count === 1 ? 'semana' : 'semanas'}`;

export const GYM_TITLES: Readonly<Record<GymLevel, (context: GymCopyContext) => string>> = {
  proud: () => 'Entreno hecho',
  early: (context) => (context.dayName ? `Hoy toca ${context.dayName}` : 'Hoy toca entrenar'),
  late: () => 'Se te hace tarde',
  slipping: (context) => `${context.daysSince ?? 2} días sin ir`,
  gone: () => 'Repi se durmió',
  rest: () => 'Día de descanso',
};

export const GYM_LINES: Readonly<Record<GymLevel, readonly Line[]>> = {
  proud: [
    () => 'Repi está orgullosa. Y sudando, que es lo mismo.',
    () => 'El sofá de hoy sí te lo ganaste.',
    (context) => (context.streakWeeks > 0 ? `Tu racha de ${weeks(context.streakWeeks)} respira tranquila.` : null),
  ],
  early: [
    () => 'Repi ya calentó. Te toca a ti.',
    () => 'Las pesas no se levantan solas. Repi lo intentó.',
    (context) => (context.dayName ? `${context.dayName} te espera. Sin presión. Bueno, un poco.` : null),
  ],
  late: [
    (context) => `Son las ${context.clock} y las pesas siguen preguntando por ti.`,
    () => 'El sofá no cuenta como máquina. Repi lo comprobó.',
    () => 'Aún llegas. Repi cree en ti. A medias.',
  ],
  slipping: [
    (context) => (context.streakWeeks > 0 ? `Tu racha de ${weeks(context.streakWeeks)} está temblando. Repi también.` : null),
    () => 'Repi ya está escribiendo poemas tristes. Ve antes de que los publique.',
    () => 'Las mancuernas preguntan si te mudaste.',
  ],
  gone: [
    () => 'Se quedó dormida esperándote. Despiértala con una serie.',
    () => 'Ya ni te espera. Mentira, sí te espera. Ve.',
    (context) => `${context.daysSince ?? 5} días. Tu taquilla ya tiene telarañas.`,
  ],
  rest: [
    () => 'Hoy descansas. Disfrútalo, mañana no.',
    () => 'Día libre. Bebe agua, que Repi se entera.',
  ],
};

export type MatchCopyContext = Readonly<{
  pending: number;
  /** Nombre de quien espera desde hace más tiempo; null si no hay que mostrarlo. */
  name: string | null;
  /** «hace 2 días». */
  waited: string | null;
}>;

export const MATCH_TITLES = {
  waiting: (context: MatchCopyContext) =>
    context.pending === 1 ? 'Un match te espera' : `${context.pending} matches te esperan`,
  clear: () => 'Al día con tus matches',
} as const;

export const MATCH_LINES: Readonly<Record<'waiting' | 'clear', readonly ((context: MatchCopyContext) => string | null)[]>> = {
  waiting: [
    (context) => (context.name && context.waited ? `${context.name} te escribió ${context.waited}. Ya cree que le hiciste ghosting.` : null),
    () => 'Repi no puede responder por ti. Lo intentó, no la dejan.',
    (context) => (context.name ? `${context.name} sigue mirando el chat. Di algo.` : null),
    () => 'Un «hola» cuesta menos que una serie.',
  ],
  clear: [() => 'Nadie esperando. Ahora sí, al gym.', () => 'Respondiste a todos. Repi está impresionada.'],
};

/** Frase sin datos personales: la que se ve con el teléfono bloqueado. */
export function privateMatchLine(pending: number): string {
  return pending === 0 ? 'Al día con tus matches.' : `${pending === 1 ? 'Un match espera' : `${pending} matches esperan`} tu respuesta.`;
}

/** Una frase del nivel: estable durante el día, rota con la fecha, salta las que no aplican. */
export function pickLine<C>(lines: readonly ((context: C) => string | null)[], context: C, seed: number): string {
  const candidates = lines.map((line) => line(context)).filter((line): line is string => line !== null);
  if (candidates.length === 0) throw new Error('Nivel sin frases aplicables');
  return candidates[seed % candidates.length] as string;
}
