import { z } from 'zod';
import { chatMessageSchema, readReceiptSettingsSchema, routineRecommendationSchema, socialDiscoverySettingsSchema, discoveryPreferencesSchema, socialMapAreasSchema, socialMapPeopleSchema, socialMapGymsSchema, socialMapCitiesSchema, socialMapNearbySchema, musicPlaylistSchema, musicPlaylistPageSchema } from '@gymsheet/schemas';
import type { RoutineVisibility } from '@gymsheet/types';
import type { MusicVisibility, SocialMapBounds, SocialMapCoordinates } from '@gymsheet/schemas';
import {
  activationRequestSchema,
  bodyMeasurementSchema,
  connectionSchema,
  conversationSummarySchema,
  discoveryPassEntrySchema,
  interactionCountsSchema,
  likeReceivedSchema,
  likeSentSchema,
  exerciseSchema,
  userSchema,
  gymDirectoryEntrySchema,
  leaderboardSchema,
  memberProfileSchema,
  messageSchema,
  onboardingSchema,
  profilePhotoSchema,
  exerciseMusclesSchema,
  exerciseSearchPageSchema,
  exerciseShortcutsSchema,
  exerciseTaxonomySchema,
  muscleCatalogEntrySchema,
  muscleEquipmentInferenceSchema,
  muscleExercisesPageSchema,
  pointRulesSchema,
  progressionAcknowledgedSchema,
  progressionSchema,
  prizeListSchema,
  publicBranchSummarySchema,
  restDaysSchema,
  membershipProjectionSchema,
  pageSchema,
  profileSchema,
  profileViewersPageSchema,
  profileViewsSummarySchema,
  routineAssignmentSchema,
  routineSchema,
  socialStatusSchema,
  socketTicketSchema,
  startConversationResponseSchema,
  storyFeedEntrySchema,
  storySchema,
  storyViewersResponseSchema,
  swipeResultSchema,
  undoSwipeResultSchema,
  workoutFinishSchema,
  workoutSchema,
  restSettingsResultSchema,
  skippedSetSchema,
  workoutRoutineLinkSchema,
  commentAttachmentSchema,
} from '@gymsheet/schemas';
import type {
  AddWorkoutExerciseInput,
  CardioSetInput,
  FitnessGoal,
  RestSettingChange,
  SkipReason,
  TimedWorkoutSetInput,
  TrainingGoal,
  WorkoutSetInput,
  WorkoutSetUpdateInput,
} from '@gymsheet/types';
import type {
  ConnectionStatus,
  LeaderboardSortBy,
  RestDays,
  SocialStatusState,
  SwipeDirection,
} from '@gymsheet/schemas';
import type { CommentAttachment, UserGender } from '@gymsheet/types';
import {
  createCardioServices,
  createCatalogServices,
  createRecommendationServices,
  createCommunityServices,
  createExerciseCommunityServices,
  createProgramServices,
  createRoutineServices,
  createSharingServices,
} from '@gymsheet/api-client';
import { apiClient } from '@/api/client';
import { appendLocalFile, type LocalFile } from '@/api/local-file-part';

/** Endpoints that answer with a free-form object we do not need to model. */
const looseObject = z.record(z.string(), z.unknown());
const deletedSchema = z.object({ deleted: z.literal(true) });

/**
 * Read endpoints the client-facing app needs. Contracts come from
 * `@gymsheet/schemas`, the same source the web app validates against, so a
 * backend change surfaces as a `contract` error on both clients at once.
 *
 * Everything here is a GET: the mobile app currently reports state, it does not
 * mutate it. Writes belong next to the screen that owns them.
 */
export const profileService = {
  /** Anthropometric profile. 404 means the user has not onboarded yet. */
  get: () => apiClient.request('/profile', profileSchema, { method: 'GET' }),
  create: (input: ProfileInput) =>
    apiClient.request('/profile', profileSchema, { method: 'POST', body: input }),
  update: (input: Partial<ProfileInput>) =>
    apiClient.request('/profile', profileSchema, { method: 'PATCH', body: input }),
  /**
   * Histórico de peso. Cada edición del perfil deja su propia fila aquí
   * (`source: 'PROFILE'`), y `recordMeasurement` añade las que registra el
   * usuario a mano (`source: 'USER'`), sin tener que pasar por editar el perfil.
   */
  measurements: () =>
    apiClient.request('/me/body-measurements', z.array(bodyMeasurementSchema), {
      method: 'GET',
    }),
  /**
   * Registro manual de peso. `idempotencyKey` la pone la pantalla para que un
   * doble toque —o un reintento tras perder la red— no cree dos filas del
   * mismo pesaje.
   */
  recordMeasurement: (input: BodyMeasurementRecordInput) =>
    apiClient.request('/me/body-measurements', bodyMeasurementSchema, {
      method: 'POST',
      body: input,
    }),
};

/** Lo que acepta `POST /me/body-measurements`; el backend valida lo mismo con Zod. */
export type BodyMeasurementRecordInput = {
  weight: number;
  unit: 'KG' | 'LB';
  /** Fecha del pesaje en `YYYY-MM-DD`. */
  measuredOn: string;
  idempotencyKey?: string;
};

/**
 * Cuestionario de alta: objetivo, medidas, preferencias de entreno y equipo
 * disponible. Mismos cuatro pasos y mismos contratos que el portal web.
 */
