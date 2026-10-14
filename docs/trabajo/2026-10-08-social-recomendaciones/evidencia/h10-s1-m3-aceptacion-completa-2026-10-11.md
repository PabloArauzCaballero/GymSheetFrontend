# H10.S1.M3 — aceptación atómica con encuentro y evento de chat

Fecha: 2026-10-11. Resultado: **PASS en PostgreSQL QA local**.

## Implementación

La aceptación persiste el estado `ACCEPTED`, el comando idempotente, el encuentro, la conversación directa y el evento `TRAINING_INVITE_ACCEPTED` dentro de la misma transacción. La migración `202610110005-training-invite-meetings-chat-events` añade claves foráneas y unicidad por invitación para evitar encuentros o eventos duplicados. El historial convierte el evento en `type: "system"` con `senderId: null`; web y móvil muestran una línea de solo lectura con fecha/zona y lugar.

## Verificación

- E2E focal `H10.S1.M3`: PASS 1/1.
- Regresión E2E `H10.S1` (M3 + M4): PASS 2/2.
- Dos aceptaciones concurrentes con la misma clave devuelven la aceptación guardada; SQL confirma un estado aceptado, un comando, una revisión, un encuentro y un evento, con dos participantes en la conversación.
- Ambos participantes leen por `GET /me/conversations/:id/messages` el evento esperado (`senderId: null`, revisión 1, fecha UTC, zona `America/New_York` y lugar `Parque Central`). La paginación por fecha conserva el evento en la página anterior.
- Un trigger de prueba fuerza fallo al insertar el evento. El E2E confirma que se revierten estado, comando, encuentro, evento y conversación; luego elimina el trigger.
- Revisiones append-only siguen rechazando `UPDATE` y `DELETE` directos.
- Backend type-check, ESLint focal y `git diff --check`: PASS. Web: 24/24 tests focales y type-check PASS. Móvil: 33/33 pruebas dirigidas y type-check PASS.
- Limpieza PostgreSQL posterior: `h10_invite_test_users=0`, `orphan_meetings=0`, `orphan_chat_events=0`, `orphan_invite_commands=0`.

Comando E2E usado: `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa corepack yarn test:e2e --runTestsByPath test/social/entrenar-juntos.e2e-spec.ts -t 'H10.S1'` (desde `GymSheetBackend`). La traza `forced H10 M3 rollback` durante el E2E es el fallo inyectado esperado; la suite termina PASS.

## Límites

El evento aparece al consultar el historial, pero no tiene publicación en vivo por socket ni notificación. No se ejecutó aceptación PAIR en dispositivos: el preflight H10 previo registró 18/18 casos bloqueados por drivers, API y dispositivos ausentes. La paginación usa timestamp como cursor; mensajes/eventos con timestamps idénticos no tienen desempate de cursor por ID y requieren una mejora aparte para eliminar esa ambigüedad.
