import { trainingInviteAcceptedMessage, type TrainingInviteAcceptedDisplay } from './training-event-message';

/** Lo mínimo que hace falta de un aviso de sistema del chat para escribirlo. */
export type ChatSystemEventDisplay =
  | ({ kind: 'TRAINING_INVITE_ACCEPTED' } & TrainingInviteAcceptedDisplay)
  | { kind: 'DISAPPEARING_MESSAGES_CHANGED'; seconds: number | null; changedByUserId: string | null };

/** «24 horas», «7 días», «90 días»: el nombre corto de una duración de mensajes temporales. */
export function disappearingDurationLabel(seconds: number): string {
  if (seconds % 86_400 !== 0) return `${Math.round(seconds / 3_600)} horas`;
  const days = seconds / 86_400;
  if (days === 1) return '24 horas';
  return `${days} días`;
}

/**
 * Texto del aviso que se intercala en el hilo. `viewerId` decide la persona
 * («Activaste…» frente a «Tu contacto activó…»); `otherName` la nombra si se
 * conoce, como hace WhatsApp.
 */
export function chatSystemEventMessage(
  event: ChatSystemEventDisplay,
  viewerId?: string | null,
  otherName?: string | null,
): string {
  if (event.kind === 'TRAINING_INVITE_ACCEPTED') return trainingInviteAcceptedMessage(event);
  if (!viewerId) {
    // Sin saber quién mira, sin persona: nunca «Tu contacto» para un cambio propio.
    return event.seconds === null
      ? 'Se desactivaron los mensajes temporales.'
      : `Se activaron los mensajes temporales. Los mensajes nuevos desaparecerán después de ${disappearingDurationLabel(event.seconds)}.`;
  }
  const mine = event.changedByUserId === viewerId;
  const who = mine ? null : (otherName?.trim() || 'Tu contacto');
  if (event.seconds === null) {
    return mine ? 'Desactivaste los mensajes temporales.' : `${who} desactivó los mensajes temporales.`;
  }
  const duration = disappearingDurationLabel(event.seconds);
  return mine
    ? `Activaste los mensajes temporales. Los mensajes nuevos desaparecerán después de ${duration}.`
    : `${who} activó los mensajes temporales. Los mensajes nuevos desaparecerán después de ${duration}.`;
}