export const onboardingService = {
  get: () => apiClient.request('/me/onboarding', onboardingSchema, { method: 'GET' }),
  saveGoals: (primaryGoal: FitnessGoal) =>
    apiClient.request('/me/onboarding/goals', onboardingSchema, {
      method: 'PUT',
      body: { primaryGoal },
    }),
  saveProfile: (input: {
    weight: number;
    weightUnit: 'KG' | 'LB';
    height: number;
    heightUnit: 'CM' | 'IN';
    measuredOn: string;
    idempotencyKey?: string;
  }) =>
    apiClient.request('/me/onboarding/profile', onboardingSchema, { method: 'PUT', body: input }),
  savePreferences: (input: {
    experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    weeklyFrequency: number;
    trainingLocation: 'GYM' | 'HOME' | 'OUTDOORS' | 'MIXED';
    trainingPreferences: string[];
    physicalConsiderations?: string | null;
    consentHealth: boolean;
    consentData: boolean;
  }) =>
    apiClient.request('/me/onboarding/preferences', onboardingSchema, {
      method: 'PUT',
      body: input,
    }),
  saveEquipment: (availableEquipment: string[]) =>
    apiClient.request('/me/onboarding/equipment', onboardingSchema, {
      method: 'PUT',
      body: { availableEquipment },
    }),
  complete: () =>
    apiClient.request('/me/onboarding/complete', onboardingSchema, { method: 'POST' }),
};

/** Galería de fotos de perfil. No es la mediateca administrada por el gimnasio. */
export const profilePhotosService = {
  list: () => apiClient.request('/me/photos', z.array(profilePhotoSchema), { method: 'GET' }),
  upload: async (file: LocalFile) => {
    const form = new FormData();
    await appendLocalFile(form, 'file', file);
    return apiClient.upload('/me/photos', profilePhotoSchema, form);
  },
  remove: (photoId: string) =>
    apiClient.request(`/me/photos/${photoId}`, deletedSchema, { method: 'DELETE' }),
};

export interface ProfileInput {
  /** `YYYY-MM-DD`; `null` borra la fecha guardada. */
  fechaNacimiento?: string | null;
  pesoKg: number;
  estaturaCm: number;
  objetivo: TrainingGoal;
}

export const membershipService = {
  getMine: () => apiClient.request('/me/membership', membershipProjectionSchema, { method: 'GET' }),
  /**
   * Pide que el gimnasio active la cuenta tras un pago que la app no vio.
   *
   * Devuelve el enlace que el administrador abrirá. La app no lo interpreta:
   * sólo lo mete en el mensaje de WhatsApp, porque quién puede usarlo lo decide
   * el backend y no este teléfono.
   */
  requestActivation: (nota: string | null) =>
    apiClient.request('/me/membership/activation-request', activationRequestSchema, {
      method: 'POST',
      body: { nota },
    }),
};

