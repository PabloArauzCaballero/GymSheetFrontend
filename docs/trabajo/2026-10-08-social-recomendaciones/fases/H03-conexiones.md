# H3 — Dos gimnasios comparten comunidad sin abrir datos privados

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A y B conectan entre gimnasios; C no puede acceder a sus datos.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R07, R11, R12, R21, R22. **Dependencias:** H2. **Estado:** EN CURSO; conexiones cross-gym, revocación del chat y bloqueo persistido cuentan con implementación parcial. Aceptación completa, recursos multimedia antiguos y QA multiplataforma siguen pendientes.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a y B conectan entre gimnasios; C no puede acceder a sus datos.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H3` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H3.S1 — Política y transacciones sociales

**Archivos:** `B/src/modules/social/social.service.ts (modificar)`; `B/src/modules/social/social.repository.ts (modificar)`; `B/src/modules/social/social-access.policy.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/conexiones.e2e-spec.ts`.

**Interfaces:** Consume SocialPolicyContext; produce evaluateAccess(ctx) y transición de conexión idempotente.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H3.S1.M1 | [x] Permitir conexión entre gimnasios | Dado A/B adultos activos de tenants distintos; cuando A solicita y B acepta; entonces existe una conexión mutua accesible a ambos. La prueba activa consentimiento bilateral de perfil y descubrimiento cross-gym. | E2E HTTP PostgreSQL PASS; [evidencia](../evidencia/h3-s1-m1-conexiones-e2e-2026-10-09.md) | HECHO |

| H3.S1.M2 | [x] Mantener aislamiento administrativo | Dado A conectado con B de otro tenant; cuando A pide membresía/asistencia privada de B; entonces recibe 404 sin datos de B. | E2E HTTP PostgreSQL PASS: historial vacío, evento/credencial 404 y listado de membresía sin B; [evidencia](../evidencia/h3-s1-m1-conexiones-e2e-2026-10-09.md) | HECHO |

| H3.S1.M3 | [x] Unificar solicitudes concurrentes | Dado A y B conectan al mismo tiempo; cuando se resuelven ambas operaciones; entonces existe una sola pareja aceptada. | E2E HTTP PostgreSQL PASS: mismo ID, única fila ACCEPTED; [evidencia](../evidencia/h3-s1-m1-conexiones-e2e-2026-10-09.md) | HECHO |

| H3.S1.M4 | [x] Validar quién acepta | Dado C conoce el ID de solicitud A-B; cuando C intenta aceptarla; entonces recibe 404 y la solicitud queda sin cambios. | E2E HTTP PostgreSQL PASS: 404 y estado PENDING; [evidencia](../evidencia/h3-s1-m1-conexiones-e2e-2026-10-09.md) | HECHO |

| H3.S1.M5 | [x] Aplicar descarte persistente | Dado A rechaza B; cuando A pagina o cambia dispositivo; entonces B sigue excluido hasta acción explícita. | E2E HTTP PostgreSQL PASS: el descarte persiste en sesión renovada y sólo desaparece tras borrar la interacción; [evidencia](../evidencia/h3-s1-m1-conexiones-e2e-2026-10-09.md) | HECHO |

## H3.S2 — Gestión de conexiones visible

**Archivos:** `F/apps/web/src/features/social/components/requests-tab.tsx (modificar)`; `F/apps/web/src/features/social/components/connection-actions.tsx (modificar)`; `F/apps/mobile/src/features/social/connections/ (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/conexiones.spec.ts`.

**Interfaces:** Consume rutas existentes de conexiones; produce estado común de perfil/tarjeta/reel/mapa.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H3.S2.M1 | [ ] Responder solicitudes recibidas | Dado B tiene solicitud pendiente de A; cuando acepta desde Recibidas; entonces ambos ven conexión y entrada al chat. | F: `python3 scripts/qa/run-social-pair.py --case H3.S2.M1` → PASS con manifiesto y evidencias | TODO |

| H3.S2.M2 | [ ] Retirar solicitud pendiente | Dado A envió solicitud; cuando la retira antes de aceptación; entonces desaparece de Recibidas de B sin crear chat. | F: `python3 scripts/qa/run-social-pair.py --case H3.S2.M2` → PASS con manifiesto y evidencias | TODO |

| H3.S2.M3 | [ ] Deshacer descarte | Dado A descartó B; cuando A usa deshacer o reiniciar descartes; entonces B puede ser candidato y los bloqueos permanecen. | F: `python3 scripts/qa/run-social-pair.py --case H3.S2.M3` → PASS con manifiesto y evidencias | TODO |

| H3.S2.M4 | [ ] Sincronizar el botón conectar | Dado A envió solicitud desde una superficie; cuando abre el perfil desde otra; entonces ve Pendiente o Conectados sin permitir duplicar. | F: `python3 scripts/qa/run-social-pair.py --case H3.S2.M4` → PASS con manifiesto y evidencias | TODO |

## H3.S3 — Revocación completa

**Archivos:** `B/src/modules/social/social-revocation.service.ts (nuevo)`; `B/src/modules/chat/chat.service.ts (modificar)`; `B/src/modules/chat/chat.gateway.ts (modificar)`. **Pruebas nuevas:** `B/test/social/conexiones.e2e-spec.ts`.

**Interfaces:** Produce revokeSocialRelationship(actorId,targetId,reason) en transacción y eventos de invalidación.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H3.S3.M1 | [ ] Hacer desaparecer chat | Dado conversación A-B con media; cuando A desconecta; entonces listado, historial y descarga anteriores quedan inaccesibles para ambos. | B: `yarn test:e2e --runTestsByPath test/social/conexiones.e2e-spec.ts -t 'H3.S3.M1'` → PASS | TODO |

| H3.S3.M2 | [ ] Cerrar acceso por socket | Dado socket suscrito antes de desconectar; cuando se revoca la conexión; entonces ningún mensaje posterior entra ni sale por ese canal. | B: `yarn test:e2e --runTestsByPath test/social/conexiones.e2e-spec.ts -t 'H3.S3.M2'` → PASS | TODO |

| H3.S3.M3 | [ ] Crear chat nuevo al reconectar | Dado conversación anterior revocada; cuando A/B vuelven a conectar; entonces ID nuevo e historial vacío. | B: `yarn test:e2e --runTestsByPath test/social/conexiones.e2e-spec.ts -t 'H3.S3.M3'` → PASS | TODO |

| H3.S3.M4 | [ ] Aplicar bloqueo a recursos existentes | Dado A bloquea B; cuando B abre URL antigua de perfil o historia; entonces acceso denegado y no puede enviar solicitud; mapa y reels repiten esta política en sus fases. | B: `yarn test:e2e --runTestsByPath test/social-blocks.e2e-spec.ts` → PASS para perfil/conexión; quedan historia, mapa, reels y socket | EN CURSO |

| H3.S3.M5 | [ ] Invalidar acceso al historial previo | Dado A/B tenían chat social; cuando A desconecta con sesión abierta en B; entonces el historial anterior no se sirve tras recarga ni por URL directa. | B: `yarn test:e2e --runTestsByPath test/social/conexiones.e2e-spec.ts -t 'H3.S3.M5'` → PASS | TODO |

## H3.S4 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/ (nueva migración del módulo; ID secuencial disponible)`; `B/test/social/conexiones.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/conexiones.e2e-spec.ts`.

**Interfaces:** Consume esquema anterior sintético; produce migración expand/contract compatible. Ejecutar esta subtarea antes de mutaciones que dependan de tablas nuevas, conservando numeración estable.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H3.S4.M1 | [ ] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | B: `yarn test:e2e --runTestsByPath test/social/conexiones.e2e-spec.ts -t 'H3.S4.M1'` → PASS | TODO |

| H3.S4.M2 | [ ] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | B: `yarn test:e2e --runTestsByPath test/social/conexiones.e2e-spec.ts -t 'H3.S4.M2'` → PASS | TODO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
