# H2 — Activar social es opcional y reversible

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** Una cuenta adulta completa su perfil sin bloquear su entrenamiento ni exigir permisos opcionales.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R03, R04, R05, R06, R08, R09, R29, R30, R31, R32. **Dependencias:** H1. **Estado:** EN CURSO; consentimiento de descubrimiento/mapa parcialmente implementado. Perfil social, onboarding, contactos y QA siguen pendientes.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces una cuenta adulta completa su perfil sin bloquear su entrenamiento ni exigir permisos opcionales.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H2` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H2.S1 — Perfil social autorizado

**Archivos:** `B/src/modules/profiles/ (existente)`; `B/src/modules/social/social-profile.service.ts (nuevo)`; `B/src/modules/social/social-access.policy.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/perfil-permisos.e2e-spec.ts`.

**Interfaces:** Produce SocialProfilePublic, SocialState y activateProfile(actorId,expectedVersion); DTO definido en especificación.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H2.S1.M1 | [ ] Separar borrador privado | Dado registro completado con Ahora no; cuando se consulta Conocer desde otra cuenta; entonces el borrador no aparece. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S1.M1'` → PASS | TODO |

| H2.S1.M2 | [ ] Aplicar edad adulta | Dado fechas a un día de cumplir 18 y al cumplir 18; cuando se intenta activar; entonces solo el caso de 18 exactos es admitido. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S1.M2'` → PASS | TODO |

| H2.S1.M3 | [ ] Validar campos mínimos | Dado perfil sin foto o bio; cuando se intenta completar; entonces no activa y señala el campo faltante. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S1.M3'` → PASS | TODO |

| H2.S1.M4 | [ ] Publicar DTO mínimo | Dado perfil con datos privados de entrenamiento; cuando otro usuario abre perfil social; entonces no recibe antropometría, fecha de nacimiento completa, email ni teléfono. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S1.M4'` → PASS | TODO |

| H2.S1.M5 | [ ] Reusar XP e insignias | Dado progreso existente; cuando se consulta perfil público; entonces se muestran valores autorizados sin duplicar el cálculo ni premiar la lectura. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S1.M5'` → PASS | TODO |

| H2.S1.M6 | [ ] Persistir pausa | Dado perfil activo con conexión; cuando se pausa; entonces sale de descubrimiento y conserva conexiones y encuentros. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S1.M6'` → PASS | TODO |

## H2.S2 — Onboarding equivalente en tres clientes

**Archivos:** `F/packages/schemas/src/definitions/social.ts (ampliar)`; `F/apps/web/src/features/social/onboarding/ (nuevo)`; `F/apps/mobile/src/features/social/onboarding/ (nuevo)`; `F/apps/mobile/app/(app)/onboarding.tsx (integración mínima)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/perfil-permisos.spec.ts`.

**Interfaces:** Consume perfil y preferencias; produce wizard reanudable y navegación final Conocer.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H2.S2.M1 | [ ] Ofrecer activación voluntaria | Dado registro de entrenamiento finalizado; cuando se elige Ahora no; entonces se puede entrenar y activar social más tarde. | F: `python3 scripts/qa/run-social-pair.py --case H2.S2.M1` → PASS con manifiesto y evidencias | TODO |

| H2.S2.M2 | [ ] Reanudar el paso incompleto | Dado borrador guardado en paso de intereses; cuando se cierra y abre la app; entonces retoma datos sin publicar el perfil. | F: `python3 scripts/qa/run-social-pair.py --case H2.S2.M2` → PASS con manifiesto y evidencias | TODO |

| H2.S2.M3 | [ ] Editar galería pública | Dado entre una y seis fotos; cuando se reordena o elimina una foto; entonces portada y límites se mantienen tras recarga. | F: `python3 scripts/qa/run-social-pair.py --case H2.S2.M3` → PASS con manifiesto y evidencias | TODO |

| H2.S2.M4 | [ ] Guardar intenciones múltiples | Dado usuario elige amistad y entrenamiento; cuando confirma y recarga; entonces ambas intenciones permanecen. | F: `python3 scripts/qa/run-social-pair.py --case H2.S2.M4` → PASS con manifiesto y evidencias | TODO |

| H2.S2.M5 | [ ] Configurar filtros independientes | Dado edad estricta y distancia flexible; cuando se guardan preferencias; entonces solo distancia puede ampliarse. | F: `python3 scripts/qa/run-social-pair.py --case H2.S2.M5` → PASS con manifiesto y evidencias | TODO |

| H2.S2.M6 | [ ] Abrir enlaces sociales válidos | Dado enlace HTTPS autorizado y enlace javascript; cuando se guarda el perfil; entonces solo el enlace HTTPS válido puede abrirse. | F: `python3 scripts/qa/run-social-pair.py --case H2.S2.M6` → PASS con manifiesto y evidencias | TODO |

## H2.S3 — Permisos y contactos opcionales

**Archivos:** `B/src/modules/social/contact-discovery.service.ts (nuevo)`; `F/apps/mobile/src/features/social/permissions/ (nuevo)`; `F/apps/web/src/features/social/permissions/ (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/perfil-permisos.spec.ts`.

**Interfaces:** Produce consentimientos versionados; importContacts() no envía invitaciones automáticamente.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H2.S3.M1 | [ ] Continuar sin GPS | Dado permiso de ubicación denegado; cuando se elige ciudad manualmente; entonces Conocer opera e indica ubicación aproximada. | F: `python3 scripts/qa/run-social-pair.py --case H2.S3.M1` → PASS con manifiesto y evidencias | TODO |

| H2.S3.M2 | [ ] Separar visibilidad de mapa | Dado ubicación concedida; cuando se deja apagado Aparecer en mapa; entonces la cuenta puede explorar sin exponerse en el mapa. | F: `python3 scripts/qa/run-social-pair.py --case H2.S3.M2` → PASS con manifiesto y evidencias | TODO |

| H2.S3.M3 | [ ] Descubrir contactos voluntariamente | Dado contacto verificado y social activo que permite ser encontrado; cuando se autoriza búsqueda de conocidos; entonces aparece el perfil sin publicar identificadores. | F: `python3 scripts/qa/run-social-pair.py --case H2.S3.M3` → PASS con manifiesto y evidencias | TODO |

| H2.S3.M4 | [ ] Revocar contactos | Dado importación previamente autorizada; cuando se desactiva y elimina importación; entonces no se conserva libreta ni aparecen coincidencias por esa importación. | F: `python3 scripts/qa/run-social-pair.py --case H2.S3.M4` → PASS con manifiesto y evidencias | TODO |

| H2.S3.M5 | [ ] Resolver permiso no disponible en web | Dado navegador sin agenda; cuando se abre Contactos; entonces explica alternativa por enlace/manual y no finge importación. | F: `python3 scripts/qa/run-social-pair.py --case H2.S3.M5` → PASS con manifiesto y evidencias | TODO |

## H2.S4 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/ (nueva migración del módulo; ID secuencial disponible)`; `B/test/social/perfil-permisos.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/perfil-permisos.e2e-spec.ts`.

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

| H2.S4.M1 | [ ] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S4.M1'` → PASS | TODO |

| H2.S4.M2 | [ ] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | B: `yarn test:e2e --runTestsByPath test/social/perfil-permisos.e2e-spec.ts -t 'H2.S4.M2'` → PASS | TODO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
