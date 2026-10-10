import type { TrainingGoal } from '@gymsheet/types';
import { newDraftUid } from './groups';

/**
 * Borrador del asistente de creación de rutinas (RF-03..08).
 *
 * Todo este módulo es lógica pura, sin React ni almacenamiento: lo comparten el
 * móvil y la web y se prueba sin pantalla. Los hooks de React no viven aquí
 * (ADR-008: el móvil es `nohoist` y tiene su propia copia de React); cada app
 * envuelve `routineDraftReducer` en un `useReducer` de unas pocas líneas.
 */

/** 1 = lunes … 7 = domingo, igual que `routine_days.dia_semana` en el backend. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

/** Una letra para las tiras de días (L M X J V S D). */
export const WEEKDAY_INITIALS: Record<Weekday, string> = {
  1: 'L',
  2: 'M',
  3: 'X',
  4: 'J',
  5: 'V',
  6: 'S',
  7: 'D',
};

/** Tres letras para la vista Mes. */
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

export type DraftExercise = {
  /**
   * Clave local de la fila (no viaja al backend). Las ediciones se identifican
   * por ella y no por `ejercicioId`, porque un ejercicio puede repetirse en el día.
   */
  uid: string;
  ejercicioId: string;
  nombre: string;
  /** Sólo para los avisos de frecuencia por músculo; el backend no lo recibe. */
  grupoMuscular: string;
  seriesObjetivo: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoObjetivoKg: number | null;
  rirObjetivo: number | null;
  descansoSeg: number | null;
  nota: string | null;
  /** Bloque (superserie o circuito): mismo número y contiguos = mismo bloque. Local al día. */
  grupo: number | null;
  /** Transición dentro del bloque (0–60 s); `null` fuera de un bloque. */
  descansoEntreSeg: number | null;
  /** Serie por tiempo (1–3600 s). Con duración, `repsMin`/`repsMax` son `null`. */
  duracionSeg: number | null;
};

export type DraftDay = {
  diaSemana: Weekday;
  /** Nombre libre del día («Empuje»). Vacío = sin nombre. */
  nombre: string;
  ejercicios: DraftExercise[];
};

export type DurationUnit = 'semanas' | 'meses';

export type DraftDuration = { unidad: DurationUnit; cantidad: number };

export type DraftProgression = {
  activa: boolean;
  descargaCada: 4 | 5 | 6 | null;
};

/** Ajuste manual de una semana de la revisión (RF-08). */
export type WeekChoice = 'DESCARGA' | 'NORMAL';

export type RoutineDraft = {
  /** Se rellena tras el primer guardado correcto: los guardados siguientes son `PUT structure`. */
  routineId: string | null;
  nombre: string;
  descripcion: string;
  objetivo: TrainingGoal | null;
  /** Sólo PRIVATE hasta que llegue la fase de publicar (F4). */
  visibilidad: 'PRIVATE';
  duracion: DraftDuration;
  progresion: DraftProgression;
  /** Días de entrenamiento elegidos, ordenados de lunes a domingo. */
  dias: DraftDay[];
  /** Ajustes manuales por número de semana (clave = número como texto, por JSON). */
  semanas: Record<string, WeekChoice>;
};

/** Destino de las ediciones de ejercicios: un día, o el borrador de «Configurar juntos». */
export type DayTarget = Weekday | 'grupo';

export type GroupDraft = { dias: Weekday[]; ejercicios: DraftExercise[] };

