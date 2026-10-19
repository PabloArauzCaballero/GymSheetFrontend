# H8 — Historias y reacciones llegan solo a su audiencia

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A comparte una historia con B, C queda excluido y la reacción llega al chat vigente.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R16, R21, R22. **Dependencias:** H3, H7. **Estado:** EN CURSO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a comparte una historia con B, C queda excluido y la reacción llega al chat vigente.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H8` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H8.S1 — Audiencia autorizada

**Archivos:** `B/src/modules/stories/stories.repository.ts (modificar)`; `B/src/modules/stories/stories.service.ts (modificar)`; `B/src/modules/stories/story-audience.model.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/historias.e2e-spec.ts`.

**Interfaces:** Produce policy canViewStory(actor,story,now), independiente de tenant pero dependiente de conexión.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO (E2E/local; PAIR general pendiente).

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H8.S1.M1 | [x] Ver historia entre gimnasios | Dado A/B conectados de tenants distintos; cuando B consulta feed; entonces ve historia para conexiones de A. | E2E HTTP PASS: conexión ACCEPTED de fixture cross-tenant; feed y apertura de story correctos. Evidencia: `../evidencia/h8-stories-e2e-2026-10-09.txt` y `../evidencia/h8-cross-gym-2026-10-09.md` | HECHO |

| H8.S1.M2 | [x] Restringir selección de audiencia | Dado A selecciona B pero no C conectado; cuando C pide historia directamente; entonces 404 sin media. | PostgreSQL 16 temporal aislado `127.0.0.1:55432/gymsheet_social_qa`, migraciones aplicadas. E2E literal `-t 'H8.S1.M2'` PASS, 1/1: B aparece y descarga media; C no aparece, recibe 404 al registrar vista/solicitar media y no causa lectura del storage. El DTO ya no entrega el URL público. Stories/policy unitarias 30/30, backend type-check PASS; cliente web (72 pruebas dirigidas) y mobile type-check PASS. Evidencia: [H8.S1.M2](../evidencia/h8-s1-m2-audiencia-seleccionada-2026-10-10.md). Aceptación PAIR/publicación desde UI queda en H8.S3.M1. | HECHO |

| H8.S1.M3 | [x] Respetar expiración | Dado historia publicada hace 24 horas; cuando se abre por enlace previo; entonces no está disponible. | E2E HTTP PASS: story expirada responde 404 y no persiste viewer; stories 45/45 PASS con PostgreSQL real temporal. Evidencia: `../evidencia/h8-stories-e2e-2026-10-09.txt`, `../evidencia/h8-cross-gym-2026-10-09.md` | HECHO |

| H8.S1.M4 | [x] Restringir lista de viewers | Dado B vio historia de A; cuando C solicita viewers; entonces solo A puede consultar esa lista. | PostgreSQL 16 temporal y aislado en `127.0.0.1:55432/gymsheet_social_qa`; migraciones aplicadas. E2E literal `-t 'H8.S1.M4'` PASS, 1/1: el autor recibe su viewer y un tercero recibe 404. Unitarias de stories 21/21, type-check backend y `git diff --check` PASS. Evidencia: [H8.S1.M4](../evidencia/h8-s1-m4-viewers-2026-10-10.md). | HECHO |

## H8.S2 — Reacciones vinculadas al chat

**Archivos:** `B/src/modules/stories/story-reactions.service.ts (nuevo)`; `B/src/modules/chat/chat.service.ts (modificar)`. **Pruebas nuevas:** `B/test/social/historias.e2e-spec.ts`.

**Interfaces:** Produce reactToStory(storyId,actor,emoji,requestId) y replyToStory(...text).

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO a nivel API/clientes locales; PAIR general pendiente.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H8.S2.M1 | [x] Crear reacción una vez | Dado B reacciona dos veces con mismo requestId; cuando se procesan reintentos; entonces un solo mensaje de reacción en chat AB. | E2E PASS 1/1 en PostgreSQL temporal aislado: ambos POST devuelven el mismo mensaje/conversación y SQL confirma una fila por `client_request_id`; type-check, ESLint dirigido y diff-check PASS. Evidencia: [H8.S2.M1](../evidencia/h8-s2-m1-reaccion-idempotente-2026-10-10.md) | HECHO |

| H8.S2.M2 | [x] Responder con texto | Dado historia vigente autorizada; cuando B escribe respuesta; entonces A recibe texto con referencia a historia. | E2E API/backend PASS 1/1 en PostgreSQL temporal: persiste `story_id`, devuelve `storyReference` y el autor la recibe en historial. CTA web/móvil abre y enfoca el mensaje del servidor; web focal 82/82, regresiones móviles 10/10; type-check y ESLint focal de ambas plataformas y backend PASS; diff-check PASS. No hubo PAIR/dispositivos. Evidencia: [H8.S2.M2](../evidencia/h8-s2-m2-respuesta-story-reference-2026-10-10.md). | HECHO |

| H8.S2.M3 | [x] Ocultar referencia expirada | Dado mensaje referencia historia que expira; cuando se abre chat; entonces texto permanece con Historia no disponible. | PostgreSQL temporal aislado, E2E dirigida `-t 'H8.S2.M3'` PASS 1/1: historial devuelve `available:false` tras expiración, ocultamiento y purga; texto intacto y sin URL de media. La consulta de disponibilidad es batch para las referencias de la página. Evidencia: [H8.S2.M3](../evidencia/h8-s2-m3-referencia-no-disponible-2026-10-10.md) | HECHO |

| H8.S2.M4 | [x] Rechazar reacción tras desconexión | Dado historia aún visible en caché; cuando se rompe conexión y B reacciona; entonces rechazo y ningún chat nuevo. | PostgreSQL temporal aislado, E2E dirigida `-t 'H8.S2.M4'` PASS 1/1: feed precargado antes de quitar la conexión; la reacción posterior devuelve 404 y SQL confirma cero conversaciones y mensajes para la pareja. | HECHO |

## H8.S3 — Publicar y consumir historias

**Archivos:** `F/apps/mobile/src/components/stories-bar.tsx (modificar)`; `F/apps/web/src/features/stories/ (modificar si existe; crear archivos de audiencia)`; `F/apps/mobile/src/features/stories/ (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/historias.spec.ts`.

**Interfaces:** Produce selector de audiencia, publicación y respuesta accesibles.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H8.S3.M1 | [ ] Publicar con selección | Dado A elige B como audiencia; cuando publica desde móvil; entonces B ve y C no ve tras recarga. | Selector web/móvil implementado, ALL_CONNECTIONS predeterminado, selección exige al menos una persona y API revalida conexiones vigentes. Web: servicio 2/2 y helper de guard 2/2; móvil: helper de reintento/selección 3/3; type-check web/móvil, ESLint focal y E2E backend H8.S1.M2 PASS. Falta recorrido PAIR con A/B/C y publicación/recarga. Evidencia: [compositor parcial](../evidencia/h8-s3-m1-compositor-2026-10-10.md). | EN CURSO |

| H8.S3.M2 | [x] Reproducir con lifecycle | Dado historia abierta; cuando app pasa a background; entonces reproducción se pausa y no avanza sola. | Web hook de visibilidad/pagehide: 2/2 pruebas; móvil AppState inactive/background/active: 3/3; type-check web+móvil, ESLint focal y diff-check PASS. Al volver al frente sigue pausada hasta acción explícita. PAIR quedó pendiente. Evidencia: [H8.S3.M2](../evidencia/h8-s3-m2-pausa-lifecycle-2026-10-10.md) | EN CURSO |

| H8.S3.M3 | [x] Recuperar subida fallida | Dado red se corta durante upload; cuando A reintenta; entonces una historia válida sin duplicados. | Migration `202610100004` y E2E PostgreSQL `-t 'H8.S3.M3'` PASS 1/1: mismo owner/requestId/hash devuelve la fila original y conserva audiencia; hash distinto responde 409; owner distinto usa su propio espacio de claves. El frontend conserva el archivo, audiencia y requestId para reintentar. Web 5 pruebas focales; type-check web/móvil/backend, ESLint focal y diff-check PASS. PAIR pendiente. Evidencia: [H8.S3.M3](../evidencia/h8-s3-m3-reintento-upload-2026-10-10.md) | EN CURSO |

| H8.S3.M4 | [x] Eliminar historia propia | Dado B la está mirando; cuando A elimina; entonces B deja de acceder sin pantalla bloqueada. | E2E PostgreSQL: B carga feed, registra vista y descarga media; A elimina; feed omite la story y view/media responden 404, con fila, audiencia y views borradas. Web y móvil hacen polling del feed cada 5 s solo con visor abierto y reconcilian el storyId eliminado para cerrar o avanzar sin dejar modal vacío. E2E `-t 'H8.S3.M4'` 1/1; cliente web 7/7, móvil 6/6; type-check/lint focal y diff-check PASS. PAIR pendiente. Evidencia: [H8.S3.M4](../evidencia/h8-s3-m4-eliminar-mientras-se-mira-2026-10-10.md) | EN CURSO |

## H8.S4 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/ (nueva migración del módulo; ID secuencial disponible)`; `B/test/social/historias.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/historias.e2e-spec.ts`.

**Interfaces:** Consume esquema anterior sintético; produce migración expand/contract compatible. Ejecutar esta subtarea antes de mutaciones que dependan de tablas nuevas, conservando numeración estable.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO a nivel de migraciones y fixture local.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H8.S4.M1 | [x] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | E2E `test/social/historias-migration.e2e-spec.ts -t 'H8.S4.M1'` PASS 1/1 dentro de transacción QA: baja/reaplica `202610100004`, conserva fila legacy, defaults y rechaza par incompleto/hash inválido/clave repetida. El test exige host local + DB `gymsheet_social_qa`. Type-check, ESLint focal y diff-check PASS. Evidencia: [H8.S4.M1](../evidencia/h8-s4-m1-migracion-sin-perdida-2026-10-10.md) | HECHO |

| H8.S4.M2 | [x] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | E2E `test/social/historias-migration.e2e-spec.ts -t 'H8.S4.M2'` PASS 1/1: crea DB aleatoria `template0`, aplica y compara todas las migraciones, inserta usuarios/story/audiencia seleccionada con huella de upload, y elimina la DB en `finally`. Type-check, ESLint focal y diff-check PASS. Guard local exige `gymsheet_social_qa`; evidencia: [H8.S4.M2](../evidencia/h8-s4-m2-base-vacia-2026-10-10.md). | HECHO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
