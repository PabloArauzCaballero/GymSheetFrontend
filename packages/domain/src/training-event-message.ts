export type TrainingInviteAcceptedDisplay = {
  startsAt: string;
  timeZone: string;
  placeLabel: string;
  cancelledAt?: string | null;
};

export function trainingInviteAcceptedMessage(
  event: TrainingInviteAcceptedDisplay,
): string {
  const date = new Date(event.startsAt);
  let localDateTime: string;
  try {
    localDateTime = new Intl.DateTimeFormat("es-BO", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: event.timeZone,
    }).format(date);
  } catch {
    localDateTime = new Intl.DateTimeFormat("es-BO", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  }

  return event.cancelledAt
    ? `Entrenamiento cancelado: estaba previsto para ${localDateTime} en ${event.placeLabel}.`
    : `Entrenamiento acordado para ${localDateTime} en ${event.placeLabel}.`;
}
