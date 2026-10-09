import type { Exercise, RatingSummary } from './core';
import type {
  RoutineAssignmentStatus,
  RoutineStatus,
  RoutineVisibility,
  RoutineWritableVisibility,
  TrainingGoal,
} from './enums';

export type RoutineExercise = {
  id: string;
  orden: number;
  seriesObjetivo: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoObjetivoKg: number | null;
  rirObjetivo: number | null;
  descansoSeg: number | null;
  nota: string | null;
  ejercicio: Exercise | null;
};

/** Un día de la rutina. `diaSemana` 1 (lunes) a 7 (domingo), o null en una rutina de «cualquier día». */
export type RoutineDay = {
  id: string;
  diaSemana: number | null;
  nombre: string | null;
  orden: number;
  ejercicios: RoutineExercise[];
};

/** Congelada al copiar: de quién y de qué rutina viene. Las claves vienen en inglés del backend. */
export type RoutineAttribution = {
  routineName: string;
  authorId: string | null;
  authorName: string;
};

/** Progresión automática (D5): semana base + descarga activa. */
export type RoutineProgression = {
  activa?: boolean;
  descargaCada?: 4 | 5 | 6 | null;
  volumenDescarga?: number;
  cargaDescarga?: number;
};

export type Routine = {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoPorUsuarioId: string;
  visibilidad: RoutineVisibility;
  objetivo: TrainingGoal | null;
  estado: RoutineStatus;
  /** Aplanado, en orden; se mantiene mientras el portal del entrenador lo use. */
  ejercicios: RoutineExercise[];
  dias: RoutineDay[];
  duracionSemanas: number | null;
  progresion: RoutineProgression;
  esOficial: boolean;
  atribucion: RoutineAttribution | null;
  basadaEnRutinaId: string | null;
  basadaEnVersion: number | null;
  version: number;
  /** Verdadero en una copia cuyo original subió de versión (D2: nunca se aplica solo). */
  hayVersionNueva: boolean;
  huellaCorta: string | null;
  valoracion: RatingSummary;
  copias: number;
  publicadaEn: string | null;
  estadoModeracion: string;
  /** Lo calcula el backend para quien mira. */
  esMia: boolean;
  puedoEditar: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
};

export type RoutineAssignment = {
  id: string;
  rutinaId: string;
  clienteUsuarioId: string;
  asignadoPorUsuarioId: string;
  estado: RoutineAssignmentStatus;
  fechaProgramada: string | null;
  diasSemana: number[];
  nota: string | null;
  clienteNombre: string | null;
  clienteEmail: string | null;
  rutina: Routine | null;
  fechaCreacion: string;
};

export type ImportRoutineResult = {
  index: number;
  nombre: string;
  creada: boolean;
  routineId: string | null;
  error: string | null;
};

export type ImportRoutinesResponse = {
  resultados: ImportRoutineResult[];
  creadas: number;
};

/** Un ejercicio dentro de un día, como lo recibe `POST /routines` y `PUT /routines/:id/structure`. */
export type RoutineDayExerciseInput = {
  ejercicioId: string;
  seriesObjetivo: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoObjetivoKg: number | null;
  rirObjetivo: number | null;
  descansoSeg: number | null;
  nota: string | null;
};

export type RoutineDayInput = {
  diaSemana: number | null;
  nombre: string | null;
  ejercicios: RoutineDayExerciseInput[];
};

export type RoutineStructureInput = { dias: RoutineDayInput[] };

/** Cuerpo de `POST /routines` del asistente. `visibilidad` sólo PRIVATE hasta la fase de publicar. */
export type CreateRoutineWithDaysInput = {
  nombre: string;
  descripcion: string | null;
  objetivo: TrainingGoal | null;
  visibilidad: RoutineWritableVisibility;
  duracionSemanas: number;
  progresion: Required<Pick<RoutineProgression, 'activa' | 'descargaCada'>>;
  dias: RoutineDayInput[];
};

/** Una semana generada por la progresión (`GET /routines/:id/calendar`). */
export type RoutineWeek = {
  numero: number;
  esDescarga: boolean;
  factorVolumen: number;
  factorCarga: number;
  nota: string | null;
  dias: Array<{
    diaId: string;
    diaSemana: number | null;
    nombre: string | null;
    ejercicios: Array<{
      routineExerciseId: string;
      ejercicioId: string;
      orden: number;
      series: number;
      repsMin: number | null;
      repsMax: number | null;
      pesoObjetivoKg: number | null;
    }>;
  }>;
};

export type RoutineCalendar = {
  rutinaId: string;
  duracionSemanas: number | null;
  progresion: RoutineProgression;
  semanas: RoutineWeek[];
};

/** `PUT /routines/:id/weeks/:n`. */
export type RoutineWeekOverrideInput = {
  esDescarga: boolean;
  factorVolumen?: number;
  factorCarga?: number;
  nota?: string | null;
};

export type RoutineWeekOverride = {
  semana: number;
  esDescarga: boolean;
  factorVolumen: number;
  factorCarga: number;
  nota: string | null;
};

/** Resultado de dar o quitar «me gusta» a un ejercicio. */
export type ExerciseLikeResult = { meGusta: boolean; meGustaTotal: number };

/** Códigos estables de error de dominio (cuerpo `code` de la respuesta de error). Se compara esto, nunca el texto. */
export const domainErrorCodes = [
  'ROUTINE_DUPLICATE',
  'PROGRAM_ACTIVE_CONFLICT',
  'SHARE_PENDING',
  'SHARE_ALREADY_EXISTS',
  'CANNOT_RATE_OWN',
  'OFFICIAL_FORBIDDEN',
  'ROUTINE_HAS_NO_DAYS',
  'CONTENT_HIDDEN',
] as const;
export type DomainErrorCode = (typeof domainErrorCodes)[number];
