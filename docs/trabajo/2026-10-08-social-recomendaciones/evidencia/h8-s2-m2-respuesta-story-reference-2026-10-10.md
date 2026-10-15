# H8.S2.M2 — Respuesta de story con referencia (2026-10-10)

El backend expone `POST /me/stories/:storyId/replies` con `{ text, requestId }`. Revalida que la story siga visible para quien responde y no sea propia; abre o reutiliza el chat directo autorizado con el autor. Guarda el texto como mensaje de chat junto con `story_id`, y proyecta `storyReference: { storyId } | null` en la respuesta, historial y evento entrante. La columna no tiene FK para que la referencia sobreviva a la expiración/purga y M3 pueda presentarla como no disponible.

Web y móvil permiten responder desde la story ajena. Cada reintento del mismo texto conserva su `requestId`; al aceptar, ambos abren el chat devuelto y buscan/enfocan el mensaje devuelto, incluso en páginas anteriores. Los envíos genéricos de chat no aceptan referencias proporcionadas por el cliente: la referencia solo la crea el endpoint autorizado de replies.

## Verificación

- PostgreSQL 16 temporal aislado en `127.0.0.1:55432/gymsheet_social_qa`; `yarn migration:up` aplicó `202610100002-chat-message-story-reference`.
- `yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S2.M2' --runInBand` — PASS, 1/1. La respuesta contiene el texto y `storyReference`; SQL confirma `story_id` persistido y el autor recibe la misma referencia en su historial.
- `yarn type-check` — PASS.
- ESLint dirigido a servicio stories, servicio/repositorio/mapper/fingerprint de chat, migración y E2E — PASS.
- `git diff --check` — PASS.
- Web y móvil: type-check PASS; ESLint focal PASS. Pruebas web focales de replies, burbuja, navegación/foco, paginación y allowlist BFF — 82/82 PASS.
- Regresiones móviles dirigidas del visor y chat — `test:stories` 4/4 y `test:chat-audio` 6/6 PASS.

No hubo PAIR ni recepción en dos dispositivos. La referencia se presenta como “Respuesta a una story”; el estado visible de story expirada queda para H8.S2.M3. H8.S2.M3/M4 siguen pendientes.
