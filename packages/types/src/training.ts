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
  /**
   * Bloque (superserie o circuito) dentro del día: los ejercicios contiguos con el
   * mismo `grupo` forman un bloque. `null` = ejercicio suelto.
   */
  grupo: number | null;
  /** Lo deriva el backend: 2 ejercicios = SUPERSERIE, 3 o más = CIRCUITO. */
  grupoTipo: RoutineGroupType | null;
  /** Transición dentro del bloque (0–60 s). El descanso tras la vuelta es el `descansoSeg` del último. */
  descansoEntreSeg: number | null;
  /** Serie por tiempo (plancha 30 s). Con duración, `repsMin`/`repsMax` llegan `null`. */
  duracionSeg: number | null;
  ejercicio: Exercise | null;
};

/** Tipo de bloque de una rutina (C3.a). */
export const routineGroupTypes = ['SUPERSERIE', 'CIRCUITO'] as const;
export type RoutineGroupType = (typeof routineGroupTypes)[number];

/** Topes de entrada de un ejercicio de rutina (C3.a): los mismos que valida el backend. */
export const routineExerciseLimits = {
  seriesMin: 1,
  seriesMax: 10,
  repsMin: 1,
  repsMax: 50,
  grupoMax: 30,
  descansoEntreMax: 60,
  duracionMin: 1,
  duracionMax: 3600,
  rirMax: 10,
  descansoMax: 7200,
  pesoMax: 2000,
} as const;

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
  /** N de «<nombre> · vN» en una copia propia (C2); `null` si no es una copia. */
  numeroCopia: number | null;
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
  /** 1–30; ≥2 ejercicios contiguos por bloque o `400 ROUTINE_GROUP_INVALID`. `grupoTipo` no se envía. */
  grupo?: number | null;
  /** 0–60; se anula fuera de un bloque. */
  descansoEntreSeg?: number | null;
  /** 1–3600; con duración, las reps se guardan `null`. */
  duracionSeg?: number | null;
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
      descansoSeg: number | null;
      rirObjetivo: number | null;
      nota: string | null;
      grupo: number | null;
      grupoTipo: RoutineGroupType | null;
      descansoEntreSeg: number | null;
      duracionSeg: number | null;
      /** Solo si el usuario tiene un programa activo con esta rutina (modo con cargas). */
      pesoSugeridoKg?: number | null;
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
  'ROUTINE_NOT_OWNED',
  'ROUTINE_GROUP_INVALID',
] as const;
export type DomainErrorCode = (typeof domainErrorCodes)[number];

/**
 * Texto humano de cada código de dominio, el mismo en web y móvil. Las pantallas
 * pueden afinarlo con el contexto, pero nunca enseñan el `message` del servidor.
 */
export const domainErrorMessages: Record<DomainErrorCode, string> = {
  ROUTINE_DUPLICATE: 'Ya existe una rutina idéntica. Cambia algún día, ejercicio o repetición.',
  PROGRAM_ACTIVE_CONFLICT: 'Ya tienes un programa activo.',
  SHARE_PENDING: 'Acepta la invitación para ver esta rutina.',
  SHARE_ALREADY_EXISTS: 'Ya compartiste esta rutina con esta persona.',
  CANNOT_RATE_OWN: 'No puedes valorar lo que creaste tú.',
  OFFICIAL_FORBIDDEN: 'Una rutina oficial solo la gestiona REPP.',
  ROUTINE_HAS_NO_DAYS: 'Cada día necesita al menos un ejercicio.',
  CONTENT_HIDDEN: 'Este contenido está oculto mientras lo revisamos.',
  ROUTINE_NOT_OWNED: 'Guárdala en tus rutinas para activarla',
  ROUTINE_GROUP_INVALID: 'Una superserie necesita al menos 2 ejercicios seguidos',
};

/** El texto humano de un código de error de dominio, o `null` si no es uno conocido. */
export function domainErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return (domainErrorCodes as readonly string[]).includes(code)
    ? domainErrorMessages[code as DomainErrorCode]
    : null;
}
