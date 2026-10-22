import type { Exercise } from './core';
import type { WorkoutStatus } from './enums';
import type { RoutineGroupType } from './training';

export type WorkoutSet = {
  id: string;
  numeroSerie: number;
  /** `CARDIO` no lleva repeticiones, peso ni RIR (llegan `null`). Sin él se asume fuerza. */
  tipoSerie: 'FUERZA' | 'CARDIO';
  /** `null` también en una serie de fuerza por tiempo (plancha 45 s): lleva `duracionSeg`. */
  repeticiones: number | null;
  pesoKg: number | null;
  rir: number | null;
  /** Segundos: en cardio, o en una serie de fuerza por tiempo (sin repeticiones). */
  duracionSeg: number | null;
  distanciaM: number | null;
  fcMedia: number | null;
  rpe: number | null;
  descansoSegAnterior: number;
  fechaRegistro: string;
};

/** Por qué se saltó una serie o se omitió un ejercicio (D1). */
export const skipReasons = ['CANSANCIO', 'PRISA', 'DOLOR', 'EQUIPO_OCUPADO', 'TECNICA', 'OTRO'] as const;
export type SkipReason = (typeof skipReasons)[number];

/** Zonas que se pueden elegir al armar una rutina libre (`POST /workouts/libre`). */
export const freeWorkoutGroups = ['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'CORE', 'LEGS', 'GLUTES', 'CALVES'] as const;
export type FreeWorkoutGroup = (typeof freeWorkoutGroups)[number];

/** Por qué se cambia un ejercicio a mitad de entreno. */
export const swapReasons = [
  'MAQUINA_OCUPADA',
  'SIN_EQUIPO',
  'MOLESTIA',
  'MUY_DIFICIL',
  'MUY_FACIL',
  'PREFERENCIA',
  'CAMBIO_DE_PLAN',
] as const;
export type SwapReason = (typeof swapReasons)[number];

/** Solo esta sesión, o también la rutina de la que salió. */
export const swapScopes = ['SESION', 'RUTINA'] as const;
export type SwapScope = (typeof swapScopes)[number];

/** Serie saltada: no es una fila de `series`; no cuenta para volumen, récords ni puntos. */
export type SkippedSet = {
  id: string;
  numeroSerie: number;
  motivo: SkipReason;
  nota: string | null;
  fechaRegistro: string;
};

export type OmittedMark = { motivo: SkipReason; nota: string | null; fecha: string };

export type WorkoutExercise = {
  id: string;
  orden: number;
  esEnfasis: boolean;
  nota: string | null;
  /** Objetivo copiado de la rutina al empezar (C3.a); todo `null` si se añadió a mano. */
  seriesObjetivo: number | null;
  repsMin: number | null;
  repsMax: number | null;
  pesoObjetivoKg: number | null;
  rirObjetivo: number | null;
  descansoSeg: number | null;
  descansoEntreSeg: number | null;
  duracionSeg: number | null;
  grupo: number | null;
  grupoTipo: RoutineGroupType | null;
  ejercicio: Exercise | null;
  series: WorkoutSet[];
  /** Series saltadas con su motivo (D1). Vacío en respuestas anteriores al contrato. */
  saltadas: SkippedSet[];
  /** Ejercicio omitido con su motivo, o `null`. */
  omitido: OmittedMark | null;
};

export type Workout = {
  id: string;
  usuarioId: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: WorkoutStatus;
  observacion: string | null;
  ejercicios: WorkoutExercise[];
  /** De dónde nació la sesión (`null` si fue libre o el servidor aún no lo dice). */
  rutinaId?: string | null;
  rutinaDiaId?: string | null;
};

/** `PATCH /workouts/:id/rest-settings`: un cambio de descanso, intervalo o tiempo de trabajo. */
export type RestSettingChange = {
  sesionEjercicioId: string;
  descansoSeg?: number;
  descansoEntreSeg?: number;
  duracionSeg?: number;
};

export type CreateWorkoutInput = {
  observacion?: string | null;
};

export type AddWorkoutExerciseInput = {
  ejercicioId: string;
  orden: number;
  esEnfasis?: boolean;
  nota?: string | null;
};

/** Serie de fuerza por repeticiones de `POST /workouts/session-exercises/:id/sets`. */
export type WorkoutSetInput = {
  numeroSerie: number;
  repeticiones: number;
  pesoKg: number;
  rir: number;
  /** Nunca junto a las repeticiones: una serie por tiempo es `TimedWorkoutSetInput`. */
  duracionSeg?: null;
  descansoSegAnterior: number;
};

/** Tope del backend para una serie de fuerza por tiempo. */
export const MAX_TIMED_SET_SEC = 3600;

/**
 * Serie de fuerza por tiempo (plancha 45 s): `duracionSeg` 1–3600 y sin
 * repeticiones. Solo vale en un ejercicio de la sesión con `duracionSeg`
 * (si no, `400 SET_DURATION_NOT_ALLOWED`). Peso (lastre) y RIR opcionales.
 */
export type TimedWorkoutSetInput = {
  numeroSerie: number;
  duracionSeg: number;
  pesoKg?: number;
  rir?: number;
  descansoSegAnterior: number;
};

/**
 * `PATCH /workouts/sets/:id`. No cambia la forma de la serie: `duracionSeg`
 * solo en una por tiempo y `repeticiones` solo en una por repeticiones
 * (si no, `400 SET_KIND_MISMATCH`).
 */
export type WorkoutSetUpdateInput = Partial<Omit<WorkoutSetInput, 'duracionSeg'>> & {
  duracionSeg?: number;
};
