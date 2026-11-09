import type { ChatMessage, Message } from '@gymsheet/schemas';

/**
 * Envío optimista: la burbuja aparece en cuanto se pulsa «enviar», como en
 * WhatsApp, en vez de esperar la ida y vuelta al servidor. Cada mensaje
 * pendiente usa su `clientRequestId` como id provisional; cuando el servidor
 * devuelve el mensaje real (por el socket o por la respuesta HTTP) se casan
 * por ese id y la burbuja provisional desaparece sin parpadeo.
 */
export type PendingMessage = ChatMessage & { clientRequestId: string };

type PendingBase = {
  clientRequestId: string;
  conversationId: string;
  senderId: string;
  replyTo?: Message | null;
  now?: Date;
};

function replyFieldsFor(target: Message | null | undefined): Pick<ChatMessage, 'replyTo'> {
  if (!target || target.type === 'system') return {};
  return {
    replyTo: {
      messageId: target.id,
      senderId: target.senderId,
      type: target.type,
      body: target.viewOnce ? null : target.body,
      available: true,
    },
  };
}

function pendingBase({ clientRequestId, conversationId, senderId, replyTo, now = new Date() }: PendingBase): PendingMessage {
  return {
    id: clientRequestId,
    clientRequestId,
    conversationId,
    senderId,
    body: null,
    type: 'text',
    storyReference: null,
    mediaUrl: null,
    mediaMimeType: null,
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
    createdAt: now.toISOString(),
    ...replyFieldsFor(replyTo),
  };
}

export function pendingTextMessage(input: PendingBase & { body: string }): PendingMessage {
  return { ...pendingBase(input), type: 'text', body: input.body };
}

/** `localUri` es el archivo recién grabado: quien envía puede escucharlo mientras sube. */
export function pendingAudioMessage(input: PendingBase & { localUri: string; viewOnce: boolean }): PendingMessage {
  return {
    ...pendingBase(input),
    type: 'audio',
    mediaUrl: input.localUri,
    mediaMimeType: 'audio/mp4',
    viewOnce: input.viewOnce,
  };
}

function confirmedKeys(confirmed: readonly Message[]): Set<string> {
  const keys = new Set<string>();
  for (const message of confirmed) {
    if (message.type !== 'system' && message.clientRequestId) keys.add(message.clientRequestId);
  }
  return keys;
}

/**
 * Quita los pendientes que ya llegaron confirmados. Con un servidor que no
 * devuelve `clientRequestId`, la pantalla quita el pendiente al recibir la
 * respuesta HTTP (`withoutPending`).
 */
export function unconfirmedPending(pending: readonly PendingMessage[], confirmed: readonly Message[]): PendingMessage[] {
  if (pending.length === 0) return [];
  const keys = confirmedKeys(confirmed);
  return pending.filter((message) => !keys.has(message.clientRequestId));
}

export function isPendingMessage(message: Message, pendingIds: ReadonlySet<string>): boolean {
  return message.type !== 'system' && pendingIds.has(message.id);
}

export function withoutPending(pending: readonly PendingMessage[], clientRequestId: string): PendingMessage[] {
  return pending.filter((message) => message.clientRequestId !== clientRequestId);
}
