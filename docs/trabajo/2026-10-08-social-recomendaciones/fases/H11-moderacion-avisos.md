# H11 — La comunidad tiene reportes y avisos coherentes

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** Administración central resuelve reportes y los avisos no reabren recursos revocados.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R21, R22, R28, R33. **Dependencias:** H6, H7, H8, H9, H10. **Estado:** TODO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces administración central resuelve reportes y los avisos no reabren recursos revocados.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H11` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H11.S1 — Reportes y acción central

**Archivos:** `B/src/modules/moderation/moderation.policy.ts (ampliar sin pisar cambios locales)`; `B/src/modules/moderation/moderation.service.ts (ampliar)`; `F/apps/web/src/features/moderation/ (reutilizar)`. **Pruebas nuevas:** `B/test/social/moderacion-avisos.e2e-spec.ts`.

**Interfaces:** Consume target tipado; produce caso auditable con acceso central explícito.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H11.S1.M1 | [ ] Reportar contenido autorizado | Dado B puede ver reel o mensaje; cuando reporta con motivo; entonces se crea caso con referencia y evidencia mínima protegida. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S1.M1'` → PASS | TODO |

| H11.S1.M2 | [ ] Restringir administración de gimnasio | Dado caso social entre tenants; cuando admin de un gimnasio intenta abrirlo; entonces rechazo salvo permiso central explícito. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S1.M2'` → PASS | TODO |

| H11.S1.M3 | [ ] Ocultar contenido desde moderación | Dado moderador central resuelve retiro; cuando se consultan feeds y URL media; entonces contenido deja de estar disponible. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S1.M3'` → PASS | TODO |

| H11.S1.M4 | [ ] Auditar resolución | Dado caso asignado; cuando moderador resuelve; entonces actor, acción, motivo y momento quedan registrados. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S1.M4'` → PASS | TODO |

| H11.S1.M5 | [ ] Conservar evidencia tras revocación | Dado mensaje previamente reportado; cuando participantes desconectan; entonces chat desaparece y solo canal central autorizado conserva evidencia según política. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S1.M5'` → PASS | TODO |

## H11.S2 — Notificaciones seguras

**Archivos:** `B/src/modules/notifications/ (ampliar)`; `B/src/workers/notification-delivery.worker.ts (ampliar)`; `F/packages/notifications/ (ampliar)`. **Pruebas nuevas:** `B/test/social/moderacion-avisos.e2e-spec.ts`.

**Interfaces:** Produce eventos deduplicados con destino reautorizado y preferencias de usuario.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H11.S2.M1 | [ ] Deduplicar aviso | Dado evento de conexión repetido; cuando worker procesa; entonces un solo aviso por destinatario/evento. | Parcial: PostgreSQL E2E temporal recorre POST/PATCH real de solicitud/aceptación, verifica rollback completo si falla el outbox, retry idempotente y una sola entrega `IN_APP` con worker real. Unitarias 39/39, type-check, ESLint focal y Prettier PASS. No prueba dos procesos concurrentes ni push físico; queda EN CURSO. Evidencia: [E2E notificaciones](../evidencia/h11-s2-m1-notification-idempotency-e2e-2026-10-11.md) | EN CURSO |

| H11.S2.M2 | [x] Suprimir aviso revocado | Dado mensaje en cola y bloqueo posterior; cuando worker entrega; entonces descarta el aviso del recurso revocado. | E2E PostgreSQL crea aceptación y aviso reales, bloquea antes del worker y verifica `SUPPRESSED`, job `COMPLETED`, cero intentos de entrega y ninguna conexión aceptada; la suite H11 completa pasa 2/2. Aislamiento de test verificado con `current_database()` y DB temporal eliminada. Evidencia: [H11.S2.M2](../evidencia/h11-s2-m2-notification-suppression-2026-10-13.md) | HECHO |

| H11.S2.M3 | [ ] Reautorizar enlace | Dado notificación vieja de chat desaparecido; cuando usuario toca; entonces no abre historial y explica no disponibilidad. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S2.M3'` → PASS | TODO |

| H11.S2.M4 | [ ] Respetar privacidad en push | Dado preview privado desactivado; cuando llega mensaje; entonces notificación no incluye su texto. | B: `yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S2.M4'` → PASS | TODO |

## H11.S3 — Experiencia transversal

**Archivos:** `F/apps/web/src/features/moderation/components/report-dialog.tsx (ampliar)`; `F/apps/mobile/src/features/social/reporting/ (nuevo)`; `F/apps/mobile/src/features/notifications/ (integración)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/moderacion-avisos.spec.ts`.

**Interfaces:** Produce reportar/bloquear/pausar accesibles y avisos consistentes.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H11.S3.M1 | [ ] Reportar desde recurso | Dado usuario abre menú de reel/perfil/mensaje; cuando envía motivo; entonces ve confirmación persistente sin duplicar caso por reintento. | F: `python3 scripts/qa/run-social-pair.py --case H11.S3.M1` → PASS con manifiesto y evidencias | TODO |

| H11.S3.M2 | [ ] Pausar sin perder vínculos | Dado A tiene B conectado; cuando pausa perfil; entonces B conserva chat mientras C no lo descubre. | F: `python3 scripts/qa/run-social-pair.py --case H11.S3.M2` → PASS con manifiesto y evidencias | TODO |

| H11.S3.M3 | [ ] Reanudar perfil | Dado A pausado; cuando reactiva; entonces vuelve a elegibilidad con consentimientos conservados. | F: `python3 scripts/qa/run-social-pair.py --case H11.S3.M3` → PASS con manifiesto y evidencias | TODO |

| H11.S3.M4 | [ ] Bloquear desde menú | Dado A está en chat de B; cuando bloquea; entonces desaparece chat en ambas sesiones y no vuelve desde notificación. | F: `python3 scripts/qa/run-social-pair.py --case H11.S3.M4` → PASS con manifiesto y evidencias | TODO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
