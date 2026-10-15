import { z } from 'zod';
import { progressionBadgeSchema } from './progression';

/**
 * Contratos de la capa social: solicitudes de conexión entre socios, estado
 * social del perfil, el directorio del gimnasio, la baraja de descubrimiento y
 * el chat entre conexiones aceptadas. Igual que en `progression.ts`, los tipos
 * se infieren aquí mismo en vez de mantenerse por duplicado en
 * `@gymsheet/types`.
 */

export const connectionStatuses = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type ConnectionStatus = (typeof connectionStatuses)[number];

export const connectionDirections = ['SENT', 'RECEIVED'] as const;
export type ConnectionDirection = (typeof connectionDirections)[number];

export const socialStatusValues = ['OPEN_TO_MEET', 'IN_RELATIONSHIP', 'SINGLE'] as const;
export type SocialStatusValue = (typeof socialStatusValues)[number];

/** Mismo enum que `onboardingSchema.trainingLocation`; el directorio filtra por él. */
export const trainingLocations = ['GYM', 'HOME', 'OUTDOORS', 'MIXED'] as const;
export type TrainingLocation = (typeof trainingLocations)[number];

export const directoryConnectionStatuses = [
  'NONE',
  'PENDING_SENT',
  'PENDING_RECEIVED',
  'ACCEPTED',
] as const;
export type DirectoryConnectionStatus = (typeof directoryConnectionStatuses)[number];

export const connectionSchema = z.object({
  id: z.string().uuid(),
  otherUserId: z.string().uuid(),
  otherUserName: z.string(),
  /** Quién la envió: solo el receptor puede aceptar/rechazar, solo el emisor puede retirarla. */
  direction: z.enum(connectionDirections),
  status: z.enum(connectionStatuses),
  createdAt: z.string(),
});
export type Connection = z.infer<typeof connectionSchema>;

export const socialStatusSchema = z.object({
  socialStatus: z.enum(socialStatusValues).nullable(),
  visible: z.boolean(),
});
export type SocialStatusState = z.infer<typeof socialStatusSchema>;

export const socialDiscoverySettingsSchema = z.object({
  profileEnabled: z.boolean(),
  crossGymEnabled: z.boolean(),
  mapEnabled: z.boolean(),
  version: z.number().int().nonnegative(),
});
export type SocialDiscoverySettings = z.infer<typeof socialDiscoverySettingsSchema>;

export const updateSocialDiscoverySettingsSchema = z.object({
  profileEnabled: z.boolean(),
  crossGymEnabled: z.boolean(),
  mapEnabled: z.boolean(),
  expectedVersion: z.number().int().nonnegative(),
}).refine(
  (settings) => settings.profileEnabled || (!settings.crossGymEnabled && !settings.mapEnabled),
  { message: 'El perfil social debe estar activo para habilitar otros espacios.' },
);
export type UpdateSocialDiscoverySettingsInput = z.infer<typeof updateSocialDiscoverySettingsSchema>;

export const discoveryPreferencesSchema = z.discriminatedUnion('configured', [
  z.object({ configured: z.literal(false), version: z.literal(0) }),
  z.object({
    configured: z.literal(true),
    genders: z.array(z.enum(['MALE', 'FEMALE'])).min(1).max(2),
    intents: z.array(z.enum(['TRAINING', 'FRIENDSHIP', 'DATING'])).min(1).max(3),
    minAge: z.number().int().min(18).max(100),
    maxAge: z.number().int().min(18).max(100),
    radiusKm: z.number().min(1).max(500),
    flexibleAge: z.boolean(),
    flexibleDistance: z.boolean(),
    version: z.number().int().positive(),
  }).refine((value) => value.maxAge >= value.minAge),
]);
export type DiscoveryPreferences = z.infer<typeof discoveryPreferencesSchema>;

export const updateDiscoveryPreferencesSchema = z.object({
  genders: z.array(z.enum(['MALE', 'FEMALE'])).min(1).max(2),
  intents: z.array(z.enum(['TRAINING', 'FRIENDSHIP', 'DATING'])).min(1).max(3),
  minAge: z.number().int().min(18).max(100),
  maxAge: z.number().int().min(18).max(100),
  radiusKm: z.number().min(1).max(500),
  flexibleAge: z.boolean(),
  flexibleDistance: z.boolean(),
  expectedVersion: z.number().int().nonnegative(),
}).refine((value) => value.maxAge >= value.minAge);
export type UpdateDiscoveryPreferencesInput = z.infer<typeof updateDiscoveryPreferencesSchema>;

