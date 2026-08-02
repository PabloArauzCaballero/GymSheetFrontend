import type { Exercise } from './core';
import type {
  RoutineAssignmentStatus,
  RoutineStatus,
  RoutineVisibility,
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

export type Routine = {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoPorUsuarioId: string;
  visibilidad: RoutineVisibility;
  objetivo: TrainingGoal | null;
  estado: RoutineStatus;
  ejercicios: RoutineExercise[];
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
