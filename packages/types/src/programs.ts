import type { CardioSessionExtras } from './cardio';

/** Modos de un programa de pesas (RF-14..16). `CARDIO` es el modo del carril de cardio. */
export const programModes = ['NONE', 'PROGRESSIVE_OVERLOAD', 'STRENGTH_GOALS'] as const;
export type ProgramMode = (typeof programModes)[number];

export const programLanes = ['STRENGTH', 'CARDIO'] as const;
export type ProgramLane = (typeof programLanes)[number];

export type LiftTargetView = {
  ejercicioId: string;
  ejercicioNombre: string | null;
  pesoTrabajoKg: number;
  pesoSugeridoKg: number;
  repsMin: number;
  repsMax: number;
  rirObjetivo: number | null;
  incrementoKg: number;
  marcaInicialKg: number | null;
  marcaActualKg: number | null;
  marcaMetaKg: number | null;
  fechaMeta: string | null;
  alcanzadaEn: string | null;
};

/** Un programa activo o cerrado, tal como lo devuelve `GET /programs/active`. */
export type Program = {
  id: string;
  carril: ProgramLane;
  modo: ProgramMode | 'CARDIO';
  estado: string;
  motivoCierre: string | null;
  rutinaId: string | null;
  rutinaNombre: string | null;
  cardioPlanId: string | null;
  fechaInicio: string;
  fechaFinPrevista: string;
  semanaActual: number | null;
  semanasTotales: number;
  multiplicador: number;
  proximoMultiplicador: number;
  sesionesHechasSemana: number;
  sesionesPlanSemana: number;
  esDescarga: boolean;
  metas: LiftTargetView[];
};

export type ActivePrograms = { fuerza: Program | null; cardio: Program | null };

export type ProgramWeekProgress = {
  numero: number;
  inicio: string;
  esDescarga: boolean;
  sesionesPlan: number;
  sesionesHechas: number;
  minutosCardio: number;
  /** Nulo mientras la semana no se cierra. */
  cumplida: boolean | null;
  multiplicador: number | null;
};

export type ProgramProgress = { programa: Program; semanas: ProgramWeekProgress[] };

export type NextLoad = {
  ejercicioId: string;
  ejercicioNombre: string | null;
  pesoSugeridoKg: number;
  repsMin: number;
  repsMax: number;
  rirObjetivo: number | null;
  mensaje: string | null;
};

export type NextLoads = {
  programaId: string;
  semana: number | null;
  esDescarga: boolean;
  items: NextLoad[];
};

/** Un levantamiento con peso de trabajo, reps y, en metas, la marca a lograr. */
export type LiftTargetInput = {
  ejercicioId: string;
  pesoTrabajoKg?: number;
  repsMin?: number;
  repsMax?: number;
  rirObjetivo?: number | null;
  marcaMetaKg?: number;
  fechaMeta?: string;
  marcaActual?: { pesoKg: number; reps: number };
};

/** Cuerpo de `POST /programs/strength/activate`. */
export type ActivateStrengthInput = {
  routineId: string;
  fechaInicio?: string;
  duracionSemanas?: number;
  modo: ProgramMode;
  liftTargets?: LiftTargetInput[];
  diasSemana?: number[];
  replace?: boolean;
};

export type CloseAction = 'REPEAT' | 'CHOOSE_OTHER' | 'STOP';

export type CloseProgramResult = { cerrado: Program; siguiente: Program | null };

/** Resumen del programa en curso que acompaña a `409 PROGRAM_ACTIVE_CONFLICT` (`details.activeProgram`). */
export type ActiveProgramSummary = {
  id: string;
  rutinaNombre: string | null;
  semanaActual: number | null;
  semanasTotales: number;
};

/** Lo que cambiaría en la rutina según lo que se hizo en la sesión (RF-20); se reenvía tal cual al aceptar. */
export type RoutineChangeProposal = {
  cambios: Array<{ routineExerciseId: string; pesoObjetivoKg?: number; seriesObjetivo?: number }>;
  agregar: Array<{ ejercicioId: string; seriesObjetivo: number; pesoObjetivoKg?: number }>;
  quitar: string[];
};

export type ApplyToRoutineInput = {
  cambios?: Array<{
    routineExerciseId: string;
    pesoObjetivoKg?: number | null;
    seriesObjetivo?: number;
    repsMin?: number | null;
    repsMax?: number | null;
  }>;
  agregar?: Array<{
    ejercicioId: string;
    seriesObjetivo?: number;
    repsMin?: number | null;
    repsMax?: number | null;
    pesoObjetivoKg?: number | null;
  }>;
  quitar?: string[];
};

export type ProgramSuggestion = {
  ejercicioId: string;
  ejercicioNombre: string | null;
  accion: 'RAISE' | 'HOLD' | 'LOWER' | 'DELOAD_SKIP' | 'NO_DATA' | 'ADD_LOAD' | 'GOAL_REACHED' | 'E1RM_UP';
  pesoSugeridoKg?: number;
  marcaActualKg?: number;
  mensaje: string;
};

/** El bloque `programa` de `POST /workouts/:id/finish` cuando la sesión nació de un programa de pesas. */
export type ProgramSessionExtras = {
  programId: string;
  modo: ProgramMode;
  semana: number | null;
  esDescarga: boolean;
  sesionCuenta: boolean;
  motivoNoCuenta: string | null;
  sesionesHechasSemana: number;
  sesionesPlanSemana: number;
  bonusModo: { multiplicador: number; proximoMultiplicador: number; puntosPrevistos: number } | null;
  sugerencias: ProgramSuggestion[];
  cambiosRespectoRutina: boolean;
  propuesta: RoutineChangeProposal;
};

export type SessionModeExtras = {
  programa?: ProgramSessionExtras;
  cardio?: CardioSessionExtras;
};
