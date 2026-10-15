# H4 — Señales verificadas y retractación integrada

Fecha: 2026-10-13. Alcance: Backend + motor independiente; verificación local en PostgreSQL temporal, HTTP y SQLite temporal.

## Cambios verificados

- La baraja emite un UUID de impresión por candidato; solo se acepta aprendizaje después de registrar que el cliente observó esa impresión. La impresión expira, se consume una sola vez y liga viewer, candidato y features declaradas.
- Las features salen de preferencias declaradas: intención (`intent:TRAINING`) y objetivo (`goal:FUERZA`). El evento no incluye nombre, correo ni otros datos de perfil.
- Swipe PASS/LIKE crea señal en el outbox dentro de la transacción del producto. Undo y bloqueo retractan el feedback aplicable y agregan el evento de retractación al outbox en la misma transacción.
- El worker entrega señales y retractaciones al servicio de recomendaciones. El almacén SQLite registra retractaciones de forma idempotente, borra la señal asociada y reconstruye el vector; una señal tardía posterior también queda suprimida.
- Web y móvil envían primero la confirmación de impresión observada y luego el swipe; el BFF web permite explícitamente la ruta de confirmación.

## Evidencia ejecutada

- Backend `test/social-recommender.e2e-spec.ts` con PostgreSQL 16 temporal y servicio HTTP local: **PASS 1/1**. Comprobó ranking, UUID de impresión, confirmación observada, PASS una sola vez, filas y outbox, undo, segunda señal seguida de bloqueo, retractación de ambas y caducidad del cursor al cambiar filtros.
- Worker `worker:recommendations`: los dos eventos `signal-recorded` y los dos `signal-retracted` de la ejecución aprobada terminaron `COMPLETED`. Las señales tuvieron dos intentos: el primero encontró el orden normal de proyección aún en tránsito y el reintento las aplicó una vez que los perfiles quedaron proyectados.
- SQLite, consulta posterior a la entrega y retractación: `recommendation_preference_vectors` quedó vacío para todos los viewers sintéticos de esta DB temporal. Esto confirma que undo y bloqueo retiraron el feedback aprendido.
- Motor: `corepack yarn run check` en Node 22 pasó 38/38 tests, incluidos autorización HTTP, idempotencia, retractación y supresión de replay tardío.
- Backend unitario dirigido previo: 53/53; type-check previo PASS. Repetición final de suites/type-check y validación de diff se registra en el commit de esta entrega.

La DB de QA original no se usó para escribir: el E2E apuntó a una copia temporal `gymsheet_h4_signals_20261013`. La aceptación de afinidad con datos reales y PAIR en web/Android/iOS no se infiere de estas pruebas locales.