export const gymDirectoryEntrySchema = z.object({
  userId: z.string().uuid(),
  /** Present only for cards issued by the discovery deck. */
  impressionId: z.string().uuid().optional(),
  /** Nombre corto: "Ana P.", nunca el nombre completo del directorio. */
  displayName: z.string(),
  objetivo: z.string().nullable(),
  branchId: z.string().uuid().nullable(),
  branchName: z.string().nullable(),
  connectionStatus: z.enum(directoryConnectionStatuses),
  connectionId: z.string().uuid().nullable(),
  /** Solo llega si hay conexión aceptada y la otra persona lo marcó visible. */
  socialStatus: z.enum(socialStatusValues).nullable(),
  /**
   * Su primera foto de perfil, o `null` si no subió ninguna.
   *
   * Es `photos[0]`. Se mantiene aparte porque hay superficies —la tira de
   * conexiones, el avatar del chat— que sólo necesitan la portada y no deben
   * cargar con la galería.
   */
  photoUrl: z.string().nullable(),
  /**
   * La galería completa, en el orden en que la persona la ordenó, hasta 6.
   * Es lo que recorre el carrusel de la tarjeta de descubrimiento.
   */
  photos: z.array(z.object({ id: z.string().uuid(), url: z.string() })),
  /** Años. Nulo mientras la persona no haya registrado sus medidas. */
  age: z.number().int().nullable(),
  gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).nullable(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).nullable(),
  points: z.number().nullable(),
  levelCode: z.string().nullable(),
});
export type GymDirectoryEntry = z.infer<typeof gymDirectoryEntrySchema>;

/**
 * Una insignia del perfil de otra persona.
 *
 * El perfil ajeno solo lista las conseguidas —mirar a alguien no puede revelar
 * lo que le falta—, así que `earned` es literal `true` y `earnedAt` nunca es
 * nulo. El resto de campos son los mismos que en la propia senda, para poder
 * pintar la misma tarjeta sin inventar una variante.
 */
export const earnedBadgeSchema = progressionBadgeSchema
  .omit({ earned: true, earnedAt: true, isNew: true, progress: true, progressLabel: true })
  .extend({ earned: z.literal(true), earnedAt: z.string() });
export type EarnedBadge = z.infer<typeof earnedBadgeSchema>;

/** `GET /me/gym-directory/:userId`: la entrada del directorio más lo ganado. */
export const memberProfileSchema = gymDirectoryEntrySchema.extend({
  badges: z.array(earnedBadgeSchema),
});
export type MemberProfile = z.infer<typeof memberProfileSchema>;

/** Derecha es «me gusta», izquierda es «paso». No hay una tercera dirección. */
export const swipeDirections = ['LIKE', 'PASS'] as const;
export type SwipeDirection = (typeof swipeDirections)[number];

/**
 * Resultado de un swipe. `matched` es lo que dispara el modal de «¡Match!»;
 * `connectionId` es nulo cuando el swipe fue un «paso», porque un paso no crea
 * ninguna conexión.
 */
export const swipeResultSchema = z.object({
  direction: z.enum(swipeDirections),
  targetId: z.string().uuid(),
  matched: z.boolean(),
  connectionId: z.string().uuid().nullable(),
});
export type SwipeResult = z.infer<typeof swipeResultSchema>;

/** Resultado de deshacer el último swipe; `unmatched` dice si deshizo un match. */
export const undoSwipeResultSchema = z.object({
  undone: z.enum(swipeDirections),
  targetId: z.string().uuid(),
  connectionId: z.string().uuid().nullable(),
  unmatched: z.boolean(),
});
export type UndoSwipeResult = z.infer<typeof undoSwipeResultSchema>;

/** `null` para un chat normal entre socios; fija el chat arriba de la lista. */
export const systemConversationKinds = ['CORPORATE', 'TENANT_ADMIN'] as const;
export type SystemConversationKind = (typeof systemConversationKinds)[number];

