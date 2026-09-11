import { z } from 'zod';

/**
 * Foto o video efímero (24h). Independiente de la galería de fotos permanente.
 *
 * El feed **sólo** muestra a quien tiene conexión aceptada con quien mira, más
 * las propias: una story es para los matches, no para el gimnasio entero.
 */

export const storyMediaTypes = ['image', 'video'] as const;
export type StoryMediaType = (typeof storyMediaTypes)[number];

export const storySchema = z.object({
  id: z.string().uuid(),
  mediaUrl: z.string(),
  mediaType: z.enum(storyMediaTypes),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type Story = z.infer<typeof storySchema>;

export const storyFeedEntrySchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  photoUrl: z.string().nullable(),
  /** `true` si al menos una de sus stories activas todavía no la vi — pinta el anillo de color. */
  hasUnviewed: z.boolean(),
  stories: z.array(
    z.object({
      id: z.string().uuid(),
      mediaUrl: z.string(),
      mediaType: z.enum(storyMediaTypes),
      createdAt: z.string(),
      viewedByMe: z.boolean(),
    }),
  ),
});
export type StoryFeedEntry = z.infer<typeof storyFeedEntrySchema>;

/** Quién vio una story propia. Sólo el autor puede pedirla. */
export const storyViewerSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  photoUrl: z.string().nullable(),
  viewedAt: z.string(),
});
export type StoryViewer = z.infer<typeof storyViewerSchema>;

export const storyViewersResponseSchema = z.object({
  storyId: z.string().uuid(),
  total: z.number().int().min(0),
  viewers: z.array(storyViewerSchema),
});
export type StoryViewersResponse = z.infer<typeof storyViewersResponseSchema>;

export const profileViewsSummarySchema = z.object({
  uniqueViewersToday: z.number().int().min(0),
  /** Espectadores únicos de todos los tiempos. */
  totalUnique: z.number().int().min(0),
  /** Únicos desde la última vez que se abrió la lista. Es lo que enciende el punto. */
  newSinceLastCheck: z.number().int().min(0),
});
export type ProfileViewsSummary = z.infer<typeof profileViewsSummarySchema>;

/**
 * Una persona que vio mi perfil, agregada: una fila por espectador, no una por
 * visita. `viewCount` dice cuántas veces volvió, que es la señal que importa.
 */
export const profileViewerSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  photoUrl: z.string().nullable(),
  objetivo: z.string().nullable(),
  branchName: z.string().nullable(),
  lastViewedAt: z.string(),
  viewCount: z.number().int().min(1),
  /** `true` si la última visita es posterior a la última revisión de la lista. */
  isNew: z.boolean(),
});
export type ProfileViewer = z.infer<typeof profileViewerSchema>;

export const profileViewersPageSchema = z.object({
  viewers: z.array(profileViewerSchema),
  /** Pásalo como `cursor` para la siguiente página; `null` cuando no quedan más. */
  nextCursor: z.string().nullable(),
});
export type ProfileViewersPage = z.infer<typeof profileViewersPageSchema>;
