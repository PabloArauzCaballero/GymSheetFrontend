import type { Message } from '@gymsheet/schemas';
import { canEditMessage } from './chat-message-edit';

/** Igual que el backend y que WhatsApp: «Eliminar para todos» dura unos dos días (60 h). */
export const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 60 * 1000;

export type MessageAction = 'reply' | 'forward' | 'copy' | 'edit' | 'delete' | 'report';

export function isTombstone(message: Message, deletedMessageIds: ReadonlySet<string>): boolean {
  return message.type !== 'system' && (Boolean(message.deletedAt) || deletedMessageIds.has(message.id));
}

export function canDeleteForEveryone(message: Message, currentUserId: string, now = new Date()): boolean {
  if (message.type === 'system' || message.deletedAt || message.senderId !== currentUserId) return false;
  const age = now.getTime() - new Date(message.createdAt).getTime();
  return age >= 0 && age <= DELETE_FOR_EVERYONE_WINDOW_MS;
}

/**
 * Lo que ofrece el menú al mantener pulsado un mensaje, en el orden de
 * WhatsApp. Un mensaje ya eliminado solo se puede quitar de la vista propia.
 */
export function messageActions(
  message: Message,
  currentUserId: string,
  options: { canWrite: boolean; tombstone: boolean; now?: Date },
): MessageAction[] {
  if (message.type === 'system') return [];
  if (options.tombstone) return ['delete'];
  const mine = message.senderId === currentUserId;
  const actions: MessageAction[] = [];
  if (options.canWrite) actions.push('reply');
  if (canForward(message)) actions.push('forward');
  if (message.type === 'text' && message.body) actions.push('copy');
  if (mine && options.canWrite && canEditMessage(message, currentUserId, options.now)) actions.push('edit');
  actions.push('delete');
  if (!mine) actions.push('report');
  return actions;
}

/** Lo de vista única no se reenvía (el servidor también lo rechaza); un mensaje eliminado tampoco. */
export function canForward(message: Message): boolean {
  if (message.type === 'system' || message.deletedAt || message.viewOnce) return false;
  if (message.type === 'text') return Boolean(message.body);
  return message.type === 'location' || Boolean(message.mediaUrl);
}

export function tombstoneLabel(mine: boolean): string {
  return mine ? 'Eliminaste este mensaje' : 'Se eliminó este mensaje';
}
