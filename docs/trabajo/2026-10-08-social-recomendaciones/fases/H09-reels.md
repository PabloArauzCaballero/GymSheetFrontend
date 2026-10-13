# H9 — Reels se publican y comparten sin seguidores

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A publica un reel; B lo guarda/repostea y C ve solo lo permitido.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R23, R24, R25, R26, R27, R28. **Dependencias:** H3, H7. **Estado:** EN CURSO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a publica un reel; B lo guarda/repostea y C ve solo lo permitido.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H9` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H9.S1 — Publicación y procesamiento

**Archivos:** `B/src/modules/reels/ (nuevo)`; `B/src/workers/reel-media.worker.ts (nuevo)`; `B/src/modules/media/ (reutilizar servicio existente)`. **Pruebas nuevas:** `B/test/social/reels.e2e-spec.ts`.

**Interfaces:** Produce estados de reel y pipeline idempotente con salida validada.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H9.S1.M1 | [x] Validar duración real | Dado videos de 89.9,90 y 90.1 segundos; cuando se procesan; entonces solo primeros dos pueden publicarse. | B: `yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S1.M1'` → PASS; parser 17/17 contrasta `mvhd`/`mdhd`/`elst` y tablas de muestras; no decodifica codec; PAIR pendiente | HECHO |

| H9.S1.M2 | [x] Evitar publicación incompleta | Dado upload interrumpido; cuando se consulta feed; entonces reel no READY queda fuera. | B: `yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S1.M2'` → PASS; error sin fila y PROCESSING excluido | HECHO |

| H9.S1.M3 | [ ] Reintentar procesamiento | Dado worker falla tras generar archivo; cuando reintenta mismo job; entonces un solo reel y salida sin huérfanos. | B: `yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S1.M3'` → PASS para retry durable del upload: una fila/clave, replay idempotente, 409 ante bytes distintos y cero huérfanos. E2E 1/1 volvió a pasar con rollback protegido, que conserva requestId en uso. Evidencia: [slice upload](../evidencia/h9-s1-m3-idempotencia-upload-2026-10-11.md). Worker/transcodificación aún pendientes. | EN CURSO |

| H9.S1.M4 | [x] Validar archivo por contenido | Dado extensión mp4 con contenido inválido; cuando se sube; entonces rechazo verificable sin ejecución insegura. | B: `yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S1.M4'` → PASS; parser 17/17 valida tablas y rangos en `mdat`; no demuestra decode general | HECHO |

## H9.S2 — Feeds e interacciones

**Archivos:** `B/src/modules/reels/reels-feed.repository.ts (nuevo)`; `B/src/modules/reels/reel-interactions.service.ts (nuevo)`; `B/src/modules/reels/reel-comments.service.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/reels.e2e-spec.ts`.

**Interfaces:** Produce feed FOR_YOU/CONNECTIONS por cursor, acciones únicas y respuestas de un nivel. La API y la web cubren feeds/interacciones; el endpoint Para ti todavía ordena cronológicamente y no tiene ranking fitness integrado.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H9.S2.M1 | [x] Separar dos feeds | Dado videos generales y de conexiones; cuando se consultan tabs; entonces Conexiones contiene solo publicaciones/reposts autorizados. | E2E PostgreSQL en [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md): feed CONNECTIONS separado de FOR_YOU, bloqueos y autores elegibles; PASS | HECHO |

| H9.S2.M2 | [x] Mantener guardados privados | Dado A guarda reel; cuando B consulta colecciones de A; entonces no obtiene guardados privados. | E2E PostgreSQL: el listado de guardados queda ligado a la cuenta autenticada y respeta visibilidad actual; PASS, ver [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md) | HECHO |

| H9.S2.M3 | [x] Deduplicar reposts | Dado B y C conectados con A repostean mismo reel; cuando A consulta feed; entonces video aparece una sola vez con autor original. | E2E PostgreSQL: una fila de reel y una tarjeta agrupada con las dos atribuciones; PASS, ver [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md) | HECHO |

