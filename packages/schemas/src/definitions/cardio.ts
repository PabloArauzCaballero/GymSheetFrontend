import { z } from 'zod';

export const cardioModalities = [
  'CORRER', 'CAMINAR', 'BICI', 'REMO', 'ELIPTICA', 'ESCALADORA', 'NADAR', 'HIIT', 'OTRO',
] as const;
export type CardioModality = (typeof cardioModalities)[number];

export const cardioModalityLabels: Record<CardioModality, string> = {
  CORRER: 'Correr', CAMINAR: 'Caminar', BICI: 'Bici', REMO: 'Remo', ELIPTICA: 'Elíptica',
  ESCALADORA: 'Escaladora', NADAR: 'Nadar', HIIT: 'HIIT', OTRO: 'Otro',
};

export const cardioPlanSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  modalidad: z.enum(cardioModalities),
  diasSemana: z.array(z.number().int()),
  minutosObjetivo: z.number().int(),
  intensidad: z.object({
    tipo: z.enum(['ZONA_FC', 'RPE']),
    zona: z.number().int().nullable().optional(),
    rpe: z.number().int().nullable().optional(),
  }),
  intervalos: z
    .object({ trabajoSeg: z.number().int(), descansoSeg: z.number().int(), rondas: z.number().int() })
    .nullable()
    .optional(),
  fcReposo: z.number().int().nullable().optional(),
  fcMax: z.number().int().nullable().optional(),
  progresionPctSemana: z.number().int(),
});
export type CardioPlan = z.infer<typeof cardioPlanSchema>;

/** Cuerpo de `POST /cardio-plans` y del `cardioPlan` en línea de la activación. */
export type CardioPlanInput = {
  nombre: string;
  modalidad: CardioModality;
  diasSemana: number[];
  minutosObjetivo: number;
  intensidad: { tipo: 'ZONA_FC'; zona: number } | { tipo: 'RPE'; rpe: number };
  intervalos?: { trabajoSeg: number; descansoSeg: number; rondas: number } | null;
  fcReposo?: number | null;
  fcMax?: number | null;
  progresionPctSemana: number;
};
