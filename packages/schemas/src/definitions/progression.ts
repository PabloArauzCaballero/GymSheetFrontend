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
  /** Insignias de modo de programa: rachas de semanas cumplidas, x2,0 y metas de marca. */
  'MODO',
  /** Contrato 11a (noche 13/10): cardio, vida social y rutinas creadas. */
  'CARDIO',
  'SOCIAL',
  'CREADOR',
  /** Contrato 13: logros de coach y de alumno guiado. */
  'COACH',
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
  /**
   * Contrato 11a. Opcionales: un servidor anterior no los manda y la carta se
   * resuelve entonces por `icon` y `category`.
   */
  illustration: z.string().nullish(),
  rarityRank: z.number().int().nullish(),
  secret: z.boolean().nullish(),
  criterion: z.string().nullish(),
  threshold: z.number().nullish(),
  /**
   * Contrato 12 (premios). La cadena agrupa las insignias del mismo criterio
   * («Racha 7 → 30 → 90») para enseñarlas como una sola ficha «Nivel 2 de 4».
   * Opcionales: sin ellas cada insignia es su propia cadena de un paso.
   */
  chain: z.string().nullish(),
  chainStep: z.number().int().nullish(),
  chainLength: z.number().int().nullish(),
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

/* ─── Contrato 12: retos de la semana, premios y racha con comodines ───────── */

export const challengeKinds = [
  'SESSIONS',
  'VOLUME_KG',
  'SETS',
  'NEW_EXERCISE',
  'PERSONAL_RECORD',
  'EARLY_SESSION',
  'CARDIO_MINUTES',
  'MUSCLE_GROUPS',
  'GEO_SESSIONS',
  'WEEKEND_SESSION',
] as const;
export type ChallengeKind = (typeof challengeKinds)[number];

export const challengeDifficulties = ['FACIL', 'MEDIO', 'DIFICIL'] as const;
export type ChallengeDifficulty = (typeof challengeDifficulties)[number];

/**
 * Un reto de la semana. `kind` va como texto libre validado contra la lista:
 * un tipo nuevo del servidor no debe tumbar la senda entera de un cliente viejo.
 */
export const challengeSchema = z.object({
  code: z.string(),
  kind: z.string(),
  difficulty: z.enum(challengeDifficulties),
  title: z.string(),
  description: z.string(),
  /** Nombre de Ionicons. */
  icon: z.string(),
  target: z.number(),
  /** Acotado a `target`. */
  current: z.number(),
  /** De 0 a 1. */
  progress: z.number(),
  progressLabel: z.string(),
  pointsReward: z.number().int(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  /** Cumplido y aún sin celebrar; `acknowledge` lo limpia. */
  isNew: z.boolean().default(false),
});

export const weeklyChallengesSchema = z.object({
  /** Lunes local, `YYYY-MM-DD`. */
  weekStart: z.string(),
  /** ISO del próximo lunes a las 00:00 en la zona del negocio. */
  endsAt: z.string(),
  /** Siempre tres, en orden FACIL, MEDIO, DIFICIL. */
  items: z.array(challengeSchema),
  completedCount: z.number().int(),
  /** Los tres cumplidos: «Semana redonda». */
  perfect: z.boolean(),
  perfectBonus: z.number().int(),
  perfectIsNew: z.boolean().default(false),
});

export const prizeStatuses = ['DISPONIBLE', 'CANJEADO', 'CADUCADO'] as const;
export type PrizeStatus = (typeof prizeStatuses)[number];

export const prizeSourceKinds = ['BADGE', 'LEVEL', 'PERFECT_WEEK'] as const;
export type PrizeSourceKind = (typeof prizeSourceKinds)[number];

/** Un cupón del socio: algo real que da el gimnasio, con código para recepción. */
export const prizeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  /** Ionicons; por defecto `gift-outline`. */
  icon: z.string().default('gift-outline'),
  source: z.object({
    kind: z.enum(prizeSourceKinds),
    code: z.string(),
    name: z.string(),
  }),
  /** Seis caracteres sin 0/O/1/I. */
  code: z.string(),
  status: z.enum(prizeStatuses),
  awardedAt: z.string(),
  expiresAt: z.string().nullable(),
  redeemedAt: z.string().nullable(),
  isNew: z.boolean().default(false),
});

export const prizeListSchema = z.array(prizeSchema);

/** La racha diaria con los comodines ya aplicados. */
export const progressionStreakSchema = z.object({
  current: z.number().int(),
  longest: z.number().int(),
  /** Comodines guardados ahora (0..2). */
  freezes: z.number().int(),
  /** Comodines gastados en la racha vigente. */
  freezesUsed: z.number().int(),
  /** Siguiente de [3, 7, 14, 30, 60, 100, 200, 365]; nulo pasado el último. */
  nextMilestone: z.number().int().nullable(),
  weekly: z.number().int(),
});

/** La racha tras cerrar una sesión: lo que cambió en ella. */
export const sessionStreakSchema = z.object({
  current: z.number().int(),
  freezes: z.number().int(),
  freezeEarnedNow: z.boolean(),
  milestoneNow: z.number().int().nullable(),
});

export type Challenge = z.infer<typeof challengeSchema>;
export type WeeklyChallenges = z.infer<typeof weeklyChallengesSchema>;
export type Prize = z.infer<typeof prizeSchema>;
export type ProgressionStreak = z.infer<typeof progressionStreakSchema>;
export type SessionStreak = z.infer<typeof sessionStreakSchema>;

