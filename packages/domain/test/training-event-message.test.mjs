import test from "node:test";
import assert from "node:assert/strict";
import { trainingInviteAcceptedMessage } from "../src/training-event-message.ts";

test("formats the agreed training using the event timezone and place without a person attribution", () => {
  const line = trainingInviteAcceptedMessage({
    startsAt: "2026-10-11T15:00:00.000Z",
    timeZone: "America/La_Paz",
    placeLabel: "Gimnasio Central",
  });

  assert.match(line, /Entrenamiento acordado para/);
  assert.match(line, /11 de octubre de 2026/);
  assert.match(line, /11:00/);
  assert.match(line, /Gimnasio Central\.$/);
  assert.doesNotMatch(line, /\b(yo|tú|él|ella|sender|usuario)\b/i);
});

test("falls back to device local formatting when the server timezone is invalid", () => {
  const line = trainingInviteAcceptedMessage({
    startsAt: "2026-10-11T15:00:00.000Z",
    timeZone: "invalid-zone",
    placeLabel: "Gimnasio Central",
  });

  assert.match(line, /Entrenamiento acordado para/);
  assert.match(line, /Gimnasio Central\.$/);
});
