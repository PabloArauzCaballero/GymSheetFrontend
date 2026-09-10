import { z } from 'zod';

/**
 * Directorio público de gimnasios (punto 14, Carril B): contratos de las
 * rutas sin sesión que proyectan `facilities`. Deliberadamente separado de
 * `social.ts`/`progression.ts` — este directorio no requiere cuenta y no
 * comparte ciclo de vida con el resto del producto autenticado.
 */

export const publicServiceTypes = ['TRAINING', 'CARDIO', 'FUNCTIONAL', 'CLASSROOM'] as const;
export type PublicServiceType = (typeof publicServiceTypes)[number];

export const publicBranchSummarySchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  latitud: z.number().nullable(),
  longitud: z.number().nullable(),
  servicios: z.array(z.string()),
  imagenUrl: z.string().url().nullable(),
  amenidades: z.array(z.string()),
  marca: z.string().nullable(),
});
export type PublicBranchSummary = z.infer<typeof publicBranchSummarySchema>;

export const publicBranchDetailSchema = publicBranchSummarySchema.extend({
  zonaHoraria: z.string(),
  salas: z.array(z.object({ id: z.string().uuid(), nombre: z.string(), tipo: z.string() })),
  equipamiento: z.array(z.object({ nombre: z.string(), tipo: z.string() })),
  galeria: z.array(z.string().url()),
  /** Todas las sedes de la misma cadena (incluida esta) — al menos un elemento. */
  sucursales: z.array(publicBranchSummarySchema),
});
export type PublicBranchDetail = z.infer<typeof publicBranchDetailSchema>;
