# H8.S2.M1 — Reacción idempotente en chat (2026-10-10)

El endpoint `POST /me/stories/:id/reactions` valida que la story siga visible para quien reacciona y que no sea propia. Reutiliza o crea el chat directo autorizado con el autor, y guarda la reacción como mensaje de chat con `requestId` en `clientRequestId`.

## Verificación

- PostgreSQL 16 temporal aislado en `127.0.0.1:55432/gymsheet_social_qa`, migraciones de la suite aplicadas.
- `yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S2.M1' --runInBand` — PASS, 1/1. Dos POST con el mismo `requestId` devuelven el mismo ID de mensaje y conversación; SQL confirma una sola fila para `(conversation_id, sender_id, client_request_id)`.
- `yarn type-check` — PASS.
- ESLint dirigido a `story-reactions.service.ts`, `stories.controller.ts`, `stories.module.ts` y `historias.e2e-spec.ts` — PASS.
- `git diff --check` — PASS.

El E2E está dentro de la suite de historias que también contiene aserciones H8.S1.M2/M4. No prueba la recepción en dos dispositivos ni completa H8.S2.M2–M4; esos casos y PAIR siguen pendientes.
