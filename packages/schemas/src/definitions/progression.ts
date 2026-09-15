import { z } from 'zod';

/**
 * Contratos de la senda: el camino hacia tu imagen ideal.
 *
 * Los define el backend y los valida cada cliente, así que un cambio de
 * contrato aparece como error en la web y en el móvil a la vez, en vez de como
 * una pantalla en blanco en solo uno de los dos.
 *
 * Todo lo visible —nombres de rango, textos, iconos, colores— llega del
 * servidor. Aquí no se codifica ni un solo nombre de nivel: el catálogo lo
 * administra el gimnasio y una copia local quedaría desincronizada en cuanto
 * alguien renombrara un rango.
 */

export const progressionAudiences = ['ANY', 'MALE', 'FEMALE'] as const;
export type ProgressionAudience = (typeof progressionAudiences)[number];

export const badgeRarities = ['COMUN', 'RARA', 'EPICA', 'LEGENDARIA'] as const;
export type BadgeRarity = (typeof badgeRarities)[number];

export const badgeCategories = [
  'CONSTANCIA',
  'VOLUMEN',
  'FUERZA',
  'VARIEDAD',
  'HITO',
  'SECRETA',
] as const;
export type BadgeCategory = (typeof badgeCategories)[number];

/** Un hito del camino. */
export const progressionLevelSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** Frase en segunda persona: nombra quién eres al llegar, no qué hiciste. */
  tagline: z.string(),
  description: z.string().nullable(),
  minPoints: z.number().int(),
  sortOrder: z.number().int(),
  /** Nombre de icono de Ionicons; ambos clientes usan ese mismo juego. */
  icon: z.string(),
  color: z.string(),
  unlocked: z.boolean(),
  current: z.boolean(),
});

export const progressionBadgeSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  /** Línea de sabor; la que se lee al conseguirla. */
  flavorText: z.string().nullable(),
  category: z.enum(badgeCategories),
  rarity: z.enum(badgeRarities),
  icon: z.string(),
  color: z.string(),
  pointsReward: z.number().int(),
  earned: z.boolean(),
  earnedAt: z.string().nullable(),
  /** Conseguida y todavía sin celebrar. */
  isNew: z.boolean(),
  /** De 0 a 1. Nulo en las secretas que aún no se han conseguido. */
  progress: z.number().nullable(),
  progressLabel: z.string().nullable(),
});

export const progressionStatsSchema = z.object({
  totalSessions: z.number().int(),
  totalSets: z.number().int(),
  totalReps: z.number().int(),
  totalVolumeKg: z.number(),
  currentStreakDays: z.number().int(),
  longestStreakDays: z.number().int(),
  weeklyStreak: z.number().int(),
  distinctExercises: z.number().int(),
  distinctMuscleGroups: z.number().int(),
  personalRecords: z.number().int(),
  lastSessionOn: z.string().nullable(),
});

export const progressionSchema = z.object({
  points: z.number().int(),
  audience: z.enum(progressionAudiences),
  /** Nulo solo antes del primer entrenamiento en un catálogo vacío. */
  level: progressionLevelSchema.nullable(),
  nextLevel: progressionLevelSchema.nullable(),
  pointsToNextLevel: z.number().int().nullable(),
  /** Avance dentro del tramo actual, de 0 a 1. */
  levelProgress: z.number(),
  path: z.array(progressionLevelSchema),
  badges: z.array(progressionBadgeSchema),
  stats: progressionStatsSchema,
  unlockedNow: z.array(progressionBadgeSchema),
});

export const leaderboardEntrySchema = z.object({
  position: z.number().int(),
  points: z.number().int(),
  levelCode: z.string().nullable(),
  streakDays: z.number().int(),
  /** Nombre de pila e inicial: la tabla no es una lista de socios. */
  displayName: z.string(),
  isMe: z.boolean(),
});

export const leaderboardSchema = z.array(leaderboardEntrySchema);

export const leaderboardSortOptions = ['points', 'streak'] as const;
export type LeaderboardSortBy = (typeof leaderboardSortOptions)[number];

