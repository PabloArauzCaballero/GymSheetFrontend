import { cardioModalities, type CardioModality, type CardioPlanInput } from '@gymsheet/types';

/**
 * Cálculos del asistente de cardio que SOLO se muestran (RF-17): FC máxima,
 * zonas de Karvonen y minutos objetivo de cada semana. El servidor tiene los
 * mismos números (04 · Motor §4) y es quien cuenta los minutos de verdad; aquí se
 * repiten para enseñar «tus zonas» antes de guardar el plan.
 */
export const MODALITY_LABEL: Record<CardioModality, string> = {
  CORRER: 'Correr',
  CAMINAR: 'Caminar',
  BICI: 'Bici',
  REMO: 'Remo',
  ELIPTICA: 'Elíptica',
  ESCALADORA: 'Escaladora',
  NADAR: 'Natación',
  HIIT: 'HIIT',
  OTRO: 'Otro',
};

/** Tanaka: 208 − 0,7 × edad. */
export const maxHeartRate = (age: number) => Math.round(208 - 0.7 * age);

const ZONE_PERCENT: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.6],
  [0.6, 0.7],
  [0.7, 0.8],
  [0.8, 0.9],
  [0.9, 1.0],
];

export const ZONE_NAME = ['Muy suave', 'Suave', 'Moderada', 'Intensa', 'Máxima'] as const;

/** Límites en lpm de una zona 1–5; con pulso en reposo, Karvonen; sin él, % de la FC máxima. */
export function zoneBounds(zone: number, hrMax: number, hrRest: number | null) {
  const [low, high] = ZONE_PERCENT[Math.min(Math.max(zone, 1), 5) - 1]!;
  if (hrRest !== null && hrRest > 0 && hrRest < hrMax) {
    const reserve = hrMax - hrRest;
    return { min: Math.round(hrRest + low * reserve), max: Math.round(hrRest + high * reserve) };
  }
  return { min: Math.round(low * hrMax), max: Math.round(high * hrMax) };
}

/** Borg CR10 → zona: 1–2 → 1, 3–4 → 2, 5–6 → 3, 7–8 → 4, 9–10 → 5. */
export const zoneOfRpe = (rpe: number) => (rpe <= 2 ? 1 : Math.min(Math.ceil(rpe / 2), 5));

/** Minutos de una sesión en la semana `week` (1 = la primera): +pct por semana, sin pasar de 300. */
export function sessionMinutesForWeek(base: number, pct: number, week: number): number {
  const rate = Math.min(Math.max(pct, 0), 10) / 100;
  const grown = base * (1 + rate) ** Math.max(week - 1, 0);
  return Math.min(Math.ceil(Math.round(grown * 1e6) / 1e6), 300);
}

export type CardioDraft = {
  modalidad: CardioModality;
  dias: number[];
  minutos: string;
  tipo: 'ZONA_FC' | 'RPE';
  zona: number;
  rpe: number;
  fcReposo: string;
  fcMax: string;
  intervalos: boolean;
  trabajoSeg: string;
  descansoSeg: string;
  rondas: string;
  progresion: string;
  semanas: string;
};

export const defaultCardioDraft: CardioDraft = {
  modalidad: 'BICI',
  dias: [1, 3, 5],
  minutos: '30',
  tipo: 'ZONA_FC',
  zona: 2,
  rpe: 4,
  fcReposo: '',
  fcMax: '',
  intervalos: false,
  trabajoSeg: '30',
  descansoSeg: '30',
  rondas: '8',
  progresion: '5',
  semanas: '4',
};

const num = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
};

export type CardioErrors = Partial<Record<'dias' | 'minutos' | 'fcReposo' | 'fcMax' | 'intervalos' | 'progresion' | 'semanas', string>>;

export function validateCardio(draft: CardioDraft): CardioErrors {
  const errors: CardioErrors = {};
  if (draft.dias.length === 0) errors.dias = 'Elige al menos un día.';
  const minutes = num(draft.minutos);
  if (minutes === null || !Number.isInteger(minutes) || minutes < 5 || minutes > 300) errors.minutos = 'Entre 5 y 300 minutos por sesión.';
  const rest = num(draft.fcReposo);
  if (draft.fcReposo.trim() !== '' && (rest === null || rest < 30 || rest > 120)) errors.fcReposo = 'Tu pulso en reposo va de 30 a 120 lpm.';
  const max = num(draft.fcMax);
  if (draft.fcMax.trim() !== '' && (max === null || max < 120 || max > 230)) errors.fcMax = 'La FC máxima va de 120 a 230 lpm.';
  if (draft.intervalos) {
    const values = [num(draft.trabajoSeg), num(draft.descansoSeg), num(draft.rondas)];
    if (values.some((value) => value === null || value < 1)) errors.intervalos = 'Completa trabajo, descanso y rondas.';
  }
  const pct = num(draft.progresion);
  if (pct === null || pct < 0 || pct > 10) errors.progresion = 'De 0 a 10 % por semana.';
  const weeks = num(draft.semanas);
  if (weeks === null || !Number.isInteger(weeks) || weeks < 1 || weeks > 52) errors.semanas = 'Entre 1 y 52 semanas.';
  return errors;
}

export const hasCardioErrors = (errors: CardioErrors) => Object.keys(errors).length > 0;

export function buildCardioPlan(draft: CardioDraft, name: string): CardioPlanInput {
  const rest = num(draft.fcReposo);
  const max = num(draft.fcMax);
  return {
    nombre: name,
    modalidad: draft.modalidad,
    diasSemana: draft.dias,
    minutosObjetivo: Number(draft.minutos),
    intensidad: draft.tipo === 'ZONA_FC' ? { tipo: 'ZONA_FC', zona: draft.zona } : { tipo: 'RPE', rpe: draft.rpe },
    intervalos: draft.intervalos
      ? { trabajoSeg: Number(draft.trabajoSeg), descansoSeg: Number(draft.descansoSeg), rondas: Number(draft.rondas) }
      : null,
    ...(rest !== null ? { fcReposo: rest } : {}),
    ...(max !== null ? { fcMax: max } : {}),
    progresionPctSemana: Math.round(Number(draft.progresion)),
  };
}

export const isModality = (value: string): value is CardioModality => (cardioModalities as readonly string[]).includes(value);

/** «Haz primero las pesas» / «Mejor bici hoy»: el consejo cuando un día lleva pesas y cardio. */
export function weightsAdvice(cardioDays: readonly number[], weightDays: readonly number[]): string | null {
  const shared = cardioDays.filter((day) => weightDays.includes(day));
  return shared.length > 0 ? 'Haz primero las pesas y después el cardio.' : null;
}
