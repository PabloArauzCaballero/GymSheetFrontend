import type { CardioPlanInput, CardioSessionExtras } from '@gymsheet/types';

/** Tanaka: 208 − 0,7 × edad. Es el valor por defecto de la FC máxima (editable). */
export function maxHeartRate(age: number): number {
  return Math.round(208 - 0.7 * age);
}

const ZONE_PERCENT: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.0],
];

/** Límites (lpm) de una zona 1–5. Con FC en reposo: Karvonen; sin ella, % de la FC máxima. */
export function zoneBounds(zone: number, hrMax: number, hrRest?: number | null): { minBpm: number; maxBpm: number } {
  const [low, high] = ZONE_PERCENT[Math.min(Math.max(zone, 1), 5) - 1] as readonly [number, number];
  if (hrRest != null && hrRest > 0 && hrRest < hrMax) {
    const reserve = hrMax - hrRest;
    return { minBpm: Math.round(hrRest + low * reserve), maxBpm: Math.round(hrRest + high * reserve) };
  }
  return { minBpm: Math.round(low * hrMax), maxBpm: Math.round(high * hrMax) };
}

export const ZONE_NAMES = ['Muy suave', 'Suave', 'Moderada', 'Intensa', 'Máxima'] as const;

export const zoneLabel = (zone: number): string => `Z${zone} · ${ZONE_NAMES[Math.min(Math.max(zone, 1), 5) - 1]}`;

/** Zona (1–5) de una FC media; 0 si está por debajo de la zona 1. */
export function zoneOfHeartRate(bpm: number, hrMax: number, hrRest?: number | null): number {
  let found = 0;
  for (let zone = 1; zone <= 5; zone += 1) if (bpm >= zoneBounds(zone, hrMax, hrRest).minBpm) found = zone;
  return found;
}

/** Borg CR10: 1–2 ≈ Z1, 3–4 ≈ Z2, 5–6 ≈ Z3, 7–8 ≈ Z4, 9–10 ≈ Z5. */
export function zoneOfRpe(rpe: number): number {
  return rpe <= 2 ? 1 : Math.min(Math.ceil(rpe / 2), 5);
}

/** Minutos objetivo por sesión de la semana `week` (1-based): +pct por semana, tope 300. */
export function targetMinutesForWeek(baseMinutes: number, progressionPct: number, week: number): number {
  const pct = Math.min(Math.max(progressionPct, 0), 10) / 100;
  const grown = baseMinutes * (1 + pct) ** Math.max(week - 1, 0);
  return Math.min(Math.ceil(Math.round(grown * 1e6) / 1e6), 300);
}

/** «mm:ss» o «h:mm:ss» del cronómetro. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/** «96 / 90 min»: minutos que cuentan frente al objetivo de la semana. */
export function cardioProgressLabel(block: Pick<CardioSessionExtras, 'minutosSemana' | 'objetivoMinutosSemana'>): string {
  return `${Math.round(block.minutosSemana)} / ${Math.round(block.objetivoMinutosSemana)} min`;
}

export type CardioForm = {
  nombre: string;
  modalidad: CardioPlanInput['modalidad'];
  dias: number[];
  minutos: string;
  modoIntensidad: 'ZONA_FC' | 'RPE';
  zona: number;
  rpe: number;
  fcReposo: string;
  fcMax: string;
  progresion: number;
};

export const defaultCardioForm: CardioForm = {
  nombre: '', modalidad: 'BICI', dias: [], minutos: '30', modoIntensidad: 'ZONA_FC', zona: 2, rpe: 4,
  fcReposo: '', fcMax: '', progresion: 5,
};

const int = (text: string): number | null => {
  const value = Number(text);
  return text.trim() !== '' && Number.isInteger(value) ? value : null;
};

export type CardioErrors = Partial<Record<'dias' | 'minutos' | 'fcReposo' | 'fcMax', string>>;

export function validateCardio(form: CardioForm): CardioErrors {
  const errors: CardioErrors = {};
  if (form.dias.length === 0) errors.dias = 'Elige al menos un día.';
  const minutes = int(form.minutos);
  if (minutes === null || minutes < 5 || minutes > 300) errors.minutos = 'Entre 5 y 300 minutos.';
  const rest = int(form.fcReposo);
  const max = int(form.fcMax);
  if (form.fcReposo.trim() !== '' && (rest === null || rest < 30 || rest > 120)) errors.fcReposo = 'Entre 30 y 120 lpm.';
  if (form.fcMax.trim() !== '' && (max === null || max < 120 || max > 230)) errors.fcMax = 'Entre 120 y 230 lpm.';
  return errors;
}

export function buildCardioPlan(form: CardioForm): CardioPlanInput {
  const rest = int(form.fcReposo);
  const max = int(form.fcMax);
  return {
    nombre: form.nombre.trim().length >= 2 ? form.nombre.trim() : `Cardio ${form.modalidad.toLowerCase()}`,
    modalidad: form.modalidad,
    diasSemana: [...form.dias].sort((a, b) => a - b),
    minutosObjetivo: int(form.minutos) ?? 30,
    intensidad: form.modoIntensidad === 'ZONA_FC' ? { tipo: 'ZONA_FC', zona: form.zona } : { tipo: 'RPE', rpe: form.rpe },
    fcReposo: rest,
    fcMax: max,
    progresionPctSemana: form.progresion,
  };
}

/** Datos de una serie de cardio para `POST /workouts/session-exercises/:id/sets`. */
export function buildCardioSet(input: {
  numeroSerie: number;
  segundos: number;
  distanciaKm: string;
  fcMedia: string;
  esfuerzo: number | null;
}) {
  const km = Number(input.distanciaKm.replace(',', '.'));
  const bpm = int(input.fcMedia);
  return {
    tipoSerie: 'CARDIO' as const,
    numeroSerie: input.numeroSerie,
    duracionSeg: Math.max(1, Math.round(input.segundos)),
    ...(Number.isFinite(km) && km > 0 ? { distanciaM: Math.round(km * 1000) } : {}),
    ...(bpm !== null && bpm >= 30 && bpm <= 230 ? { fcMedia: bpm } : {}),
    ...(input.esfuerzo !== null ? { rpe: input.esfuerzo } : {}),
    descansoSegAnterior: 0,
  };
}