/** Pasos con barra de progreso. La pantalla de ejercicios de un día es una subpantalla del paso `dias`. */
export const WIZARD_STEPS = [
  { id: 'nombre', titulo: 'Nombre' },
  { id: 'descripcion', titulo: 'Descripción' },
  { id: 'objetivo', titulo: 'Objetivo' },
  { id: 'duracion', titulo: 'Duración' },
  { id: 'dias', titulo: 'Días' },
  { id: 'revision', titulo: 'Revisión' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

/** Etiqueta en español de cada objetivo de entrenamiento. */
export const GOAL_LABELS: Record<TrainingGoal, string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  REHABILITACION: 'Rehabilitación',
};

export const MAX_WEEKS = 52;
export const WEEKS_PER_MONTH = 4;
/** Duraciones rápidas en meses; «a medida» se expresa en semanas. */
export const QUICK_MONTHS = [1, 2, 3, 4, 6, 12] as const;

export function createEmptyDraft(): RoutineDraft {
  return {
    routineId: null,
    nombre: '',
    descripcion: '',
    objetivo: null,
    visibilidad: 'PRIVATE',
    duracion: { unidad: 'meses', cantidad: 3 },
    progresion: { activa: true, descargaCada: 4 },
    dias: [],
    semanas: {},
  };
}

/** Semanas totales de la duración elegida (3 meses = 12 semanas). */
export function durationInWeeks(duracion: DraftDuration): number {
  return duracion.unidad === 'meses' ? duracion.cantidad * WEEKS_PER_MONTH : duracion.cantidad;
}

export function weekdayName(dia: Weekday): string {
  return WEEKDAY_NAMES[dia];
}

export function findDay(draft: RoutineDraft, dia: Weekday): DraftDay | undefined {
  return draft.dias.find((day) => day.diaSemana === dia);
}

export function totalSets(exercises: readonly DraftExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + exercise.seriesObjetivo, 0);
}

/** «4 días · 12 semanas». */
export function summarizeStructure(draft: RoutineDraft): string {
  const n = draft.dias.length;
  const weeks = durationInWeeks(draft.duracion);
  return `${n} ${n === 1 ? 'día' : 'días'} · ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
}

/** «3 ejercicios». */
export function countLabel(n: number): string {
  return `${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}`;
}

/** Valores por defecto de un ejercicio recién añadido, según el objetivo (03 · RF-06). */
export function defaultsForGoal(
  goal: TrainingGoal | null,
): Pick<DraftExercise, 'seriesObjetivo' | 'repsMin' | 'repsMax' | 'descansoSeg'> {
  switch (goal) {
    case 'FUERZA':
      return { seriesObjetivo: 5, repsMin: 3, repsMax: 5, descansoSeg: 180 };
    case 'RESISTENCIA':
      return { seriesObjetivo: 3, repsMin: 15, repsMax: 20, descansoSeg: 45 };
    case 'PERDIDA_GRASA':
      return { seriesObjetivo: 3, repsMin: 12, repsMax: 15, descansoSeg: 60 };
    case 'SALUD_GENERAL':
      return { seriesObjetivo: 3, repsMin: 10, repsMax: 12, descansoSeg: 60 };
    case 'REHABILITACION':
      return { seriesObjetivo: 2, repsMin: 12, repsMax: 15, descansoSeg: 60 };
    case 'HIPERTROFIA':
    default:
      return { seriesObjetivo: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 };
  }
}

/** Zonas del dataset (`bodyPart`) a la etiqueta que se muestra y se cuenta en los avisos. */
const ZONE_LABELS: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'lower arms': 'Antebrazos',
  'upper legs': 'Piernas',
  'lower legs': 'Gemelos',
  waist: 'Abdomen',
  cardio: 'Cardio',
  neck: 'Cuello',
  pecho: 'Pecho',
  pierna: 'Piernas',
};

/** Zonas que no cuentan para el aviso de frecuencia por músculo. */
export const ZONES_WITHOUT_FREQUENCY_WARNING: readonly string[] = ['Cardio', 'Cuello'];

/**
 * Zona muscular de un ejercicio, unificada: el catálogo trae `bodyPart` en
 * inglés (dataset) o `grupoMuscular` en mayúsculas (ejercicios propios), y los
 * avisos de frecuencia tienen que contar «Pecho» una sola vez.
 */
export function muscleZone(exercise: { grupoMuscular: string; bodyPart?: string | null }): string {
  const raw = (exercise.bodyPart ?? exercise.grupoMuscular).trim().toLowerCase();
  const known = ZONE_LABELS[raw];
  if (known) return known;
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
}

export function createDraftExercise(
  exercise: {
    id: string;
    nombre: string;
    nombreEs?: string | null;
    grupoMuscular: string;
    bodyPart?: string | null;
  },
  goal: TrainingGoal | null,
): DraftExercise {
  return {
    uid: newDraftUid(),
    ejercicioId: exercise.id,
    nombre: exercise.nombreEs?.trim() || exercise.nombre,
    grupoMuscular: muscleZone(exercise),
    ...defaultsForGoal(goal),
    pesoObjetivoKg: null,
    rirObjetivo: null,
    nota: null,
    grupo: null,
    descansoEntreSeg: null,
    duracionSeg: null,
  };
}