| H9.S2.M4 | [x] Deshacer repost | Dado B había reposteado; cuando retira repost; entonces deja de atribuirse a B sin eliminar original. | E2E PostgreSQL: retiro idempotente y original aún disponible; PASS, ver [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md) | HECHO |

| H9.S2.M5 | [x] Aplicar comentario cerrado | Dado autor cierra comentarios; cuando otra persona intenta comentar; entonces rechaza aun con pantalla antigua. | E2E PostgreSQL: cierre y escritura concurrente protegidos; comentarios y respuestas de un nivel; rechazo de tercer nivel; borrado lógico por autor del reel; PASS, ver [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md) | HECHO |

| H9.S2.M6 | [x] Retirar contenido eliminado | Dado original tiene guardados/reposts; cuando autor o moderador lo retira; entonces no queda reproducible desde colecciones ni enlaces. | E2E PostgreSQL: borrado por autor y auto-ocultamiento después de tres reporteros distintos; excluido de feed/guardados y media previa devuelve 404; PASS. Evidencia: [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md) | HECHO |

## H9.S3 — Creación y consumo móvil/web

**Archivos:** `F/apps/mobile/src/features/reels/ (nuevo)`; `F/apps/web/src/features/reels/ (nuevo)`; `F/packages/schemas/src/definitions/reels.ts (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/reels.spec.ts`.

**Interfaces:** Produce recorder/uploader, trim, cover, feed y comentarios; validación final servidor.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H9.S3.M1 | [ ] Crear video recortado | Dado video fuente supera 90 segundos; cuando se recorta a 60 y publica; entonces resultado dura 60 y usa portada elegida. | F: `python3 scripts/qa/run-social-pair.py --case H9.S3.M1` → PASS con manifiesto y evidencias | TODO |

| H9.S3.M2 | [ ] Publicar desde cámara o archivo | Dado permisos concedidos; cuando se prueban ambas entradas; entonces ambas alcanzan READY con preview correcto. | Web y móvil ya implementan captura/selección y upload validado; servicio móvil 6/6, type-check y ESLint focal PASS. Falta prueba de dispositivo y PAIR real; ver [evidencia H9.S2](../evidencia/h9-s2-social-reels-2026-10-13.md) | EN CURSO |

| H9.S3.M3 | [ ] Mantener un reproductor activo | Dado scroll rápido por 30 reels; cuando se cambia de video visible; entonces solo el actual reproduce y audio anterior se detiene. | F: `python3 scripts/qa/run-social-pair.py --case H9.S3.M3` → PASS con manifiesto y evidencias | EN CURSO: el reproductor web pausa el video previo al iniciar otro; falta scroll de 30 reels y aceptación PAIR |

| H9.S3.M4 | [ ] Conectar desde autor | Dado reel de B; cuando A abre perfil y conecta; entonces mismo estado en Conocer y mapa. | F: `python3 scripts/qa/run-social-pair.py --case H9.S3.M4` → PASS con manifiesto y evidencias | TODO |

| H9.S3.M5 | [ ] Comentar y responder | Dado comentario raíz de A; cuando B responde y da like; entonces respuesta queda en ese reel con conteo persistente. | API y UI web/móvil para leer, comentar, responder de un nivel y dar like implementadas; E2E PostgreSQL y tests de servicios PASS; falta PAIR. Ver [slice social](../evidencia/h9-s2-social-reels-2026-10-13.md) | EN CURSO |

| H9.S3.M6 | [ ] Borrar comentario como autor | Dado comentario de B en reel de A; cuando A lo elimina; entonces desaparece para ambos sin borrar comentarios de otros reels. | F: `python3 scripts/qa/run-social-pair.py --case H9.S3.M6` → PASS con manifiesto y evidencias | TODO |

## H9.S4 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/ (nueva migración del módulo; ID secuencial disponible)`; `B/test/social/reels.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/reels.e2e-spec.ts`.

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

| H9.S4.M1 | [x] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | B: `yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S4.M1'` → PASS 1/1; usuario/story previos se conservan y duration/provider/status inválidos dan CHECK | HECHO |

| H9.S4.M2 | [x] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | B: `yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S4.M2'` → PASS; constraint y rollback protegido | HECHO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
