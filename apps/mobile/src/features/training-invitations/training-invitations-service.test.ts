import assert from "node:assert/strict";
import test from "node:test";
import {
  createTrainingInviteInputSchema,
  formatInvitationLocalTime,
  groupTrainingInvitations,
  listedTrainingInvitationSchema,
  localInviteTime,
  respondTrainingInviteInputSchema,
  respondedTrainingInvitationSchema,
  sharedSessionSnapshotSchema,
  trainingInvitationSchema,
} from "./training-invitations-contract.ts";

const actorId = "11111111-1111-4111-8111-111111111111";
const recipientId = "22222222-2222-4222-8222-222222222222";

test("localInviteTime emits an RFC3339 time with the device offset", () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startsAt = localInviteTime("2030-06-02", "14:30", zone);
  assert.match(startsAt, /^2030-06-02T14:30:00[+-]\d{2}:\d{2}$/u);
  assert.equal(
    new Date(startsAt).getTime(),
    new Date(2030, 5, 2, 14, 30).getTime(),
  );
});

test("localInviteTime rejects malformed and normalized-away local times", () => {
  assert.throws(
    () => localInviteTime("2030-02-30", "14:30", "UTC"),
    /hora local no existe/u,
  );
  assert.throws(
    () => localInviteTime("2030-06-02", "2:30", "UTC"),
    /fecha y hora válidas/u,
  );
  assert.throws(
    () => localInviteTime("2020-06-02", "14:30", "UTC"),
    /fecha y hora futuras/u,
  );
});

