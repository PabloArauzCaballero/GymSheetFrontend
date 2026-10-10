import { z } from 'zod';
import { cardioModalities } from '@gymsheet/types';

export const cardioPlanSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  modalidad: z.enum(cardioModalities),
  diasSemana: z.array(z.number().int()),
  minutosObjetivo: z.number().int(),
  intensidad: z.object({
    tipo: z.enum(['ZONA_FC', 'RPE']),
    zona: z.number().int().nullable(),
    rpe: z.number().int().nullable(),
  }),
  intervalos: z
    .object({
      trabajoSeg: z.number().int(),
      descansoSeg: z.number().int(),
      rondas: z.number().int(),
    })
    .nullable(),
  fcReposo: z.number().int().nullable(),
  fcMax: z.number().int().nullable(),
  progresionPctSemana: z.number().int(),
});

export const cardioAdviceSchema = z.object({
  order: z.enum(['ANY', 'WEIGHTS_FIRST']),
  suggestModality: z.string().nullable(),
  reason: z.string().nullable(),
});

export const cardioSessionExtrasSchema = z.object({
  programId: z.string(),
  semana: z.number().int().nullable(),
  sesionCuenta: z.boolean(),
  minutosCuentan: z.number(),
  minutosSemana: z.number(),
  objetivoMinutosSemana: z.number(),
  objetivoMinutosSesion: z.number(),
  cumpleObjetivoSesion: z.boolean(),
  consejo: cardioAdviceSchema,
});