export const conversationSummarySchema = z.object({
  conversationId: z.string().uuid(),
  otherUserId: z.string().uuid(),
  otherUserName: z.string(),
  otherUserPhotoUrl: z.string().nullable(),
  otherUserOnline: z.boolean(),
  otherUserLastSeenAt: z.string().nullable(),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  /** `false` en un chat de sistema de solo lectura: el compositor debe ocultarse. */
  canWrite: z.boolean(),
  systemKind: z.enum(systemConversationKinds).nullable(),
  /** Apodo propio para esta conversación (privado), o `null` si no se puso ninguno. */
  nickname: z.string().nullable(),
  /** Cursores del otro participante: comparar contra `createdAt` de los mensajes propios para pintar el check. */
  otherUserLastDeliveredAt: z.string().nullable(),
  otherUserLastReadAt: z.string().nullable(),
  otherUserReadReceiptsSinceAt: z.string().nullable(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const messageTypes = ['text', 'image', 'video', 'audio', 'location'] as const;
export type MessageType = (typeof messageTypes)[number];

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().nullable(),
  type: z.enum(messageTypes),
  storyReference: z.object({ storyId: z.string().uuid(), available: z.boolean() }).nullable(),
  /** `null` si es vista única y todavía no se abre (o ya se abrió). */
  mediaUrl: z.string().nullable(),
  mediaMimeType: z.string().nullable(),
  viewOnce: z.boolean(),
  viewed: z.boolean(),
  locationLat: z.number().nullable(),
  locationLng: z.number().nullable(),
  createdAt: z.string(),
  editedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
});

export const trainingInviteAcceptedEventSchema = z.object({
  kind: z.literal('TRAINING_INVITE_ACCEPTED'),
  invitationId: z.string().uuid(),
  acceptedRevision: z.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }),
  timeZone: z.string().min(1),
  placeLabel: z.string(),
  cancelledAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const systemMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.null(),
  type: z.literal('system'),
  systemEvent: trainingInviteAcceptedEventSchema,
  // Shared optional fields keep consumers able to inspect common message
  // metadata before narrowing by `type`; the server omits them on system rows.
  body: z.null().optional(),
  storyReference: z.null().optional(),
  mediaUrl: z.null().optional(),
  mediaMimeType: z.null().optional(),
  viewOnce: z.boolean().optional(),
  viewed: z.boolean().optional(),
  locationLat: z.null().optional(),
  locationLng: z.null().optional(),
  createdAt: z.string(),
  editedAt: z.null().optional(),
  deletedAt: z.null().optional(),
});

/** Un mensaje normal o un evento de sistema de solo lectura en el historial. */
export const messageSchema = z.union([chatMessageSchema, systemMessageSchema]);
export type Message = z.infer<typeof messageSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const readReceiptSettingsSchema = z.object({
  enabled: z.boolean(),
  defaultEnabled: z.boolean(),
  conversationOverride: z.boolean().nullable(),
  version: z.number().int().nonnegative(),
});
export type ReadReceiptSettings = z.infer<typeof readReceiptSettingsSchema>;

export const updateReadReceiptSettingsSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('ALL'), enabled: z.boolean(), expectedVersion: z.number().int().nonnegative() }),
  z.object({ scope: z.literal('CONVERSATION'), conversationId: z.string().uuid(), enabled: z.boolean(), expectedVersion: z.number().int().nonnegative() }),
  z.object({ scope: z.literal('SELECTED'), conversationIds: z.array(z.string().uuid()).min(1).max(100), enabled: z.boolean(), expectedVersion: z.number().int().nonnegative() }),
]);
export type UpdateReadReceiptSettingsInput = z.infer<typeof updateReadReceiptSettingsSchema>;

export const startConversationResponseSchema = z.object({
  conversationId: z.string().uuid(),
});
export type StartConversationResponse = z.infer<typeof startConversationResponseSchema>;

/** Boleto de un solo uso para el handshake del socket de `/chat` — nunca el JWT real. */
export const socketTicketSchema = z.object({ ticket: z.string() });
export type SocketTicket = z.infer<typeof socketTicketSchema>;


/**
 * Interacciones recibidas y enviadas: quién me dio like, a quién le di like,
 * quién me descartó y a quién descarté.
 *
 * Las cuatro devuelven la **misma ficha** que la baraja (`gymDirectoryEntry`)
 * más la marca de tiempo de la interacción, para que la tarjeta se pinte con
 * un único componente en vez de con cuatro variantes que se desincronizan.
 */
export const likeReceivedSchema = gymDirectoryEntrySchema.extend({
  /** La solicitud pendiente que hay que aceptar o rechazar. */
  connectionId: z.string().uuid(),
  likedAt: z.string(),
});
export type LikeReceived = z.infer<typeof likeReceivedSchema>;

export const likeSentSchema = gymDirectoryEntrySchema.extend({
  /** La solicitud que se puede retirar mientras siga pendiente. */
  connectionId: z.string().uuid(),
  likedAt: z.string(),
});
export type LikeSent = z.infer<typeof likeSentSchema>;

/** Un descarte. `passedAt` es cuándo ocurrió; no hay estados intermedios. */
export const discoveryPassEntrySchema = gymDirectoryEntrySchema.extend({
  passedAt: z.string(),
});
export type DiscoveryPassEntry = z.infer<typeof discoveryPassEntrySchema>;

/** Contadores de la cabecera de Interacciones y del badge de la pestaña. */
export const interactionCountsSchema = z.object({
  likesReceived: z.number().int().min(0),
  likesSent: z.number().int().min(0),
  passesReceived: z.number().int().min(0),
  passesSent: z.number().int().min(0),
  /** Espectadores únicos que aún no se han revisado. */
  profileViewsNew: z.number().int().min(0),
});
export type InteractionCounts = z.infer<typeof interactionCountsSchema>;
