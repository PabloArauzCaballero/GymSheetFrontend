import { z } from 'zod';
import { workoutFinishSchema } from './workouts';

export const programModes = ['NONE', 'PROGRESSIVE_OVERLOAD', 'STRENGTH_GOALS'] as const;
export type ProgramMode = (typeof programModes)[number];

export const closeActions = ['REPEAT', 'CHOOSE_OTHER', 'STOP'] as const;
export type CloseAction = (typeof closeActions)[number];

/** Un levantamiento del programa: carga sugerida (sobrecarga) o meta de marca (metas). */
export const liftTargetViewSchema = z.object({
  ejercicioId: z.string(),
  ejercicioNombre: z.string().nullable(),
  pesoTrabajoKg: z.number(),
  pesoSugeridoKg: z.number(),
  repsMin: z.number().int(),
  repsMax: z.number().int(),
  rirObjetivo: z.number().int().nullable(),
  incrementoKg: z.number(),
  marcaInicialKg: z.number().nullable(),
  marcaActualKg: z.number().nullable(),
  marcaMetaKg: z.number().nullable(),
  fechaMeta: z.string().nullable(),
  alcanzadaEn: z.string().nullable(),
});
export type LiftTargetView = z.infer<typeof liftTargetViewSchema>;

/** `GET /programs/active`, `POST /programs/strength/activate` y compañía. */
export const programSchema = z.object({
  id: z.string().uuid(),
  carril: z.enum(['STRENGTH', 'CARDIO']),
  modo: z.string(),
  estado: z.string(),
  motivoCierre: z.string().nullable(),
  rutinaId: z.string().nullable(),
  rutinaNombre: z.string().nullable(),
  cardioPlanId: z.string().nullable(),
  fechaInicio: z.string(),
  fechaFinPrevista: z.string(),
  semanaActual: z.number().int().nullable(),
  semanasTotales: z.number().int(),
  multiplicador: z.number(),
  proximoMultiplicador: z.number(),
  sesionesHechasSemana: z.number().int(),
  sesionesPlanSemana: z.number().int(),
  esDescarga: z.boolean(),
  metas: z.array(liftTargetViewSchema),
});
export type Program = z.infer<typeof programSchema>;

export const activeProgramsSchema = z.object({
  fuerza: programSchema.nullable(),
  cardio: programSchema.nullable(),
});
export type ActivePrograms = z.infer<typeof activeProgramsSchema>;

export const programProgressSchema = z.object({
  programa: programSchema,
  semanas: z.array(
    z.object({
      numero: z.number().int(),
      inicio: z.string(),
      esDescarga: z.boolean(),
      sesionesPlan: z.number().int(),
      sesionesHechas: z.number().int(),
      minutosCardio: z.number(),
      cumplida: z.boolean().nullable(),
      multiplicador: z.number().nullable(),
    }),
  ),
});
export type ProgramProgress = z.infer<typeof programProgressSchema>;

export const nextLoadsSchema = z.object({
  programaId: z.string(),
  semana: z.number().int().nullable(),
  esDescarga: z.boolean(),
  items: z.array(
    z.object({
      ejercicioId: z.string(),
      ejercicioNombre: z.string().nullable(),
      pesoSugeridoKg: z.number(),
      repsMin: z.number().int(),
      repsMax: z.number().int(),
      rirObjetivo: z.number().int().nullable(),
      mensaje: z.string().nullable(),
    }),
  ),
});
export type NextLoads = z.infer<typeof nextLoadsSchema>;

export const closeResultSchema = z.object({
  cerrado: programSchema,
  siguiente: programSchema.nullable(),
});
export type CloseResult = z.infer<typeof closeResultSchema>;

/** Cuerpo de `POST /programs/strength/activate`. */
export type ActivateStrengthInput = {
  routineId: string;
  fechaInicio?: string;
  duracionSemanas?: number;
  modo: ProgramMode;
  liftTargets?: Array<{
    ejercicioId: string;
    pesoTrabajoKg?: number;
    repsMin?: number;
    repsMax?: number;
    rirObjetivo?: number | null;
    marcaMetaKg?: number;
    fechaMeta?: string;
    marcaActual?: { pesoKg: number; reps: number };
  }>;
  diasSemana?: number[];
  replace?: boolean;
};

/** Propuesta de RF-20: lo que cambió respecto de la rutina; se reenvía tal cual a `apply-to-routine`. */
export const routineProposalSchema = z.object({
  cambios: z.array(
    z.object({
      routineExerciseId: z.string(),
      pesoObjetivoKg: z.number().optional(),
      seriesObjetivo: z.number().int().optional(),
    }),
  ),
  agregar: z.array(
    z.object({
      ejercicioId: z.string(),
      seriesObjetivo: z.number().int(),
      pesoObjetivoKg: z.number().optional(),
    }),
  ),
  quitar: z.array(z.string()),
});
export type RoutineProposal = z.infer<typeof routineProposalSchema>;

export const programSessionBlockSchema = z.object({
  programId: z.string(),
  modo: z.string(),
  semana: z.number().int().nullable(),
  esDescarga: z.boolean(),
  sesionCuenta: z.boolean(),
  motivoNoCuenta: z.string().nullable(),
  sesionesHechasSemana: z.number().int(),
  sesionesPlanSemana: z.number().int(),
  bonusModo: z
    .object({ multiplicador: z.number(), proximoMultiplicador: z.number(), puntosPrevistos: z.number() })
    .nullable(),
  sugerencias: z.array(
    z.object({
      ejercicioId: z.string(),
      ejercicioNombre: z.string().nullable(),
      accion: z.string(),
      pesoSugeridoKg: z.number().optional(),
      marcaActualKg: z.number().optional(),
      mensaje: z.string().nullable().optional(),
    }),
  ),
  cambiosRespectoRutina: z.boolean(),
  propuesta: routineProposalSchema,
});
export type ProgramSessionBlock = z.infer<typeof programSessionBlockSchema>;

export const cardioSessionBlockSchema = z.object({
  programId: z.string(),
  semana: z.number().int().nullable(),
  sesionCuenta: z.boolean(),
  minutosCuentan: z.number(),
  minutosSemana: z.number(),
  objetivoMinutosSemana: z.number(),
  objetivoMinutosSesion: z.number(),
  cumpleObjetivoSesion: z.boolean(),
  consejo: z
    .object({
      order: z.string(),
      suggestModality: z.string().nullable(),
      reason: z.string().nullable(),
    })
    .optional(),
});
export type CardioSessionBlock = z.infer<typeof cardioSessionBlockSchema>;

/** Respuesta de cerrar una sesión con los bloques de programa y de cardio (cuando existen). */
export const workoutFinishWithProgramsSchema = workoutFinishSchema.extend({
  programa: programSessionBlockSchema.nullable().optional().transform((v) => v ?? null),
  cardio: cardioSessionBlockSchema.nullable().optional().transform((v) => v ?? null),
});
export type WorkoutFinishWithPrograms = z.infer<typeof workoutFinishWithProgramsSchema>;