test("create payload is exact and the server DTO is parsed", () => {
  const input = createTrainingInviteInputSchema.parse({
    recipientId,
    startsAt: "2030-06-02T14:30:00.000Z",
    timeZone: "UTC",
    durationMinutes: 60,
    place: { kind: "PUBLIC_PLACE", label: "Parque Central" },
    mode: "OWN_ROUTINES",
    clientRequestId: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(input.recipientId, recipientId);
  assert.throws(() =>
    createTrainingInviteInputSchema.parse({ ...input, inviteId: actorId }),
  );

  const output = trainingInvitationSchema.parse({
    id: actorId,
    state: "PENDING",
    currentRevision: 1,
    revisions: [
      {
        revision: 1,
        proposerId: actorId,
        startsAt: "2030-06-02T14:30:00.000Z",
        timeZone: "UTC",
        durationMinutes: 60,
        place: { kind: "PUBLIC_PLACE", label: "Parque Central" },
        mode: "OWN_ROUTINES",
        createdAt: "2030-06-01T14:30:00.000Z",
      },
    ],
    participants: [actorId, recipientId],
    createdAt: "2030-06-01T14:30:00.000Z",
    updatedAt: "2030-06-01T14:30:00.000Z",
  });
  assert.equal(output.id, actorId);
});

test("shared-session invitations require an owned routine and expose only the agreed prescription", () => {
  const routineId = "44444444-4444-4444-8444-444444444444";
  const input = createTrainingInviteInputSchema.parse({
    recipientId,
    startsAt: "2030-06-02T14:30:00.000Z",
    timeZone: "UTC",
    durationMinutes: 60,
    place: { kind: "PUBLIC_PLACE", label: "Parque Central" },
    mode: "SHARED_SESSION",
    routineSessionId: routineId,
    clientRequestId: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(input.routineSessionId, routineId);
  assert.throws(() =>
    createTrainingInviteInputSchema.parse({
      ...input,
      routineSessionId: undefined,
    }),
  );
  const snapshot = sharedSessionSnapshotSchema.parse({
    inviteId: actorId,
    routineId,
    revision: 1,
    name: "Rutina compartida",
    exercises: [
      {
        exerciseId: "55555555-5555-4555-8555-555555555555",
        exerciseName: "Press de banca",
        order: 1,
        targetSets: 3,
        repsMin: 8,
        repsMax: 12,
        restSeconds: 90,
      },
    ],
  });
  assert.equal(snapshot.exercises[0]?.exerciseName, "Press de banca");
  assert.throws(() =>
    sharedSessionSnapshotSchema.parse({ ...snapshot, privateNote: "no" }),
  );
});

test("list validates current meeting and response while accepting uses the current revision", () => {
  const base = trainingInvitationSchema.parse({
    id: actorId,
    state: "ACCEPTED",
    currentRevision: 2,
    revisions: [
      {
        revision: 2,
        proposerId: recipientId,
        startsAt: "2030-06-02T14:30:00.000Z",
        timeZone: "UTC",
        durationMinutes: 60,
        place: { kind: "PUBLIC_PLACE", label: "Parque Central" },
        mode: "OWN_ROUTINES",
        createdAt: "2030-06-01T14:30:00.000Z",
      },
    ],
    participants: [actorId, recipientId],
    createdAt: "2030-06-01T14:30:00.000Z",
    updatedAt: "2030-06-01T14:30:00.000Z",
  });
  const response = {
    decision: "ACCEPT",
    respondedBy: actorId,
    revision: 2,
    respondedAt: "2030-06-01T14:31:00.000Z",
  };
  const meeting = {
    id: "44444444-4444-4444-8444-444444444444",
    acceptedRevision: 2,
    startsAt: "2030-06-02T14:30:00.000Z",
    timeZone: "UTC",
    placeLabel: "Parque Central",
    cancelledAt: null,
  };
  assert.equal(
    listedTrainingInvitationSchema.parse({ ...base, response, meeting }).meeting
      ?.acceptedRevision,
    2,
  );
  assert.equal(
    respondedTrainingInvitationSchema.parse({ ...base, response }).response
      ?.decision,
    "ACCEPT",
  );
  assert.equal(
    respondedTrainingInvitationSchema.parse({
      ...base,
      state: "DECLINED",
      response: { ...response, decision: "DECLINE" },
    }).response?.decision,
    "DECLINE",
  );
  assert.throws(() =>
    listedTrainingInvitationSchema.parse({ ...base, response }),
  );
  assert.throws(() =>
    respondedTrainingInvitationSchema.parse({ ...base, response, meeting }),
  );
  assert.deepEqual(
    respondTrainingInviteInputSchema.parse({
      expectedRevision: base.revisions[0]!.revision,
      decision: "ACCEPT",
      clientRequestId: "33333333-3333-4333-8333-333333333333",
    }).expectedRevision,
    2,
  );
  assert.equal(
    respondTrainingInviteInputSchema.parse({
      expectedRevision: 2,
      decision: "DECLINE",
      clientRequestId: "33333333-3333-4333-8333-333333333333",
    }).decision,
    "DECLINE",
  );
});

test("agenda displays the same instant in the device time zone", () => {
  const startsAt = "2030-06-02T14:30:00.000Z";
  assert.equal(
    formatInvitationLocalTime(startsAt, "es-BO"),
    new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(startsAt)),
  );
});

test("agenda keeps cancelled meetings and sorts by start while pending stays separate", () => {
  const base = trainingInvitationSchema.parse({
    id: actorId,
    state: "PENDING",
    currentRevision: 1,
    revisions: [
      {
        revision: 1,
        proposerId: actorId,
        startsAt: "2030-06-03T14:30:00.000Z",
        timeZone: "UTC",
        durationMinutes: 60,
        place: { kind: "PUBLIC_PLACE", label: "Parque Central" },
        mode: "OWN_ROUTINES",
        createdAt: "2030-06-01T14:30:00.000Z",
      },
    ],
    participants: [actorId, recipientId],
    createdAt: "2030-06-01T14:30:00.000Z",
    updatedAt: "2030-06-01T14:30:00.000Z",
  });
  const pending = listedTrainingInvitationSchema.parse({
    ...base,
    response: null,
    meeting: null,
  });
  const later = listedTrainingInvitationSchema.parse({
    ...base,
    id: "44444444-4444-4444-8444-444444444444",
    state: "ACCEPTED",
    response: null,
    meeting: {
      id: "55555555-5555-4555-8555-555555555555",
      acceptedRevision: 1,
      startsAt: "2030-06-04T14:30:00.000Z",
      timeZone: "UTC",
      placeLabel: "Parque Central",
      cancelledAt: null,
    },
  });
  const cancelled = listedTrainingInvitationSchema.parse({
    ...base,
    id: "66666666-6666-4666-8666-666666666666",
    state: "CANCELLED",
    response: null,
    meeting: {
      ...later.meeting,
      id: "77777777-7777-4777-8777-777777777777",
      startsAt: "2030-06-02T14:30:00.000Z",
      cancelledAt: "2030-06-01T18:30:00.000Z",
    },
  });
  const history = listedTrainingInvitationSchema.parse({
    ...base,
    id: "88888888-8888-4888-8888-888888888888",
    state: "EXPIRED",
    response: null,
    meeting: null,
  });
  const groups = groupTrainingInvitations([later, pending, history, cancelled]);
  assert.deepEqual(
    groups.pending.map((item) => item.id),
    [pending.id],
  );
  assert.deepEqual(
    groups.agenda.map((item) => item.id),
    [cancelled.id, later.id],
  );
  assert.deepEqual(
    groups.history.map((item) => item.id),
    [history.id],
  );
});