export const progressionAcknowledgedSchema = z.object({
  acknowledged: z.literal(true),
});

/** ISO 8601: 1 = lunes ... 7 = domingo. Igual criterio que usa el backend. */
export const restDaysSchema = z.object({
  weekdays: z.array(z.number().int().min(1).max(7)),
});
export type RestDays = z.infer<typeof restDaysSchema>;

/**
 * Equipamiento que corresponde a un músculo, deducido del catálogo real.
 *
 * `primary` es nulo cuando el músculo no tiene ejercicios catalogados: el
 * servidor no inventa una máquina, y la pantalla deja elegir a mano.
 */
export const equipmentSuggestionSchema = z.object({
  label: z.string(),
  name: z.string(),
  type: z.string(),
  exerciseCount: z.number().int(),
  share: z.number(),
});

export const muscleEquipmentInferenceSchema = z.object({
  muscleCode: z.string(),
  muscleName: z.string(),
  muscleGroupCode: z.string(),
  muscleGroupName: z.string(),
  primary: equipmentSuggestionSchema.nullable(),
  alternatives: z.array(equipmentSuggestionSchema),
  suggestedName: z.string().nullable(),
});

/**
 * Catálogo de músculos, para el selector del ejercicio propio.
 *
 * Vive junto a la deducción de equipamiento porque solo se usan juntos: se
 * elige un músculo de esta lista y el servidor responde con qué se entrena.
 */
export const muscleCatalogEntrySchema = z.object({
  code: z.string(),
  nombre: z.string(),
  nombreLatin: z.string(),
  descripcion: z.string().nullable(),
  grupo: z.object({ code: z.string(), nombre: z.string() }),
});

export const muscleCatalogSchema = z.array(muscleCatalogEntrySchema);

export type MuscleCatalogEntry = z.infer<typeof muscleCatalogEntrySchema>;
export type ProgressionLevel = z.infer<typeof progressionLevelSchema>;
export type ProgressionBadge = z.infer<typeof progressionBadgeSchema>;
export type ProgressionStats = z.infer<typeof progressionStatsSchema>;
export type Progression = z.infer<typeof progressionSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type EquipmentSuggestion = z.infer<typeof equipmentSuggestionSchema>;
export type MuscleEquipmentInference = z.infer<typeof muscleEquipmentInferenceSchema>;

/**
 * Lo que una sesión recién terminada movió en la senda.
 *
 * Llega dentro de la respuesta de `PATCH /workouts/:id/finish` para que el
 * cliente enseñe causa y efecto en el momento —cuántos puntos y por qué— y abra
 * la carta de cada insignia ganada sin adivinar qué cambió.
 */
export const pointsBreakdownSchema = z.object({
  session: z.number().int(),
  sets: z.number().int(),
  volume: z.number().int(),
  streak: z.number().int(),
  badges: z.number().int(),
});

export const sessionRewardSchema = z.object({
  pointsBefore: z.number().int(),
  pointsAfter: z.number().int(),
  pointsEarned: z.number().int(),
  breakdown: pointsBreakdownSchema,
  levelBefore: progressionLevelSchema.nullable(),
  levelAfter: progressionLevelSchema.nullable(),
  leveledUp: z.boolean(),
  nextLevel: progressionLevelSchema.nullable(),
  pointsToNextLevel: z.number().int().nullable(),
  levelProgressBefore: z.number(),
  levelProgress: z.number(),
  unlockedNow: z.array(progressionBadgeSchema),
});

/** Las reglas de puntos publicadas por el servidor; los clientes no las copian. */
export const pointRulesSchema = z.object({
  perSession: z.number().int(),
  perSet: z.number().int(),
  perVolumeUnitKg: z.number().int(),
  perLongestStreakDay: z.number().int(),
});
export type PointsBreakdown = z.infer<typeof pointsBreakdownSchema>;
export type SessionReward = z.infer<typeof sessionRewardSchema>;
export type PointRules = z.infer<typeof pointRulesSchema>;
