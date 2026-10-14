# H7 — Conversar con privacidad consistente entre dispositivos

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A/B intercambian media y controlan visto, edición y borrado con autorización de servidor.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R17, R18, R19, R20, R21, R22. **Dependencias:** H3. **Estado:** EN CURSO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a/B intercambian media y controlan visto, edición y borrado con autorización de servidor.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H7` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H7.S1 — Mensajes y media

**Archivos:** `B/src/modules/chat/message.model.ts (modificar)`; `B/src/modules/chat/chat.schemas.ts (modificar)`; `B/src/modules/chat/chat.service.ts (modificar)`; `B/src/modules/chat/chat.gateway.ts (modificar)`. **Pruebas nuevas:** `B/test/social/chat.e2e-spec.ts`.

**Interfaces:** Produce mensajes tipados TEXT/IMAGE/AUDIO/STICKER y acceso autorizado a archivos.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H7.S1.M1 | [x] Persistir mensaje idempotente | Dado mismo clientRequestId enviado dos veces; cuando servidor procesa ambos; entonces existe un solo mensaje. | Backend: E2E PostgreSQL 1/1 PASS para reintentos concurrentes, payload distinto y revalidación de acceso; servicio unitario verifica que retry no emite dos mensajes. Evidencia: `evidencia/backend-social-integration-temporary-2026-10-09.md`, `/tmp/gymsheet-h7-s1-m1-report.md` | HECHO |

| H7.S1.M2 | [x] Guardar audio válido | Dado archivo con tipo/duración permitidos; cuando se sube; entonces B puede reproducirlo tras reiniciar sin URL pública permanente. | Backend: AAC-LC M4A (`audio/mp4`), 1–120 s medidos; E2E PostgreSQL/storage local recrea Nest, descarga bytes iguales autenticada, 401 anónima y denegación tras bloqueo. Unitarias validador/servicio 60/60, chat E2E 4/4, type-check/diff-check PASS; revisión independiente confirmó correcciones de parser y acceso. Informes: `/tmp/gymsheet-h7-s1-m2-report.md`, `/tmp/gymsheet-h7-s1-m2-final-review.md`, `/tmp/gymsheet-h7-s1-m2-complexity-review.md` | HECHO |

| H7.S1.M3 | [x] Validar sticker de catálogo | Dado ID inexistente o URL arbitraria; cuando se envía sticker; entonces rechaza sin cargar contenido arbitrario. | Backend: E2E PostgreSQL 1/1 PASS; ID fijo `gym.cheer.v1` persiste/idempotente, IDs/URLs/campos arbitrarios rechazan sin fetch, fila ni emisión; outsider y bloqueo rechazan. Unidades chat/registry 113/113, type-check/diff-check PASS; revisión independiente sin Critical/Important. Comando: `yarn test:e2e --runTestsByPath test/social/chat-sticker.e2e-spec.ts -t 'H7.S1.M3'`. Informe: `/tmp/gymsheet-h7-s1-m3-report.md`; revisión: `/tmp/gymsheet-h7-s1-m3-review.md`. | HECHO |

| H7.S1.M4 | [x] Entregar foto sin metadatos privados | Dado foto con EXIF de localización; cuando se sube; entonces archivo servido no publica GPS embebido. | Backend: 52 pruebas dirigidas PASS con Node 22, type-check y diff-check; E2E chat 2/2 PASS con storage local único temporal. El caso verifica RED al omitir sanitización, descarga anónima 401, descarga autenticada sin EXIF/GPS y orientación correcta. Dos revisiones independientes sin hallazgos Critical/Important. Informe: `/tmp/gymsheet-h7-s1-m4-report.md`; evidencia: `../evidencia/backend-social-integration-temporary-2026-10-09.md` | HECHO |

| H7.S1.M5 | [x] Revalidar mensaje en cola | Dado envío pendiente antes de bloqueo; cuando se reintenta después; entonces rechaza y no publica mensaje ni adjunto. | Backend: E2E PostgreSQL/local storage 1/1 dirigido y suite chat 3/3 PASS; RED al omitir revocación. Verifica 403/404, cero filas/archivos/emisiones. La cola de texto se modela antes del primer HTTP; se prueba un intento nuevo de foto posterior al bloqueo, ya que adjuntos no tienen `clientRequestId`. Revisión independiente sin hallazgos Critical/Important (no repitió Jest). Informes: `/tmp/gymsheet-h7-s1-m5-report.md`, `/tmp/gymsheet-h7-s1-m5-review.md` | HECHO |

## H7.S2 — Plazos y eliminación

**Archivos:** `B/src/modules/chat/message-mutations.service.ts (nuevo)`; `B/src/modules/chat/message-visibility.model.ts (nuevo)`; `B/src/modules/chat/chat.controller.ts (modificar)`. **Pruebas nuevas:** `B/test/social/chat.e2e-spec.ts`.

**Interfaces:** Produce editMessage(), deleteMessage(scope) con reloj servidor y ownership.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H7.S2.M1 | [x] Aplicar límite de edición | Dado texto propio a 14:59,15:00,15:01; cuando se intenta editar; entonces acepta primeros dos y rechaza tercero con etiqueta Editado. | Backend: 14:59 y 15:00 aceptan; 15:00.001/15:01 rechazan; `createdAt` no cambia, `editedAt` persiste. Retry idempotente original devuelve la fila editada; payload distinto conserva 409. Migration 012 limita la edición; migration 013 conserva el payload idempotente original y hace backfill. Gate literal `yarn test:e2e --runTestsByPath test/social/chat-edit-window.e2e-spec.ts -t 'H7.S2.M1'` → 7/7 PASS, cero skips; E2E relacionadas 9/9, unidades relevantes 55/55, type-check/diff-check PASS. Review independiente sin Critical/Important. No hubo clientes WebSocket/UI ni carrera de publicación; informes `/tmp/gymsheet-h7-s2-m1-report.md`, `/tmp/gymsheet-h7-s2-m1-idempotency-fix-report.md`, `/tmp/gymsheet-h7-s2-m1-idempotency-compat-review.md` | HECHO |

| H7.S2.M2 | [x] Rechazar edición ajena | Dado B conoce ID de mensaje de A; cuando B intenta editar; entonces 404 y contenido intacto. | B conoce el ID por historial autorizado; PATCH devuelve 404 sin revelar el texto; fila completa intacta, una sola fila, cero `message:updated` y ambos historiales conservan el original. Mutación temporal sin filtro de autor falló como se esperaba (404 esperado, 200 recibido), código restaurado. Gate literal 1/1 PASS; regresión chat/edición/sticker/audio 13/13 PASS; type-check/diff-check PASS. Revisión independiente sin hallazgos. Sin cliente socket real. Informe `/tmp/gymsheet-h7-s2-m2-report.md`; review `/tmp/gymsheet-h7-s2-m2-review.md`. | HECHO |

| H7.S2.M3 | [x] Eliminar solo para mí | Dado A y B ven mismo mensaje; cuando A elimina para mí; entonces solo A deja de verlo incluso tras recarga. | Marcador persistente `(messageId,userId)`: A oculta y tras reiniciar app/historial solo A deja de verlo; B mantiene fila, preview y bytes. Filtra antes de paginar y en preview, media y vista única; retry/edit del propietario oculto no lo revive. Gate M3 4/4 PASS; inicialización/publicación E2E 4/4; regresión combinada 5 suites/21 E2E, unidades 55/55, type-check/diff-check PASS. RED reprodujo falta de ruta y carreras en `message:updated`, `message:new` y push; guards sincronizados por lock las cierran. Review independiente sin Critical/Important/Minor. REST/refetch; no cliente socket real y eventos/push ya iniciados no pueden retirarse. Migration 014 aplicada solo a DB QA local. Informes `/tmp/gymsheet-h7-s2-m3-report.md`, `/tmp/gymsheet-h7-s2-m3-review.md`. | HECHO |

| H7.S2.M4 | [x] Aplicar límite de borrado global | Dado mensaje propio a 23:59:59,24:00:00,24:00:01; cuando se elimina para ambos; entonces solo primeros dos quedan como Mensaje eliminado. | Migration 015 persiste tombstone, limpia texto/coordenadas/punteros y conserva solo digest versionado para retries idempotentes; `scope=EVERYONE` solo lo ejecuta autor dentro de 24h exactas. Eventos llevan metadatos mínimos; historial, edición, medios y vista única revalidan tombstone. RED/GREEN incluyó respuestas obsoletas de envío/edición y apertura de vista única pausada después de marcarla: después del tombstone responde sin caption ni URL. Gate literal 1/1; regresión 6 suites/28 E2E sin skips; unidades 78/78, type-check/diff-check PASS; review independiente aceptó sin Critical/Important/Minor. Harness E2E eleva solo su AUTH_RATE_LIMIT_MAX predeterminado para usuarios sintéticos y respeta overrides. Migration 015 aplicada solo a DB QA local. Entregas externas ya iniciadas no se retiran, objetos cifrados podrían permanecer en storage, no hubo clientes socket/dispositivos reales. Reporte `/tmp/gymsheet-h7-s2-m4-report.md`; review `/tmp/gymsheet-h7-s2-m4-review.md`; gate `/tmp/gymsheet-h7-s2-m4-e2e-final-28.log`. | HECHO |

| H7.S2.M5 | [x] Revocar adjunto eliminado | Dado B guardó URL interna de audio; cuando A elimina para ambos; entonces nueva descarga denegada y no reaparece por socket. | E2E de audio demuestra descarga previa autorizada y URL guardada → `scope=EVERYONE` → 404 posterior; historial solo muestra tombstone y se emite `message:deleted` con metadatos sin `message:new`. Web y móvil escuchan el evento, limpian medios/vista abierta e invalidan historial; barreras evitan que respuestas REST/socket atrasadas restauren el adjunto. Web hook/componente 3/3 y suite completa 42 archivos/272 tests; móvil helper 3/3, stories4/4, tour18/18, type-check PASS. Backend chat-audio2/2 y global-delete6/6; type-check/diff-check PASS; revisión independiente aceptó sin Critical/Important/Minor. Límite: móvil verificado por helpers/type-check e inspección, sin pantalla montada/dispositivo/sockets reales; paquete Jest no disponible. Informes `/tmp/gymsheet-h7-s2-m5-report.md`, review `/tmp/gymsheet-h7-s2-m5-review.md`. | HECHO |

## H7.S3 — Confirmaciones sin retroactividad

**Archivos:** `B/src/modules/chat/read-receipt-policy.ts (nuevo)`; `B/src/modules/chat/read-receipt-settings.model.ts (nuevo)`; `B/src/modules/chat/chat.service.ts (modificar)`. **Pruebas nuevas:** `B/test/social/chat.e2e-spec.ts`.

**Interfaces:** Produce resolveReceiptVisibility(a,b,conversationId,messageId) y applyReceiptPreference(input).

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H7.S3.M1 | [x] Guardar excepción individual | Dado default global activo; cuando A desactiva en AB; entonces AB queda oculto y AC mantiene su preferencia. | Backend: test PostgreSQL 1/1 PASS; default true/v0, AB override false/v1 y AC hereda true/null; SQL confirma persistencia. Mutación que actualiza todos los chats falla por AC como esperado y se revierte; sin cambio productivo. Chat E2E 10/10, unidades relacionadas 49/49, type-check/diff-check PASS; revisión independiente sin hallazgos Critical/Important/Minor. No se probó entrega visual real por socket/dispositivos. Informe `/tmp/gymsheet-h7-s3-m1-report.md`; review `/tmp/gymsheet-h7-s3-m1-review.md`. | HECHO |

| H7.S3.M2 | [x] Aplicar selección múltiple | Dado A elige AB y AC; cuando desactiva visto; entonces solo esas conversaciones cambian. | PostgreSQL E2E 1/1 PASS: AB/AC false, AD conserva `NULL`/efectivo true; default true y `enabled_since` global no cambian, política de AD idéntica y solo se emiten dos eventos seleccionados. RED detectó reinicio del cutoff global; corregido para actualizarlo solo en `ALL`. Suite chat11/11, unidades relevantes49/49, type-check/diff-check PASS; review sin hallazgos. Sin sockets/dispositivos reales. Reporte `/tmp/gymsheet-h7-s3-m2-report.md`; review del agente independiente. | HECHO |

| H7.S3.M3 | [x] Aplicar Todas a futuras | Dado hay excepciones previas; cuando A aplica Todas desactivado; entonces borra excepciones y nuevos chats heredan desactivado. | PostgreSQL E2E 1/1 PASS: AB/AC/AD quedan sin override y desactivados; SQL confirma tres excepciones borradas; versión2 y exactamente tres eventos. El nuevo AE hereda desactivado/null. Mutación que omite reset falla; restaurada. Chat12/12, unidades relevantes49/49, type-check/diff-check PASS; revisión independiente sin Critical/Important/Minor. Sin sockets/UI real. Reporte `/tmp/gymsheet-h7-s3-m3-report.md`; review `/tmp/gymsheet-h7-s3-m3-review.md`. | HECHO |

| H7.S3.M4 | [x] Respetar reciprocidad | Dado A activa y B desactiva; cuando ambos leen mensajes; entonces ninguno recibe visto público del otro. | PostgreSQL E2E 1/1 PASS: B ve primero un cursor público de A; luego opta por no participar, ambos resúmenes ocultan el cursor y sus nuevas lecturas no emiten `message:read`. Cursores internos leído/entregado avanzan; el cursor público previo permanece almacenado pero no se expone. Mutación AND→OR genera dos eventos y falla; restaurada. Chat13/13, unidades relevantes49/49, type-check/diff-check PASS; revisión independiente sin hallazgos. Sin clientes WebSocket/dispositivos reales. Reporte `/tmp/gymsheet-h7-s3-m4-report.md`; review `/tmp/gymsheet-h7-s3-m4-review.md`. | HECHO |

| H7.S3.M5 | [x] Evitar lectura retroactiva | Dado m1 leído con visto apagado; cuando se activa y luego se lee m2; entonces m1 nunca aparece leído y m2 puede mostrar visto. | PostgreSQL E2E 1/1 PASS: m1 no emite visto; al activar ambos, `readFrom` se publica en evento/resumen y queda entre m1 y m2; cursor/evento cubren m2. El comparador de dominio excluye m1 e incluye m2 (2/2). Mutation que borra `enabled_since` falla en `readFrom=null`; restaurada. Chat15/15, unidades49/49, type-check/diff-check PASS; review sin hallazgos. Sin WebSocket/dispositivo montado. `/tmp/gymsheet-h7-s3-m5-report.md`, review `/tmp/gymsheet-h7-s3-m5-review.md`. | HECHO |

| H7.S3.M6 | [x] Mantener entrega y no leídos | Dado visto apagado; cuando B recibe y abre mensaje; entonces Entregado funciona y no leídos internos se actualizan sin filtrar lectura. | PostgreSQL E2E 1/1 PASS: GET de historial entrega mensaje y emite `message:delivered`, sin adelantar lectura; POST/read avanza `last_read_at` a través del mensaje y conserva entrega monotónica, sin cursor/evento público. Mutación que omite cursor interno falla; restaurada. Chat15/15, unidades49/49, type-check/diff-check PASS; revisión sin Critical/Important. Sin contador visual/dispositivo real. `/tmp/gymsheet-h7-s3-m6-report.md`, review `/tmp/gymsheet-h7-s3-m6-review.md`. | HECHO |

## H7.S4 — Interacción de chat en tres plataformas

**Archivos:** `F/apps/web/src/features/chat/ (modificar)`; `F/apps/mobile/app/(app)/chat/[id].tsx (modificar)`; `F/apps/mobile/src/features/chat/ (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/chat.spec.ts`.

**Interfaces:** Consume eventos versionados y preferencias; produce menú ⋮, compositor y reconciliación.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H7.S4.M1 | [ ] Gestionar permisos de micrófono | Dado micrófono denegado; cuando toca grabar; entonces explica cómo habilitarlo sin bloquear texto. | Permiso persistente explica cómo abrir Ajustes; el compositor de texto sigue disponible. Helper 5/5, type-check móvil y `expo config` PASS. `expo-audio` y `expo-image-picker` comparten la descripción de voz + stories en la configuración fuente para que prebuild no la sobrescriba. Driver Android Maestro verifica el perfil A antes de tocar permisos, exige ACK de dispositivo y pareja desechables + UUID reservado, valida que el chat pertenezca a B, establece `RECORD_AUDIO=denied,user-fixed` y lo confirma con `dumpsys package`; guarda capturas del aviso visible y del borrador sin enviar. Pruebas de helper 5/5 y preflight runner PASS; falta aceptación nativa real. El permiso queda denegado en ese dispositivo dedicado después de ejecutar. | EN CURSO |

| H7.S4.M2 | [ ] Enviar audio entre dispositivos | Dado A graba en Android; cuando B escucha en iOS y web; entonces duración y contenido coinciden. | Drivers A_ANDROID/B_IOS/B_WEB validan pareja autenticada, chat reservado vacío, hash SHA256 y duración ffprobe sobre los mismos bytes AAC; Android exige micrófono previamente concedido y el iOS/web confirman avance de reproducción. iOS y web prueban perfil/chat vacío antes de la barrera; A toma un lock exclusivo para evitar ejecuciones simultáneas sobre el mismo UUID. El runner exige idéntico chat/mensaje/hash/duración y tombstone+404 del media route en los tres roles. Pruebas: helpers móvil 10/10, roles móvil 14/14, Node web 10/10, runner 36/36; `py_compile`, `node --check`, diff-check y Maestro `check-syntax` 3/3 PASS. El borrado global es lógico: no prueba purga física de blobs. Preflight actual BLOCKED: API `/health/ready` no disponible, Android desconectado, iOS apagado y ACK de pareja ausente; manifiesto `/tmp/gymsheet-h7-m2-final-preflight.json`. No se ejecutó ningún envío ni borrado real. | EN CURSO |

| H7.S4.M3 | [ ] Editar con teclado abierto | Dado mensaje propio elegible; cuando abre menú edita y guarda; entonces texto nuevo y etiqueta se ven en ambos. | Web y móvil implementan PATCH, ventana de 15 min, etiqueta y evento `message:updated`; móvil protege historial tardío, tombstones y cambios de conversación. Pruebas móviles de edición, borrado y caché 11/11 incluyen GET diferido con y sin caché inicial; web 22/22; type-check y ESLint focal PASS. El driver A_IOS enfoca el compositor, Maestro exige `focused: true` y genera captura antes de guardar; runner valida `editComposerFocusedAtSave`. Falta ejecutar el par real y revisar visualmente la captura para demostrar teclado abierto. | EN CURSO |

| H7.S4.M4 | [ ] Configurar alcance del visto | Dado abre tres puntos; cuando elige desactivar y seleccionar conversaciones; entonces estado se sincroniza en web/iOS/Android. | Web 16/16 focales; móvil 19/19 helpers M4/M5; backend serializa preferencias/lecturas y eventos por conversación; type-check/ESLint/diff-check PASS. Drivers A_ANDROID/A_IOS observadores, A_WEB escritor único y B_WEB emisor/observador ya implementados. Guards exigen `QA_M4_DISPOSABLE_ACCOUNT_ACK=H7.S4.M4`, `QA_DISPOSABLE_CONVERSATION_ID`, chat existente del peer asignado, A con override explícito `true` y B con visto efectivo habilitado; no crean chats ni mutan `ALL`. Node web-driver 14/14, Python M4 6/6, runner 31/31, py_compile/node-check/diff-check y Maestro `check-syntax` 4/4 PASS. La preflight real bloquea por API, Android, iOS y fixture QA/ack ausentes. Aún falta aceptación real con API/web y ambos dispositivos; el API no restaura herencia `null` ni cutoff original, así que solo correr sobre cuenta/par QA exclusivos y descartables. | EN CURSO |

| H7.S4.M5 | [ ] Limpiar chat revocado | Dado chat abierto y app en background; cuando otra persona desconecta; entonces al volver no se muestra historial anterior ni archivos. | Driver A_ANDROID abre el chat QA reservado con texto+foto visibles, pasa a background y al volver verifica `Chat cerrado`, contenido oculto y 404 de historial/media. B_WEB exige la conexión exacta reservada, verifica que es la única conexión aceptada/chat activo de A/B, elimina la conexión una vez y valida que la conexión desapareció y ambos recursos dan 404; barreras coordinan `preflight-ready`, `history-visible`, `app-backgrounded`, `conversation-revoked` y `history-cleared`. Guardas del runner requieren ACK M5 y UUID reservados antes de lanzar roles. Helpers M5 5/5, Node web-driver 19/19, runner 32/32; aceptación real no ejecutada por API/dispositivos/ACK ausentes; revocación irreversible solo en pareja desechable. B_WEB dispara la ruta API existente; el portal web no tiene acción UI para desconectar una relación aceptada. | EN CURSO |

## H7.S5 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/202610090015-chat-message-global-delete.ts` (migración del módulo ya registrada); `B/test/social/chat.e2e-spec.ts`. **Pruebas nuevas:** `B/test/social/chat.e2e-spec.ts`.

**Interfaces:** Consume esquema anterior sintético; produce migración expand/contract compatible. Ejecutar esta subtarea antes de mutaciones que dependan de tablas nuevas, conservando numeración estable.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H7.S5.M1 | [x] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | B: `yarn test:e2e --runTestsByPath test/social/chat.e2e-spec.ts -t 'H7.S5.M1'` → PASS | HECHO |

| H7.S5.M2 | [x] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | B: `yarn test:e2e --runTestsByPath test/social/chat.e2e-spec.ts -t 'H7.S5.M2'` → PASS | HECHO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los comandos de aceptación de cada fila son criterios; la bitácora registra qué drivers, pruebas y capturas ya existen y cuáles siguen sin aceptación real.