export const workoutService = {
  /** Most recent sessions first, as the backend orders them. */
  list: (pageSize = 5) =>
    apiClient.request(`/workouts?page=1&pageSize=${pageSize}`, pageSchema(workoutSchema), {
      method: 'GET',
    }),
  get: (id: string) => apiClient.request(`/workouts/${id}`, workoutSchema, { method: 'GET' }),

  /** Starts an empty session; exercises are added as the user trains. */
  start: (observacion?: string) =>
    apiClient.request('/workouts', workoutSchema, {
      method: 'POST',
      body: { observacion: observacion ?? null },
    }),
  /** Starts a session pre-filled from a routine. */
  startFromRoutine: (routineId: string, routineDayId?: string) =>
    apiClient.request(`/routines/${routineId}/start`, workoutSchema, {
      method: 'POST',
      ...(routineDayId ? { body: { routineDayId } } : {}),
    }),
  finish: (id: string, location?: { latitude: number; longitude: number }) =>
    apiClient.request(`/workouts/${id}/finish`, workoutFinishSchema, {
      method: 'PATCH',
      body: location ?? {},
    }),
  cancel: (id: string) =>
    apiClient.request(`/workouts/${id}/cancel`, workoutSchema, { method: 'PATCH' }),

  addExercise: (sessionId: string, input: AddWorkoutExerciseInput) =>
    apiClient.request(`/workouts/${sessionId}/exercises`, looseObject, {
      method: 'POST',
      body: input,
    }),
  removeExercise: (sessionExerciseId: string) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}`, deletedSchema, {
      method: 'DELETE',
    }),

  addSet: (sessionExerciseId: string, input: WorkoutSetInput | TimedWorkoutSetInput | CardioSetInput) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}/sets`, looseObject, {
      method: 'POST',
      body: input,
    }),
  updateSet: (setId: string, input: WorkoutSetUpdateInput) =>
    apiClient.request(`/workouts/sets/${setId}`, looseObject, { method: 'PATCH', body: input }),
  removeSet: (setId: string) =>
    apiClient.request(`/workouts/sets/${setId}`, deletedSchema, { method: 'DELETE' }),

  /* D1 · series saltadas y ejercicios omitidos (contrato 11a §1). Idempotentes. */
  skipSet: (sessionExerciseId: string, input: { numeroSerie: number; motivo: SkipReason; nota: string | null }) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}/skipped-sets`, skippedSetSchema, {
      method: 'POST',
      body: input,
    }),
  unskipSet: (skippedSetId: string) =>
    apiClient.request(`/workouts/skipped-sets/${skippedSetId}`, deletedSchema, { method: 'DELETE' }),
  omitExercise: (sessionExerciseId: string, input: { motivo: SkipReason; nota: string | null }) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}/omit`, looseObject, {
      method: 'POST',
      body: input,
    }),
  unomitExercise: (sessionExerciseId: string) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}/omit`, looseObject, { method: 'DELETE' }),

  /* D2 · descanso e intervalo a mano (contrato 11a §2). */
  routineLink: (id: string) =>
    apiClient.request(`/workouts/${id}/routine-link`, workoutRoutineLinkSchema, { method: 'GET' }),
  restSettings: (id: string, input: { cambios: RestSettingChange[]; guardarEnRutina: boolean }) =>
    apiClient.request(`/workouts/${id}/rest-settings`, restSettingsResultSchema, { method: 'PATCH', body: input }),
};

export const routineService = {
  myAssignments: () =>
    apiClient.request('/routines/assignments/me', z.array(routineAssignmentSchema), {
      method: 'GET',
    }),
  /** `scope=mine` returns the routines the signed-in user can train with. */
  list: () =>
    apiClient.request('/routines?scope=mine&pageSize=100', pageSchema(routineSchema), {
      method: 'GET',
    }),
  get: (id: string) => apiClient.request(`/routines/${id}`, routineSchema, { method: 'GET' }),
  /**
   * Places a routine in the caller's own week. The recipient is never sent in
   * the body: the backend derives it from the token, so this cannot schedule
   * anything into someone else's agenda.
   */
  schedule: (routineId: string, input: RoutineScheduleInput) =>
    apiClient.request(`/routines/${routineId}/schedule`, routineAssignmentSchema, {
      method: 'POST',
      body: input,
    }),

publicList: (goal?: TrainingGoal, page = 1) =>
    apiClient.request(`/routines?scope=public&pageSize=20&page=${page}${goal ? `&goal=${goal}` : ''}`, pageSchema(routineSchema), {
      method: 'GET',
    }),
createComplete: (input: CompleteRoutineInput) =>
    apiClient.request('/routines/complete', routineSchema, { method: 'POST', body: input }),
replaceComplete: (id: string, input: CompleteRoutineInput) =>
    apiClient.request(`/routines/${id}/complete`, routineSchema, { method: 'PUT', body: input }),
update: (id: string, input: { visibilidad: RoutineVisibility }) =>
    apiClient.request(`/routines/${id}`, routineSchema, { method: 'PATCH', body: input }),
copy: (id: string, creationKey: string) =>
    apiClient.request(`/routines/${id}/copy`, routineSchema, {
      method: 'POST', body: { creationKey },
    }),
report: (id: string, reason: 'SPAM' | 'DISCURSO_DE_ODIO' | 'OTRO', details: string) =>
    apiClient.request('/me/reports', z.object({ id: z.string().uuid(), status: z.string(), contentHidden: z.boolean() }), {
      method: 'POST',
      body: { targetKind: 'ROUTINE', targetId: id, reason, details },
    }),
recommend: (input: { objetivo: TrainingGoal; lugar: 'GYM' | 'HOME' | 'OUTDOORS'; minutos: number; publico: boolean }) =>
    apiClient.request(`/routines/recommendations?objetivo=${input.objetivo}&lugar=${input.lugar}&minutos=${input.minutos}&publico=${input.publico}`, routineRecommendationSchema, {
      method: 'GET',
    }),
};

/** Rutinas por días: crear con `dias`, `PUT structure`, calendario y semanas. */
export const routineBuilderService = createRoutineServices(apiClient.request);

const catalogApi = createCatalogServices(apiClient.request);
const sharingApi = createSharingServices(apiClient.request);
const communityApi = createCommunityServices(apiClient.request);
const programsApi = createProgramServices(apiClient.request);
const cardioApi = createCardioServices(apiClient.request);

/**
 * Los servicios compartidos (`@gymsheet/api-client`) son los mismos que usa la web; aquí se agrupan
 * con los nombres que las pantallas del móvil ya usan (catálogo y publicar, compartir, comunidad,
 * programas y cardio).
 */
export const routineCatalogService = {
  list: catalogApi.list,
  publish: sharingApi.publish,
  unpublish: sharingApi.unpublish,
  copy: sharingApi.copy,
  syncFromSource: sharingApi.syncFromSource,
};

/** Rutinas recomendadas según el objetivo y el onboarding (C7): `[{ rutina, motivo }]`. */
export const routineRecommendationService = createRecommendationServices(apiClient.request);

export const routineSharingService = {
  invite: sharingApi.invite,
  listShares: sharingApi.listShares,
  revoke: sharingApi.revokeShare,
  myInvitations: sharingApi.myInvitations,
  accept: sharingApi.accept,
  decline: sharingApi.decline,
};

export const communityService = {
  ratingSummary: communityApi.rating,
  rate: communityApi.rate,
  removeRating: communityApi.removeRating,
  comments: (kind: Parameters<typeof communityApi.comments>[0], id: string, cursor?: string | null) =>
    communityApi.comments(kind, id, cursor ?? undefined),
  comment: (
    kind: Parameters<typeof communityApi.comment>[0],
    id: string,
    texto: string,
    respuestaA?: string | null,
    adjunto?: CommentAttachment | null,
  ) =>
    communityApi.comment(kind, id, {
      texto,
      ...(respuestaA ? { respuestaA } : {}),
      ...(adjunto ? { adjunto } : {}),
    }),
  gifs: communityApi.gifs,
  /** Sube la foto, video o archivo de un comentario; devuelve el adjunto para enviarlo. */
  uploadAttachment: async (file: LocalFile) => {
    const form = new FormData();
    await appendLocalFile(form, 'file', file);
    return apiClient.upload('/comments/media', commentAttachmentSchema, form, { timeoutMs: 120_000 });
  },
  deleteComment: communityApi.removeComment,
  likeComment: communityApi.likeComment,
  unlikeComment: communityApi.unlikeComment,
  report: communityApi.report,
};

export const programService = {
  ...programsApi,
  cardioPlans: cardioApi.listPlans,
  createCardioPlan: cardioApi.createPlan,
  activateCardio: cardioApi.activate,
};

/** Me gusta (público) y favorito (privado) de un ejercicio. */
export const exerciseCommunityService = createExerciseCommunityServices(apiClient.request);

export interface RoutineScheduleInput {
  diasSemana: number[];
  repiteDesde?: string | null;
  /** `null` = indefinido, que es un plan permanente y no un error. */
  repiteHasta?: string | null;
}

export interface ExerciseFilters {
  search?: string;
  grupoMuscular?: string;
  /** Server-side drill-down: the catalogue is far too large to filter locally. */
  bodyPart?: string;
  targetMuscle?: string;
  /** Sólo los ejercicios que la persona marcó como favoritos (privado). */
  favoritos?: boolean;
  page?: number;
  pageSize?: number;
  /** Buscador tolerante (contrato 11a §3). */
  orden?: 'relevancia' | 'nombre' | 'populares' | 'recientes' | 'masUsados';
  equipo?: string;
  musculo?: string;
  conImagen?: boolean;
}

// El esquema de la taxonomía vive en @gymsheet/schemas: la web lo usa igual.
export type { ExerciseTaxonomy } from '@gymsheet/schemas';

function queryString(filters: ExerciseFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export const exerciseService = {
  list: (filters: ExerciseFilters = {}) =>
    apiClient.request(
      `/exercises?${queryString({ page: 1, pageSize: 30, ...filters })}`,
      pageSchema(exerciseSchema),
      { method: 'GET' },
    ),
  /**
   * Una página del buscador: resultados, corrección («¿Quisiste decir…?») y lo
   * que el servidor entendió. `signal` cancela la petición de la tecla anterior.
   */
  search: (filters: ExerciseFilters, signal?: AbortSignal) =>
    apiClient.request(
      `/exercises?${queryString({ page: 1, pageSize: 30, ...filters })}`,
      exerciseSearchPageSchema,
      { method: 'GET', signal },
    ),
  /** Recientes, los que más usa la persona y populares: la pantalla vacía del buscador. */
  shortcuts: (limit = 8) =>
    apiClient.request(`/exercises/shortcuts?limit=${limit}`, exerciseShortcutsSchema, { method: 'GET' }),
  get: (id: string) => apiClient.request(`/exercises/${id}`, exerciseSchema, { method: 'GET' }),
  taxonomy: () =>
    apiClient.request('/exercises/taxonomy', exerciseTaxonomySchema, { method: 'GET' }),
};

/**
 * Músculos por código de la taxonomía (`PECTORALIS_MAJOR`…): el detalle de uno y
 * los ejercicios que lo trabajan. Es lo que abre el toque sobre la figura.
 */
export const muscleService = {
  get: (code: string) =>
    apiClient.request(`/muscles/${encodeURIComponent(code)}`, muscleCatalogEntrySchema, {
      method: 'GET',
    }),
  /** Los músculos que trabaja un ejercicio, por rol; enlazan con `get`. */
  forExercise: (exerciseId: string) =>
    apiClient.request(`/exercises/${encodeURIComponent(exerciseId)}/muscles`, exerciseMusclesSchema, {
      method: 'GET',
    }),
  /** Protagonistas primero; `offset` pide la página siguiente. */
  exercises: (code: string, { limit = 30, offset = 0 }: { limit?: number; offset?: number } = {}) =>
    apiClient.request(
      `/muscles/${encodeURIComponent(code)}/exercises?${new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })}`,
      muscleExercisesPageSchema,
      { method: 'GET' },
    ),
};

/**
 * La senda: rangos, insignias y puntos.
 *
 * Todo lo visible llega del servidor —nombres, textos, iconos, colores—, así
 * que el gimnasio puede renombrar un rango sin publicar una versión de la
 * aplicación. Aquí no hay ni un nombre de nivel escrito.
 */
export const progressionService = {
  /**
   * Estado completo. Cada lectura recalcula en el servidor, de modo que abrir
   * la pantalla justo después de entrenar ya muestra lo ganado, sin esperar a
   * ningún proceso en segundo plano.
   */
  get: () => apiClient.request('/me/progression', progressionSchema, { method: 'GET' }),
  /** Cuánto vale cada cosa. Lo publica el servidor para no copiarlo en la app. */
  rules: () => apiClient.request('/me/progression/rules', pointRulesSchema, { method: 'GET' }),
  /** Confirma que las novedades ya se han celebrado y dejan de ser nuevas. */
  acknowledge: () =>
    apiClient.request('/me/progression/acknowledge', progressionAcknowledgedSchema, {
      method: 'POST',
    }),
  leaderboard: (limit = 10, sortBy: LeaderboardSortBy = 'points') =>
    apiClient.request(
      `/me/progression/leaderboard?limit=${limit}&sortBy=${sortBy}`,
      leaderboardSchema,
      { method: 'GET' },
    ),
  /** Los cupones del socio (= `progression.prizes`), del más reciente al más antiguo. */
  prizes: () => apiClient.request('/me/progression/prizes', prizeListSchema, { method: 'GET' }),
  getRestDays: () =>
    apiClient.request('/me/progression/rest-days', restDaysSchema, { method: 'GET' }),
  setRestDays: (weekdays: number[]) =>
    apiClient.request<RestDays>('/me/progression/rest-days', restDaysSchema, {
      method: 'PATCH',
      body: { weekdays },
    }),
};

/**
 * Ejercicios propios: se elige el músculo y la máquina se deduce sola.
 *
 * La deducción la hace el servidor contra el catálogo real, no esta pantalla:
 * una tabla músculo→máquina en el cliente quedaría desfasada en cuanto el
 * catálogo se sincronizara.
 */
export const personalExerciseService = {
  suggestEquipment: (muscleCode: string) =>
    apiClient.request(
      `/exercises/equipment-suggestion?muscle=${encodeURIComponent(muscleCode)}`,
      muscleEquipmentInferenceSchema,
      { method: 'GET' },
    ),
  create: (input: PersonalExerciseInput) =>
    apiClient.request('/exercises/personal', exerciseSchema, { method: 'POST', body: input }),
};

export interface PersonalExerciseInput {
  nombre: string;
  /** Código canónico de la taxonomía. Con esto basta: el resto lo pone el servidor. */
  muscleCode: string;
  /** Ausente = se acepta la máquina que el catálogo considera más habitual. */
  equipmentLabel?: string;
  descripcion?: string | null;
}

/**
 * La cuenta: lo que la persona es, no lo que mide.
 *
 * El género vive aquí y no en el perfil antropométrico a propósito: ese perfil
 * exige peso y estatura, y obligar a medirse para poder corregir cómo te llama
 * la aplicación sería pedir un dato íntimo a cambio de otro.
 */
export const accountService = {
  getMe: () => apiClient.request('/users/me', userSchema, { method: 'GET' }),
  setGender: (genero: UserGender) =>
    apiClient.request('/users/me', userSchema, { method: 'PATCH', body: { genero } }),
  setWeightIncrement: (pesoIncrementoKg: number) =>
    apiClient.request('/users/me', userSchema, {
      method: 'PATCH',
      body: { pesoIncrementoKg },
    }),
};

function socialQueryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

/** Punto 11 (conexiones) y 10 (estado social): igual que en la web, mismos contratos. */
export const socialService = {
  listConnections: (status?: ConnectionStatus) =>
    apiClient.request(
      `/me/connections${status ? `?status=${status}` : ''}`,
      z.array(connectionSchema),
      { method: 'GET' },
    ),
  sendConnection: (addresseeId: string) =>
    apiClient.request('/me/connections', connectionSchema, {
      method: 'POST',
      body: { addresseeId },
    }),
  respondConnection: (id: string, action: 'ACCEPT' | 'REJECT') =>
    apiClient.request(`/me/connections/${id}`, connectionSchema, { method: 'PATCH', body: { action } }),
  withdrawConnection: (id: string) =>
    apiClient.request(`/me/connections/${id}`, deletedSchema, { method: 'DELETE' }),
  getSocialStatus: () =>
    apiClient.request('/me/social-status', socialStatusSchema, { method: 'GET' }),
  updateSocialStatus: (input: SocialStatusState) =>
    apiClient.request('/me/social-status', socialStatusSchema, { method: 'PATCH', body: input }),
  directory: (filters: DirectoryFilters = {}) =>
    apiClient.request(
      `/me/gym-directory?${socialQueryString(filters)}`,
      z.array(gymDirectoryEntrySchema),
      { method: 'GET' },
    ),
  /** Perfil social de un socio del mismo gimnasio, con las insignias que ganó. */
  memberProfile: (userId: string) =>
    apiClient.request(`/me/gym-directory/${userId}`, memberProfileSchema, { method: 'GET' }),

blockUser: (targetUserId: string) =>
    apiClient.request('/me/blocks', z.object({ blocked: z.literal(true) }), {
      method: 'POST', body: { targetUserId },
    }),
unblockUser: (targetUserId: string) =>
    apiClient.request(`/me/blocks/${targetUserId}`, z.object({ unblocked: z.literal(true) }), { method: 'DELETE' }),
listBlockedUsers: () =>
    apiClient.request('/me/blocks', z.array(z.object({ userId: z.string().uuid(), displayName: z.string(), blockedAt: z.string() })), { method: 'GET' }),
getDiscoverySettings: () =>
    apiClient.request('/me/social-discovery-settings', socialDiscoverySettingsSchema, { method: 'GET' }),
updateDiscoverySettings: (input: {
    profileEnabled: boolean; crossGymEnabled: boolean; mapEnabled: boolean; expectedVersion: number;
  }) => apiClient.request('/me/social-discovery-settings', socialDiscoverySettingsSchema, { method: 'PATCH', body: input }),
getDiscoveryPreferences: () => apiClient.request('/me/discovery/preferences', discoveryPreferencesSchema, { method: 'GET' }),
updateDiscoveryPreferences: (input: {
    genders: ('MALE' | 'FEMALE')[]; intents: ('TRAINING' | 'FRIENDSHIP' | 'DATING')[];
    minAge: number; maxAge: number; radiusKm: number; flexibleAge: boolean;
    flexibleDistance: boolean; expectedVersion: number;
  }) => apiClient.request('/me/discovery/preferences', discoveryPreferencesSchema, { method: 'PUT', body: input }),
saveMapLocation: (location: SocialMapCoordinates) =>
    apiClient.request('/me/social-map/location', z.object({ saved: z.literal(true) }), { method: 'PATCH', body: location }),
mapAreas: (bounds: SocialMapBounds) => {
    const query = new URLSearchParams(Object.entries(bounds).map(([key, value]) => [key, String(value)]));
    return apiClient.request(`/me/social-map/areas?${query.toString()}`, socialMapAreasSchema, { method: 'GET' });
  },
mapPeople: (cellId: string) =>
    apiClient.request(`/me/social-map/cells/${encodeURIComponent(cellId)}/people`, socialMapPeopleSchema, { method: 'GET' }),
mapNearby: (point: SocialMapCoordinates) =>
    apiClient.request(`/me/social-map/nearby?latitude=${point.latitude}&longitude=${point.longitude}`, socialMapNearbySchema, { method: 'GET' }),
mapGyms: (bounds: SocialMapBounds) => {
    const query = new URLSearchParams(Object.entries(bounds).map(([key, value]) => [key, String(value)]));
    return apiClient.request(`/me/social-map/gyms?${query.toString()}`, socialMapGymsSchema, { method: 'GET' });
  },
searchMapCities: (query: string) =>
    apiClient.request(`/me/social-map/cities?q=${encodeURIComponent(query)}`, socialMapCitiesSchema, { method: 'GET' }),
};

/** Filtros del directorio. La baraja acepta los mismos: es el mismo catálogo. */
export type DirectoryFilters = {
  objetivo?: string;
  sucursalId?: string;
  genero?: string;
  q?: string;
  limit?: number;
};

/**
 * Descubrimiento: la baraja y los swipes.
 *
 * Aparte de `socialService` porque es otro modelo de interacción sobre el mismo
 * catálogo — el directorio se recorre, la baraja se consume — y porque el
 * backend los sirve bajo `/me/discovery`.
 */
export const discoveryService = {
  /** Candidatos sin decidir. El backend acota `limit` a 30; por defecto trae 10. */
  deck: (filters: DirectoryFilters = {}) =>
    apiClient.request(
      `/me/discovery/deck?${socialQueryString(filters)}`,
      z.array(gymDirectoryEntrySchema),
      { method: 'GET' },
    ),
  /** «Me gusta» mutuo = match automático: la respuesta llega con `matched: true`. */
  swipe: (targetId: string, direction: SwipeDirection, impressionId?: string) =>
    apiClient.request('/me/discovery/swipes', swipeResultSchema, {
      method: 'POST',
      body: { targetId, direction, impressionId },
    }),
  /** Deshace el último swipe. Responde 409 si el match ya tiene mensajes. */
  undoSwipe: () =>
    apiClient.request('/me/discovery/swipes/undo', undoSwipeResultSchema, { method: 'POST' }),

observeImpression: (impressionId: string) =>
    apiClient.request('/me/discovery/impressions', z.object({ observed: z.literal(true) }), {
      method: 'POST',
      body: { impressionId },
    }),
};

/** Sedes. El directorio público lista TODAS las marcas; `myBranches` sólo las del gimnasio propio. */
export const facilitiesService = {
  /**
   * Directorio público de sedes — sin sesión, mismo contrato que consume la web.
   * Sirve para descubrir gimnasios de la ciudad, **no** para filtrar el
   * directorio de socios: devuelve sedes de marcas ajenas.
   */
  publicBranches: () =>
    apiClient.request('/public/facilities/branches', z.array(publicBranchSummarySchema), {
      method: 'GET',
    }),
  /**
   * Sedes del gimnasio del usuario autenticado. Es la que debe alimentar el
   * filtro por sucursal del directorio: filtrar por una sede ajena no puede
   * devolver socios, porque `/me/gym-directory` está acotado al tenant propio.
   */
  myBranches: () =>
    apiClient.request('/me/facilities/branches', z.array(publicBranchSummarySchema), {
      method: 'GET',
    }),
};

/** Punto 5: chat entre conexiones aceptadas. El socket vive en `src/hooks/use-chat-socket.ts`. */
export const chatService = {
  listConversations: () =>
    apiClient.request('/me/conversations', z.array(conversationSummarySchema), { method: 'GET' }),
  startConversation: (otherUserId: string) =>
    apiClient.request('/me/conversations', startConversationResponseSchema, {
      method: 'POST',
      body: { otherUserId },
    }),
  listMessages: (conversationId: string, params: { limit?: number; before?: string; beforeId?: string } = {}) =>
    apiClient.request(
      `/me/conversations/${conversationId}/messages?${socialQueryString(params)}`,
      z.array(messageSchema),
      { method: 'GET' },
    ),
  sendMessage: (conversationId: string, body: string) =>
    apiClient.request(`/me/conversations/${conversationId}/messages`, messageSchema, {
      method: 'POST',
      body: { type: 'text', body },
    }),
  sendLocationMessage: (conversationId: string, location: { lat: number; lng: number }) =>
    apiClient.request(`/me/conversations/${conversationId}/messages`, messageSchema, {
      method: 'POST',
      body: { type: 'location', locationLat: location.lat, locationLng: location.lng },
    }),
  /** `file.mimeType` decide si el backend lo trata como imagen o video. */
  sendMediaMessage: async (
    conversationId: string,
    file: LocalFile,
    options: { type: 'image' | 'video' | 'audio'; body?: string; viewOnce?: boolean },
  ) => {
    const form = new FormData();
    await appendLocalFile(form, 'file', file);
    form.append('type', options.type);
    if (options.body) form.append('body', options.body);
    form.append('viewOnce', options.viewOnce ? 'true' : 'false');
    return apiClient.upload(`/me/conversations/${conversationId}/messages/media`, messageSchema, form);
  },
  /** Revela la URL real de un mensaje de vista única — una sola vez por mensaje, para quien sea. */
  viewMessage: (conversationId: string, messageId: string) =>
    apiClient.request(`/me/conversations/${conversationId}/messages/${messageId}/view`, messageSchema, {
      method: 'POST',
    }),
  /** Apodo privado para esta conversación; `null` lo borra y vuelve al nombre real. */
  setNickname: (conversationId: string, nickname: string | null) =>
    apiClient.request(`/me/conversations/${conversationId}/nickname`, z.object({ updated: z.literal(true) }), {
      method: 'PATCH',
      body: { nickname },
    }),
  /** Adelanta el check de leído/entregado de esta conversación al abrirla. */
  markRead: (conversationId: string) =>
    apiClient.request(`/me/conversations/${conversationId}/read`, z.object({ read: z.literal(true) }), {
      method: 'POST',
    }),
  // Boleto de un solo uso para el handshake del socket — nunca el JWT real,
  // aunque el móvil ya lo tenga en SecureStore: un solo camino de auth para
  // el gateway, igual en ambas plataformas.
  issueSocketTicket: () =>
    apiClient.request('/auth/socket-ticket', socketTicketSchema, { method: 'POST' }),

  /** «Eliminar para mí» oculta el mensaje solo en mi vista; «para todos» lo borra del hilo (60 h). */
  deleteMessage: (conversationId: string, messageId: string, scope: 'ME' | 'EVERYONE') =>
    apiClient.request(
      `/me/conversations/${conversationId}/messages/${messageId}?scope=${scope}`,
      z.object({ scope: z.enum(['ME', 'EVERYONE']) }).passthrough(),
      { method: 'DELETE' },
    ),
  editMessage: (conversationId: string, messageId: string, body: string) =>
    apiClient.request(`/me/conversations/${conversationId}/messages/${messageId}`, chatMessageSchema, {
      method: 'PATCH',
      body: { body },
    }),
getReadReceiptSettings: (conversationId?: string) =>
    apiClient.request(
      `/me/chat/read-receipts${conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''}`,
      readReceiptSettingsSchema,
      { method: 'GET' },
    ),
updateReadReceiptSettings: (input: {
    scope: 'ALL' | 'CONVERSATION' | 'SELECTED'; enabled: boolean; expectedVersion: number;
    conversationId?: string; conversationIds?: string[];
  }) => apiClient.request('/me/chat/read-receipts', readReceiptSettingsSchema, { method: 'PUT', body: input }),
};

/** Stories efímeras (24h), visibles a todo el tenant — independientes de la galería de fotos. */
export const storiesService = {
  feed: () => apiClient.request('/me/stories/feed', z.array(storyFeedEntrySchema), { method: 'GET' }),
  upload: async (file: LocalFile, audience?: { mode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS'; recipientIds: string[]; requestId?: string }) => {
    const form = new FormData();
    await appendLocalFile(form, 'file', file);
    if (audience) {
      form.append('audienceMode', audience.mode);
      form.append('recipientIds', JSON.stringify(audience.recipientIds));
      if (audience.requestId) form.append('requestId', audience.requestId);
    }
    return apiClient.upload('/me/stories', storySchema, form);
  },
  view: (storyId: string) =>
    apiClient.request(`/me/stories/${storyId}/view`, z.object({ recorded: z.literal(true) }), { method: 'POST' }),
  /** Quién vio una story propia. El backend responde 404 si la story es de otra persona. */
  viewers: (storyId: string) =>
    apiClient.request(`/me/stories/${storyId}/viewers`, storyViewersResponseSchema, { method: 'GET' }),
  remove: (storyId: string) => apiClient.request(`/me/stories/${storyId}`, deletedSchema, { method: 'DELETE' }),

reply: (storyId: string, text: string, requestId: string) =>
    apiClient.request(`/me/stories/${storyId}/replies`, chatMessageSchema, {
      method: 'POST',
      body: { text, requestId },
    }),
};

/** "Quién visitó tu perfil hoy" — registro de vistas append-only, resumen agregado por día. */
export const profileViewsService = {
  record: (viewedUserId: string) =>
    apiClient.request('/me/profile-views', z.object({ recorded: z.literal(true) }), {
      method: 'POST',
      body: { viewedUserId },
    }),
  summary: () => apiClient.request('/me/profile-views/summary', profileViewsSummarySchema, { method: 'GET' }),
  /**
   * Quiénes vieron mi perfil, una fila por persona y no por visita.
   *
   * Paginado por cursor y no por página: la lista crece por delante, y con
   * `OFFSET` una visita nueva mientras se pagina desplaza todo y repite filas.
   */
  list: (params: { limit?: number; cursor?: string } = {}) =>
    apiClient.request(
      `/me/profile-views?${socialQueryString({ limit: params.limit, cursor: params.cursor })}`,
      profileViewersPageSchema,
      { method: 'GET' },
    ),
  /** Marca la lista como revisada: a partir de aquí, `newSinceLastCheck` vuelve a cero. */
  markChecked: () =>
    apiClient.request('/me/profile-views/checked', z.object({ checked: z.literal(true) }), {
      method: 'POST',
    }),
};

/**
 * Interacciones: quién me dio like, a quién se lo di yo, quién me descartó y a
 * quién descarté.
 *
 * Las cuatro listas devuelven la misma ficha que la baraja de descubrimiento
 * más la fecha de la interacción, así que se pintan con la misma tarjeta en
 * vez de con cuatro variantes que acabarían divergiendo.
 */
export const interactionsService = {
  likesReceived: (limit?: number) =>
    apiClient.request(
      `/me/interactions/likes-received?${socialQueryString({ limit })}`,
      z.array(likeReceivedSchema),
      { method: 'GET' },
    ),
  likesSent: (limit?: number) =>
    apiClient.request(
      `/me/interactions/likes-sent?${socialQueryString({ limit })}`,
      z.array(likeSentSchema),
      { method: 'GET' },
    ),
  passesReceived: (limit?: number) =>
    apiClient.request(
      `/me/interactions/passes-received?${socialQueryString({ limit })}`,
      z.array(discoveryPassEntrySchema),
      { method: 'GET' },
    ),
  passesSent: (limit?: number) =>
    apiClient.request(
      `/me/interactions/passes-sent?${socialQueryString({ limit })}`,
      z.array(discoveryPassEntrySchema),
      { method: 'GET' },
    ),
  /** Deshace un descarte propio: esa persona vuelve a la baraja. */
  undoPass: (userId: string) =>
    apiClient.request(`/me/interactions/passes/${userId}`, deletedSchema, { method: 'DELETE' }),
  counts: () =>
    apiClient.request('/me/interactions/counts', interactionCountsSchema, { method: 'GET' }),
};

/**
 * Notificaciones push reales (Expo Push API). El backend nunca ve un token de
 * FCM/APNs crudo, solo el `ExponentPushToken[...]` que entrega
 * `Notifications.getExpoPushTokenAsync()` — ver `@/notifications/push`.
 */
const registerDeviceTokenResultSchema = z.object({ registered: z.boolean() });

export const deviceTokenService = {
  register: (input: { expoPushToken: string; platform: 'ANDROID' | 'IOS' }) =>
    apiClient.request('/notifications/device-tokens', registerDeviceTokenResultSchema, {
      method: 'POST',
      body: input,
    }),
  unregister: (expoPushToken: string) =>
    apiClient.request('/notifications/device-tokens', registerDeviceTokenResultSchema, {
      method: 'DELETE',
      body: { expoPushToken },
    }),
};

/** Música para entrenar: enlaces a Spotify de la comunidad (públicas) o tuyos (privadas). */
export const musicService = {
  list: (scope: 'public' | 'private', cursor?: string | null, limit = 20) =>
    apiClient.request(
      `/music/playlists?${new URLSearchParams({ scope, limit: String(limit), ...(cursor ? { cursor } : {}) })}`,
      musicPlaylistPageSchema,
      { method: 'GET' },
    ),
  create: (input: { url: string; visibilidad: MusicVisibility; titulo?: string }) =>
    apiClient.request('/music/playlists', musicPlaylistSchema, { method: 'POST', body: input }),
  update: (id: string, input: { visibilidad?: MusicVisibility; titulo?: string }) =>
    apiClient.request(`/music/playlists/${id}`, musicPlaylistSchema, { method: 'PATCH', body: input }),
  remove: (id: string) => apiClient.request(`/music/playlists/${id}`, deletedSchema, { method: 'DELETE' }),
};

export const moderationService = {
  report: (targetKind: 'USER' | 'CHAT_MESSAGE', targetId: string, reason: ModerationReportReason) =>
    apiClient.request('/me/reports', moderationReportResultSchema, {
      method: 'POST',
      body: { targetKind, targetId, reason },
    }),
};

export type ModerationReportReason =
  | 'ACOSO'
  | 'PERFIL_FALSO'
  | 'SPAM'
  | 'OTRO';

const moderationReportResultSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  contentHidden: z.boolean(),
});

type CompleteRoutineInput = {
  nombre: string;
  descripcion: string | null;
  visibilidad: RoutineVisibility;
  objetivo: TrainingGoal;
  creationKey: string;
  ejercicios: Array<{
    ejercicioId: string;
    orden: number;
    seriesObjetivo: number;
    repsMin: number | null;
    repsMax: number | null;
    pesoObjetivoKg: number | null;
    descansoSeg: number | null;
    rirObjetivo: number | null;
    nota: string | null;
  }>;
};
