import { z } from "zod";

export const createTrainingInviteInputSchema = z
  .object({
    recipientId: z.string().uuid(),
    startsAt: z.string().datetime({ offset: true }),
    timeZone: z.string().min(1).max(80),
    durationMinutes: z.number().int().min(15).max(360),
    place: z
      .object({
        kind: z.literal("PUBLIC_PLACE"),
        label: z.string().trim().min(2).max(180),
      })
      .strict(),
    mode: z.enum(["OWN_ROUTINES", "SHARED_SESSION"]),
    routineSessionId: z.string().uuid().optional(),
    note: z.string().trim().max(1000).optional(),
    clientRequestId: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "SHARED_SESSION" && !value.routineSessionId) {
      context.addIssue({
        code: "custom",
        message: "Elige la rutina que quieres compartir.",
        path: ["routineSessionId"],
      });
    }
  });

export const sharedSessionSnapshotSchema = z
  .object({
    inviteId: z.string().uuid(),
    routineId: z.string().uuid(),
    revision: z.number().int().positive(),
    name: z.string(),
    exercises: z.array(
      z
        .object({
          exerciseId: z.string().uuid(),
          exerciseName: z.string(),
          order: z.number().int(),
          targetSets: z.number().int(),
          repsMin: z.number().int().nullable(),
          repsMax: z.number().int().nullable(),
          restSeconds: z.number().int().nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export type SharedSessionSnapshot = z.infer<typeof sharedSessionSnapshotSchema>;

export type CreateTrainingInviteInput = z.infer<
  typeof createTrainingInviteInputSchema
>;

export const trainingInvitationSchema = z
  .object({
    id: z.string().uuid(),
    state: z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"]),
    currentRevision: z.number().int().positive(),
    revisions: z
      .array(
        z
          .object({
            revision: z.number().int().positive(),
            proposerId: z.string().uuid(),
            startsAt: z.string().datetime({ offset: true }),
            timeZone: z.string(),
            durationMinutes: z.number().int().min(15).max(360),
            place: z
              .object({
                kind: z.enum(["GYM", "PUBLIC_PLACE"]),
                placeId: z.string().uuid().optional(),
                label: z.string(),
              })
              .strict(),
            mode: z.enum(["OWN_ROUTINES", "SHARED_SESSION"]),
            routineSessionId: z.string().uuid().optional(),
            note: z.string().optional(),
            createdAt: z.string().datetime({ offset: true }),
          })
          .strict(),
      )
      .min(1),
    participants: z.array(z.string().uuid()).length(2),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type TrainingInvitation = z.infer<typeof trainingInvitationSchema>;

const trainingMeetingSchema = z
  .object({
    id: z.string().uuid(),
    acceptedRevision: z.number().int().positive(),
    startsAt: z.string().datetime({ offset: true }),
    timeZone: z.string(),
    placeLabel: z.string(),
    cancelledAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

const trainingResponseSchema = z
  .object({
    decision: z.enum(["ACCEPT", "DECLINE"]),
    respondedBy: z.string().uuid(),
    revision: z.number().int().positive(),
    respondedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .nullable();

export const listedTrainingInvitationSchema = trainingInvitationSchema.extend({
  response: trainingResponseSchema,
  meeting: trainingMeetingSchema.nullable(),
});
export type ListedTrainingInvitation = z.infer<
  typeof listedTrainingInvitationSchema
>;

export function groupTrainingInvitations(items: ListedTrainingInvitation[]) {
  const pending: ListedTrainingInvitation[] = [];
  const agenda: ListedTrainingInvitation[] = [];
  const history: ListedTrainingInvitation[] = [];
  for (const item of items) {
    if (item.state === "PENDING") pending.push(item);
    else if (item.meeting) agenda.push(item);
    else history.push(item);
  }
  // El servicio entrega pendientes e historial por updatedAt DESC. La agenda
  // sirve para planificar y por eso muestra primero el próximo encuentro.
  agenda.sort(
    (a, b) => Date.parse(a.meeting!.startsAt) - Date.parse(b.meeting!.startsAt),
  );
  return { pending, agenda, history };
}

export const respondTrainingInviteInputSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    decision: z.enum(["ACCEPT", "DECLINE"]),
    clientRequestId: z.string().uuid(),
  })
  .strict();
export type RespondTrainingInviteInput = z.infer<
  typeof respondTrainingInviteInputSchema
>;

export const respondedTrainingInvitationSchema =
  trainingInvitationSchema.extend({
    response: trainingResponseSchema,
  });

export function formatInvitationLocalTime(
  startsAt: string,
  locale = "es-BO",
): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime()))
    throw new Error("La fecha de la invitación no es válida.");
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function localInviteTime(
  dateValue: string,
  timeValue: string,
  timeZone: string,
): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/u.exec(timeValue);
  if (!dateMatch || !timeMatch)
    throw new Error("Completa una fecha y hora válidas.");
  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    local.getFullYear() !== year ||
    local.getMonth() + 1 !== month ||
    local.getDate() !== day ||
    local.getHours() !== hour ||
    local.getMinutes() !== minute
  )
    throw new Error(
      "Esa hora local no existe por el cambio horario. Elige otra.",
    );
  if (local.getTime() <= Date.now())
    throw new Error("Elige una fecha y hora futuras.");

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(local);
  } catch {
    throw new Error("No se pudo determinar la zona horaria local.");
  }

  const minutesEastOfUtc = -local.getTimezoneOffset();
  const sign = minutesEastOfUtc >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(minutesEastOfUtc);
  const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, "0")}:${String(absoluteOffset % 60).padStart(2, "0")}`;
  return `${dateValue}T${timeValue}:00${offset}`;
}
