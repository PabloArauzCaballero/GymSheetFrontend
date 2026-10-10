import type { Exercise } from './core';
import type { WorkoutStatus } from './enums';
import type { RoutineGroupType } from './training';

export type WorkoutSet = {
  id: string;
  numeroSerie: number;
  /** `CARDIO` no lleva repeticiones, peso ni RIR (llegan `null`). Sin él se asume fuerza. */
  tipoSerie: 'FUERZA' | 'CARDIO';
  repeticiones: number | null;
  pesoKg: number | null;
  rir: number | null;
  duracionSeg: number | null;
  distanciaM: number | null;
  fcMedia: number | null;
  rpe: number | null;
  descansoSegAnterior: number;
  fechaRegistro: string;
};

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
};

export type Workout = {
  id: string;
  usuarioId: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: WorkoutStatus;
  observacion: string | null;
  ejercicios: WorkoutExercise[];
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

export type WorkoutSetInput = {
  numeroSerie: number;
  repeticiones: number;
  pesoKg: number;
  rir: number;
  descansoSegAnterior: number;
};
