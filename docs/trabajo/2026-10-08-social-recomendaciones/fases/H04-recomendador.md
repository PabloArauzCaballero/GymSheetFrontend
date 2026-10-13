# H4 — Conocer recomienda incluso sin historial

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** El motor independiente genera candidatos explicables, aprende señales y nunca evade filtros.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R08, R09, R10, R11. **Dependencias:** H2, H3. **Estado:** EN CURSO; ranking, proyección SQLite, worker de outbox, integración HTTP backend→motor, revalidación, fallback, cursor firmado ligado a filtros y rollback de modelos versionados implementados. El gate del motor para señales persiste; la señal de producto aún no se conecta. Antes del emisor faltan impresión verificable en la baraja, fuente declarada de `interests`, retractación coherente con undo/bloqueo y orden causal de proyecciones. También faltan guardrails automáticos y aceptación operativa/de producto.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces el motor independiente genera candidatos explicables, aprende señales y nunca evade filtros.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H4` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H4.S1 — Repositorio y proyección independientes

**Archivos:** `R/src/contracts/ (nuevo)`; `R/src/projections/ (nuevo)`; `R/src/http/ (nuevo)`; `B/src/modules/social/recommendations-client.ts (nuevo)`; `B/src/modules/social/social-outbox.service.ts (nuevo)`. **Pruebas nuevas:** `R/test/recomendador.spec.ts`.

**Interfaces:** Produce POST /v1/rank/people RankRequest→RankResponse y POST /v1/events SocialEvent[].

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO (backend/motor; aceptación de producto continúa pendiente).

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H4.S1.M1 | [x] Aislar el servicio | Dado servicio R iniciado sin credenciales de BD de negocio; cuando se pide health y ranking de fixture; entonces opera solo sobre su almacén propio. | `GymSheetRecommendations`: `node --test test/http.test.mjs` → PASS; la persistencia propia es SQLite y no usa DB de negocio | HECHO |

| H4.S1.M2 | [x] Validar contrato interno | Dado request con versión desconocida o sin credencial; cuando se llama al motor; entonces rechaza sin ejecutar ranking. | Motor: `node --test test/http.test.mjs` → PASS | HECHO |

| H4.S1.M3 | [x] Consumir evento duplicado | Dado dos eventos con mismo eventId; cuando se proyectan; entonces la proyección cambia una sola vez. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS; SQLite conserva eventId incluso tras reiniciar | HECHO |

| H4.S1.M4 | [x] Ignorar evento atrasado | Dado aggregateVersion 5 aplicado; cuando llega versión 4; entonces no restaura datos obsoletos. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS; versiones persisten y se verifican tras reiniciar | HECHO |

| H4.S1.M5 | [x] Eliminar perfil proyectado | Dado perfil borrado o desactivado; cuando se consume tombstone; entonces desaparece de índices y caches del motor. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS; borrado/tombstone persistido y replay rechazado tras reiniciar | HECHO |

## H4.S2 — Ranking de arranque y exploración

**Archivos:** `R/src/ranking/eligibility.ts (nuevo)`; `R/src/ranking/affinity.ts (nuevo)`; `R/src/ranking/rerank.ts (nuevo)`; `R/config/affinity-v1.json (nuevo)`. **Pruebas nuevas:** `R/test/recomendador.spec.ts`.

**Interfaces:** Produce rankPeople(request): RankResponse; fórmulas y fixtures en RECOMENDADOR.md.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO; motor de aprendizaje verificado con fixtures, pero aún no recibe señales autorizadas del producto por las carencias de contrato descritas arriba.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H4.S2.M1 | [x] Respetar género obligatorio | Dado viewer busca mujeres sin historial; cuando rankea mezcla de perfiles; entonces todos los candidatos son mujeres. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S2.M2 | [x] Conservar edad y distancia estrictas | Dado límites configurados sin flexibilidad; cuando faltan candidatos; entonces devuelve menos resultados sin romper límites. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S2.M3 | [x] Inferir afinidad inicial | Dado viewer sin interacciones con intención/intereses conocidos; cuando rankea fixture documentado; entonces candidatos compatibles preceden controles incompatibles. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S2.M4 | [x] Tratar campos desconocidos | Dado perfil con pocos intereses; cuando se calcula score; entonces no inventa atributos ni penaliza como incompatibilidad probada. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S2.M5 | [x] Explorar sin saltar filtros | Dado baraja con candidatos diversos; cuando se ejecuta cuota exploratoria; entonces solo usa candidatos elegibles y registra motivo. | `GymSheetRecommendations`: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S2.M6 | [x] Evitar duplicados al paginar | Dado cursor y seed de sesión estables; cuando se piden páginas consecutivas; entonces ningún perfil se repite. | `GymSheetRecommendations`: 7 pruebas nuevas verifican paginación, integridad HMAC, contexto, modelo fijo y límites; `yarn run check` → 29/29 PASS (Node 22) | HECHO; H4.S4.M3 valida la continuación contra los filtros vigentes del backend |

## H4.S3 — Aprendizaje y evaluación

**Archivos:** `R/src/learning/online-preferences.ts (nuevo)`; `R/src/evaluation/ (nuevo)`; `R/test/recommendation-policy.spec.ts (nuevo)`. **Pruebas nuevas:** `R/test/recomendador.spec.ts`.

**Interfaces:** Consume impresiones verificadas, conectar, descartar y conexión mutua; produce parámetros versionados y reporte offline.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H4.S3.M1 | [x] Aprender de señales válidas | Dado impresiones y elecciones de fixture; cuando se actualiza el vector; entonces preferencias blandas se ajustan en dirección esperada. | Motor: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S3.M2 | [x] Limitar efecto de una interacción | Dado una sola señal frente a historial previo; cuando se adapta el modelo; entonces no reemplaza toda la preferencia ni cambia filtros explícitos. | Motor: `node --test test/recommender.test.mjs` → PASS; filtros explícitos no se mutan | HECHO |

| H4.S3.M3 | [x] Evitar fuga de evaluación | Dado dataset con cortes temporales; cuando se evalúa ranking; entonces features no contienen resultados posteriores al corte. | Motor: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S3.M4 | [x] Separar calidad sintética de real | Dado benchmark con usuarios artificiales; cuando se emite reporte; entonces etiqueta validación de reglas y no afirma tasa real de afinidad. | Motor: `node --test test/recommender.test.mjs` → PASS | HECHO |

| H4.S3.M5 | [x] Revertir modelo | Dado versión nueva incumple guardrail; cuando se selecciona versión anterior; entonces ranking vuelve al modelo registrado manteniendo exclusiones. La activación persiste tras reiniciar el proceso. | `GymSheetRecommendations`: `yarn run check` → PASS (21 pruebas; registro v2, reinicio y rollback a v1) | HECHO |

## H4.S4 — Integración resiliente

**Archivos:** `B/src/modules/social/recommendations-client.ts (nuevo)`; `B/src/modules/social/social.service.ts (modificar)`; `B/src/modules/social/social.repository.ts (modificar)`. **Pruebas nuevas:** `B/test/social/recomendador.e2e-spec.ts`.

**Interfaces:** Consume RankResponse; produce baraja pública revalidada por versión y elegibilidad autoritativas.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO para las cuatro microtareas backend dirigidas; aceptación integrada de producto y operación continúa pendiente.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H4.S4.M1 | [x] Revalidar candidato obsoleto | Dado R propone a B recién bloqueado; cuando backend arma respuesta; entonces B se excluye antes de servir al cliente. | E2E Nest local pausa el ranking HTTP, bloquea al candidato en la fixture, libera una respuesta vieja del motor y confirma `data=[]`; mutación a filas iniciales sirvió el bloqueado y falló. Re-revisión independiente limpia. Informe: `/tmp/gymsheet-h4-s4-m1-report.md` | HECHO |

| H4.S4.M2 | [x] Continuar ante caída del motor | Dado R responde timeout; cuando se solicita baraja; entonces fallback local conserva todos los filtros obligatorios. | E2E HTTP local lento comprueba aborto, una petición y fallback con género, minAge=18 y maxAge=65; candidata de 66 años excluida. Mutaciones de timeout y maxAge fallaron; re-revisión independiente limpia. Evidencia: `/tmp/gymsheet-h4-s4-m2-m4-report.md` | HECHO |

| H4.S4.M3 | [x] Invalidar cursor al cambiar filtros | Dado cursor emitido antes de cambiar género; cuando se solicita siguiente página; entonces rechaza/reinicia cursor sin filtrar por preferencias viejas. | Backend: 44 pruebas dirigidas PASS; E2E PostgreSQL→HTTP verifica `X-Next-Cursor`, segunda página sin duplicado y 400 tras cambio de género. Cursor firmado liga usuario, tenant, preferencias/versiones, consentimiento y filtros; excedentes se conservan y el token cabe en 12 KB. Re-revisión independiente sin hallazgos Critical/Important. Evidencia: `../evidencia/backend-social-integration-temporary-2026-10-09.md`, `/tmp/gymsheet-h4-s4-m3-report.md` | HECHO |

| H4.S4.M4 | [x] Evitar latencia acumulada | Dado motor no responde; cuando vence presupuesto interno de 300 ms; entonces se corta la llamada y no hay cadena de reintentos dentro del request. | E2E con HTTP local de 2 s exige <700 ms, confirma socket cerrado y una sola llamada; mutación 300→800 ms falla a 806 ms. Re-revisión independiente sin regresiones. Evidencia: `/tmp/gymsheet-h4-s4-m2-m4-report.md` | HECHO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
