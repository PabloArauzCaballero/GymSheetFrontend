# H5 — Descubrir y decidir funciona igual en las tres plataformas

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** Conocer permite decidir por gestos o botones y muestra estados honestos ante falta de candidatos.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R08, R09, R11, R12. **Dependencias:** H3, H4. **Estado:** EN CURSO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces conocer permite decidir por gestos o botones y muestra estados honestos ante falta de candidatos.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H5` genera un manifiesto con todos los casos obligatorios. El registro ya existe; los drivers y las evidencias de plataforma siguen siendo requisitos para pasar los casos.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H5.S1 — Contratos y estado compartido

**Archivos:** `F/packages/schemas/src/definitions/social.ts (modificar)`; `F/packages/api-client/src/social-discovery.ts (nuevo)`; `F/apps/web/src/features/social/services/discovery-service.ts (modificar)`; `F/apps/web/src/shared/server/backend-route-policy.ts (modificar)`. **Pruebas nuevas:** `F/apps/web/e2e/social/conocer.spec.ts`.

**Interfaces:** Consume discovery deck y preferenceVersion; produce query keys y acciones tipadas.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H5.S1.M1 | [ ] Rechazar respuesta incompatible | Dado API devuelve candidato inválido; cuando cliente valida DTO; entonces muestra error recuperable en lugar de datos corruptos. | F: `yarn workspace @gymsheet/web test:e2e e2e/social/conocer.spec.ts --grep 'H5.S1.M1'` → PASS | EN CURSO |

| H5.S1.M2 | [ ] Gestionar vacío real | Dado cero candidatos elegibles; cuando abre Conocer; entonces explica filtros y ofrece modificarlos sin inventar personas. | F: `yarn workspace @gymsheet/web test:e2e e2e/social/conocer.spec.ts --grep 'H5.S1.M2'` → PASS | EN CURSO |

| H5.S1.M3 | [ ] Reconciliar acción fallida | Dado swipe optimista recibe 409; cuando cliente actualiza estado; entonces recupera estado autoritativo sin duplicar conexión. | F: `yarn workspace @gymsheet/web test:e2e e2e/social/conocer.spec.ts --grep 'H5.S1.M3'` → PASS; PAIR A_WEB controlado comprueba UI y conexiones sin mutar; carrera 409 real del backend pendiente | EN CURSO |

| H5.S1.M4 | [ ] Recuperar cursor vencido | Dado sesión vieja; cuando usuario vuelve a Conocer; entonces reinicia página preservando decisiones persistentes. | F: `yarn workspace @gymsheet/web test:e2e e2e/social/conocer.spec.ts --grep 'H5.S1.M4'` → PASS; PAIR A_WEB controlado comprueba GET sin cursor y swipe interceptado por navegador; falta cursor vencido y decisión persistida reales | EN CURSO |

## H5.S2 — Recorrido accesible

**Archivos:** `F/apps/web/src/features/social/components/directory-swipe-deck.tsx (modificar)`; `F/apps/mobile/src/features/social/discovery/ (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/conocer.spec.ts`.

**Interfaces:** Produce tarjetas, lista y filtros accesibles con acciones equivalentes.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H5.S2.M1 | [ ] Conectar con botones | Dado lector de pantalla o teclado activo; cuando elige Conectar; entonces produce la misma solicitud que el gesto. | F: `python3 scripts/qa/run-social-pair.py --case H5.S2.M1` → PASS con manifiesto y evidencias | EN CURSO |

| H5.S2.M2 | [ ] Actualizar preferencias visibles | Dado A cambia mujeres por hombres; cuando regresa a Conocer; entonces no quedan tarjetas del filtro anterior. | F: `python3 scripts/qa/run-social-pair.py --case H5.S2.M2` → PASS con manifiesto y evidencias | EN CURSO |

| H5.S2.M3 | [ ] Mostrar ampliación permitida | Dado flexibilidad activada; cuando aparece candidato fuera del rango preferido; entonces UI identifica ampliación y permite volver al rango. | F: `python3 scripts/qa/run-social-pair.py --case H5.S2.M3` → PASS con manifiesto y evidencias | TODO |

| H5.S2.M4 | [ ] Probar dos decisiones simultáneas | Dado A/B se encuentran; cuando ambos conectan desde clientes distintos; entonces una celebración por cliente y chat accesible. | F: `python3 scripts/qa/run-social-pair.py --case H5.S2.M4` → PASS con manifiesto y evidencias | TODO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Hay pruebas web para H5.S1.M1–M4 y H5.S2.M1; existen drivers A_WEB/A_ANDROID/A_IOS para S2.M1 y A_WEB para S1.M1–M4. Los intentos individuales M3/M4 y S2.M1 permanecen bloqueados por API no disponible; S2.M2–M4 aún no tienen drivers. La aceptación Android/iOS/web sigue pendiente.