export const progressionStreakStrikesSchema = z.object({
  totalMonthly: z.number().int(),
  available: z.number().int(),
  usedThisMonth: z.number().int(),
  purchasedThisMonth: z.number().int(),
  strikeCostPoints: z.number().int(),
  month: z.string(),
});
export type ProgressionStreakStrikes = z.infer<typeof progressionStreakStrikesSchema>;

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
  /**
   * Contrato 12. Opcionales o con valor por defecto: un servidor anterior no
   * los manda y la senda se pinta igual, sin esas secciones.
   */
  streak: progressionStreakSchema.optional(),
  challenges: weeklyChallengesSchema.optional(),
  /** Del más reciente al más antiguo. Vacío si el gimnasio no tiene premios. */
  prizes: z.array(prizeSchema).default([]),
  /** Hasta tres sin conseguir, sin secretas, por progreso descendente. */
  nearest: z.array(progressionBadgeSchema).default([]),
  /** Contrato 13: strikes mensuales y saldo de reposición para proteger la racha. */
  strikes: progressionStreakStrikesSchema.optional(),
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

/**
 * Un ejercicio dentro de la lista de un músculo, con la lámina ya resuelta.
 *
 * `rol` dice cómo trabaja ese músculo en el ejercicio: protagonista (`PRIMARY`),
 * apoyo (`SECONDARY`) o estabilizador (`STABILIZER`). La lista llega ordenada
 * con los protagonistas primero.
 */
export const muscleExerciseSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  rol: z.enum(['PRIMARY', 'SECONDARY', 'STABILIZER']),
  recomendado: z.number().nullable(),
  diversion: z.number().nullable(),
  imagen: z.object({ url: z.string(), textoAlternativo: z.string().nullable() }).nullable(),
});

/**
 * Página de ejercicios de un músculo. `total` es el de todo el músculo (o del
 * músculo relacionado, si hay `aproximado`), no el de esta página: sirve para
 * saber si queda más por pedir con `offset`.
 */
export const muscleExercisesPageSchema = z.object({
  musculo: z.object({ code: z.string(), nombre: z.string() }),
  /**
   * Presente cuando el músculo no tiene ejercicios propios y la lista es la de
   * un músculo relacionado (los fascículos del deltoides enseñan los del
   * deltoides). La pantalla debe decirlo: no son ejercicios «de» este músculo.
   */
  aproximado: z.object({ code: z.string(), nombre: z.string() }).nullable().optional(),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  ejercicios: z.array(muscleExerciseSchema),
});

/**
 * Los músculos que trabaja un ejercicio, separados por cómo lo trabajan. Cada
 * uno lleva su código de la taxonomía, que es lo que abre su pantalla.
 */
const exerciseMuscleRefSchema = z.object({
  code: z.string(),
  nombre: z.string(),
  nombreLatin: z.string(),
});

export const exerciseMusclesSchema = z.object({
  ejercicioId: z.string(),
  primarios: z.array(exerciseMuscleRefSchema),
  secundarios: z.array(exerciseMuscleRefSchema),
  estabilizadores: z.array(exerciseMuscleRefSchema),
});

export type ExerciseMuscles = z.infer<typeof exerciseMusclesSchema>;
export type MuscleExercise = z.infer<typeof muscleExerciseSchema>;
export type MuscleExercisesPage = z.infer<typeof muscleExercisesPageSchema>;

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
  /** Bonos de programa con modo (multiplicador semanal y metas). Nunca bajan. Ausente en servidores antiguos. */
  modes: z.number().int().default(0),
  /** Retos cumplidos y bonos de semana redonda. Ausente en servidores antiguos. */
  challenges: z.number().int().default(0),
  /** Progresos en el plan y récords personales (PR). Ausente en servidores antiguos. */
  progress: z.number().int().default(0),
  /** Penalizaciones por faltas sin reponer. Ausente en servidores antiguos. */
  penalties: z.number().int().default(0),
  /** Puntos intercambiados por strikes mensuales. Ausente en servidores antiguos. */
  strikePurchases: z.number().int().default(0),
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
  /** Contrato 12: todo opcional para tolerar un servidor anterior. */
  challenges: weeklyChallengesSchema.optional(),
  challengesCompletedNow: z.array(challengeSchema).default([]),
  perfectWeekNow: z.boolean().default(false),
  prizesNow: z.array(prizeSchema).default([]),
  streak: sessionStreakSchema.optional(),
  nearest: z.array(progressionBadgeSchema).default([]),
});

/** Las reglas de puntos publicadas por el servidor; los clientes no las copian. */
export const pointRulesSchema = z.object({
  perSession: z.number().int(),
  perSet: z.number().int(),
  perVolumeUnitKg: z.number().int(),
  perLongestStreakDay: z.number().int(),
  /** Contrato 12. Opcionales: un servidor anterior no los publica. */
  challengePoints: z
    .object({ FACIL: z.number().int(), MEDIO: z.number().int(), DIFICIL: z.number().int() })
    .optional(),
  perfectWeekBonus: z.number().int().optional(),
  freezeEveryDays: z.number().int().optional(),
  maxFreezes: z.number().int().optional(),
  /** Contrato 13: progresos, penalizaciones y strikes mensuales. */
  perPersonalRecord: z.number().int().optional(),
  penaltyMissedSession: z.number().int().optional(),
  strikeCost: z.number().int().optional(),
  monthlyStrikes: z.number().int().optional(),
});
export type PointsBreakdown = z.infer<typeof pointsBreakdownSchema>;
export type SessionReward = z.infer<typeof sessionRewardSchema>;
export type PointRules = z.infer<typeof pointRulesSchema>;
