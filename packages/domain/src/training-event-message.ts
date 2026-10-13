export type TrainingInviteAcceptedDisplay = {
  startsAt: string;
  timeZone: string;
  placeLabel: string;
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

  return `Coordinaron un entrenamiento para ${localDateTime} en ${event.placeLabel}.`;
}
