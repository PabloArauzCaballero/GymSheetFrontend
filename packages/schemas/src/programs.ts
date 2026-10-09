import { z } from 'zod';
import { programLanes, programModes } from '@gymsheet/types';

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

export const programSchema = z.object({
  id: z.string(),
  carril: z.enum(programLanes),
  modo: z.enum([...programModes, 'CARDIO']),
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

export const activeProgramsSchema = z.object({
  fuerza: programSchema.nullable(),
  cardio: programSchema.nullable(),
});

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

export const closeProgramResultSchema = z.object({
  cerrado: programSchema,
  siguiente: programSchema.nullable(),
});

/** `details.activeProgram` del `409 PROGRAM_ACTIVE_CONFLICT`. */
export const activeProgramSummarySchema = z.object({
  id: z.string(),
  rutinaNombre: z.string().nullable(),
  semanaActual: z.number().int().nullable(),
  semanasTotales: z.number().int(),
});

export const routineChangeProposalSchema = z.object({
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

export const programSessionExtrasSchema = z.object({
  programId: z.string(),
  modo: z.enum(programModes),
  semana: z.number().int().nullable(),
  esDescarga: z.boolean(),
  sesionCuenta: z.boolean(),
  motivoNoCuenta: z.string().nullable(),
  sesionesHechasSemana: z.number().int(),
  sesionesPlanSemana: z.number().int(),
  bonusModo: z
    .object({
      multiplicador: z.number(),
      proximoMultiplicador: z.number(),
      puntosPrevistos: z.number(),
    })
    .nullable(),
  sugerencias: z.array(
    z.object({
      ejercicioId: z.string(),
      ejercicioNombre: z.string().nullable(),
      accion: z.string(),
      pesoSugeridoKg: z.number().optional(),
      marcaActualKg: z.number().optional(),
      mensaje: z.string(),
    }),
  ),
  cambiosRespectoRutina: z.boolean(),
  propuesta: routineChangeProposalSchema,
});
