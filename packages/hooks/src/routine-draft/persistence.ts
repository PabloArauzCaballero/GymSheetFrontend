import { z } from 'zod';
import { createEmptyDraft, type RoutineDraft } from './model';

/**
 * Persistencia del borrador. Cada app aporta el almacén (archivo en el móvil,
 * `sessionStorage` en la web) y este módulo se encarga de (de)serializar y de
 * descartar lo que ya no encaje, para que un borrador viejo o corrupto nunca
 * rompa el asistente.
 */
const DRAFT_VERSION = 1;

const exerciseSchema = z.object({
  ejercicioId: z.string().min(1),
  nombre: z.string(),
  grupoMuscular: z.string(),
  seriesObjetivo: z.number().int().min(1).max(100),
  repsMin: z.number().int().nullable(),
  repsMax: z.number().int().nullable(),
  pesoObjetivoKg: z.number().nullable(),
  rirObjetivo: z.number().int().nullable(),
  descansoSeg: z.number().int().nullable(),
  nota: z.string().nullable(),
});

const weekday = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

const draftSchema = z.object({
  routineId: z.string().nullable(),
  nombre: z.string(),
  descripcion: z.string(),
  objetivo: z
    .enum([
      'HIPERTROFIA',
      'FUERZA',
      'RESISTENCIA',
      'PERDIDA_GRASA',
      'SALUD_GENERAL',
      'REHABILITACION',
    ])
    .nullable(),
  visibilidad: z.literal('PRIVATE'),
  duracion: z.object({
    unidad: z.enum(['semanas', 'meses']),
    cantidad: z.number().int().min(1),
  }),
  progresion: z.object({
    activa: z.boolean(),
    descargaCada: z.union([z.literal(4), z.literal(5), z.literal(6)]).nullable(),
  }),
  dias: z.array(
    z.object({
      diaSemana: weekday,
      nombre: z.string(),
      ejercicios: z.array(exerciseSchema),
    }),
  ),
  semanas: z.record(z.string(), z.enum(['DESCARGA', 'NORMAL'])),
});

const envelopeSchema = z.object({
  v: z.literal(DRAFT_VERSION),
  paso: z.number().int().min(0),
  draft: draftSchema,
});

export type PersistedDraft = { draft: RoutineDraft; paso: number };

export function serializeDraft(draft: RoutineDraft, paso: number): string {
  return JSON.stringify({ v: DRAFT_VERSION, paso, draft });
}

/** `null` si no hay nada guardado, está corrupto o es de otra versión. */
export function parseDraft(raw: string | null | undefined): PersistedDraft | null {
  if (!raw) return null;
  try {
    const parsed = envelopeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { draft: parsed.data.draft, paso: parsed.data.paso } : null;
  } catch {
    return null;
  }
}

/** ¿Merece la pena ofrecer retomar este borrador? Uno en blanco no. */
export function hasContent(draft: RoutineDraft): boolean {
  const empty = createEmptyDraft();
  return (
    draft.nombre.trim() !== '' ||
    draft.descripcion.trim() !== '' ||
    draft.objetivo !== empty.objetivo ||
    draft.dias.length > 0
  );
}
