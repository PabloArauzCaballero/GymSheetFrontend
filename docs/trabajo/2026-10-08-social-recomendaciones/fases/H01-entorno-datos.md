# H1 — Dos cuentas pueden probar el mismo entorno

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A y B inician sesión en dos dispositivos simultáneos contra la misma base de pruebas.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R01, R02. **Dependencias:** ninguna. **Estado:** TODO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a y B inician sesión en dos dispositivos simultáneos contra la misma base de pruebas.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H1` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H1.S1 — Entorno reproducible

**Archivos:** `F/scripts/qa/preflight-social.py (nuevo)`; `F/apps/mobile/.maestro/config.yaml (existente)`; `F/apps/web/playwright.config.ts (existente)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/entorno-datos.spec.ts`.

**Interfaces:** Produce manifest.json con SHA frontend/backend/motor, puertos, versiones, dispositivos, base y runId sin secretos.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H1.S1.M1 | [x] Inventariar la base de trabajo | Dado cambios locales previos; cuando se captura el inventario; entonces cada repo tiene SHA, rama y diff propio preservado. | Frontend, backend y recomendador registrados en [inventario-continuidad-2026-10-09.txt](../evidencia/inventario-continuidad-2026-10-09.txt); no se modificaron archivos de producto ni se limpiaron cambios | HECHO |

| H1.S1.M2 | [x] Fijar herramientas compatibles | Dado Node actual fuera del rango <24; cuando se selecciona Node 22 y Yarn 1; entonces los procesos del entorno usan las versiones registradas. | Node v22.23.3 y Yarn 1.22.22 confirmados; las pruebas H8 se ejecutaron con este PATH. Evidencia: `../evidencia/toolchain-node22-2026-10-09.txt` | HECHO |

| H1.S1.M3 | [ ] Preparar Android QA | Dado SDK sin AVD; cuando se crea un AVD compatible con la arquitectura del host; entonces adb identifica un dispositivo iniciado y desbloqueado. | Bloqueado tras dos intentos API 36: emulador requiere 7.37 GiB con ~3.3 GiB disponibles. Se retiraron solo las imágenes y AVD creados en la sesión; no existe AVD operativo. Evidencia: `../evidencia/android-avd-retry-2026-10-09.md` | BLOCKED |

| H1.S1.M4 | [x] Preparar iOS QA | Dado simulador disponible apagado; cuando se inicia el dispositivo seleccionado; entonces simctl informa Booted y la app abre. | iPhone 17 Pro iOS 26.5 Booted; Xcode build/install y launch pasaron; con Metro, captura mostró login. Evidencia: `../evidencia/ios-simulator-build-2026-10-09.md`, `../evidencia/ios-login-metro-2026-10-09.png` | HECHO (smoke iOS) |

| H1.S1.M5 | [ ] Aislar servicios del recorrido | Dado otros procesos pueden ocupar puertos; cuando se ejecuta preflight; entonces API, BD, web y Metro apuntan al mismo runId sin detener procesos ajenos. | Preflight actual runId `e366edf3-3db8-4e99-86de-8be65c7199ea`: API no disponible, Android 0 conectado, iOS simuladores booted; no hay recorrido integrado ni runId compartido. Evidencia: `../evidencia/preflight-social-continuidad-2026-10-09.json` | EN CURSO |

## H1.S2 — Cuentas sintéticas reproducibles

**Archivos:** `B/src/database/seeders/social-qa.seed.ts (nuevo)`; `B/scripts/qa/seed-social.ts (nuevo)`; `B/test/social/entorno-datos.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/entorno-datos.e2e-spec.ts`.

**Interfaces:** Produce seedSocialQA({runId,fixtureClock,environment}): SeedManifest; consume seed pipeline existente.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H1.S2.M1 | [ ] Crear cuentas A y B | Dado dos gimnasios sintéticos; cuando se carga fixture AB; entonces ambos usuarios son adultos con intenciones compatibles en tenants distintos. | B: `yarn test:e2e --runTestsByPath test/social/entorno-datos.e2e-spec.ts -t 'H1.S2.M1'` → PASS | TODO |

| H1.S2.M2 | [ ] Definir controles de exclusión | Dado fixtures de menores/bloqueados/pausados; cuando se genera el manifest de QA; entonces cada control declara motivo esperado; estados futuros se activan al instalar su migración. | B: `yarn test:e2e --runTestsByPath test/social/entorno-datos.e2e-spec.ts -t 'H1.S2.M2'` → PASS | TODO |

| H1.S2.M3 | [ ] Demostrar idempotencia del seed | Dado fixture ya cargado; cuando se ejecuta otra vez; entonces insertados=0 y los IDs se conservan. | B: `yarn test:e2e --runTestsByPath test/social/entorno-datos.e2e-spec.ts -t 'H1.S2.M3'` → PASS | TODO |

| H1.S2.M4 | [ ] Rechazar seed productivo | Dado environment=production; cuando se intenta cargar demo; entonces falla antes de la primera escritura. | B: `yarn test:e2e --runTestsByPath test/social/entorno-datos.e2e-spec.ts -t 'H1.S2.M4'` → PASS | TODO |

| H1.S2.M5 | [ ] Limpiar exclusivamente datos QA | Dado runId de prueba y registros ajenos; cuando se limpia ese runId; entonces solo desaparecen datos de la ejecución solicitada. | B: `yarn test:e2e --runTestsByPath test/social/entorno-datos.e2e-spec.ts -t 'H1.S2.M5'` → PASS | TODO |

## H1.S3 — Prueba simultánea base

**Archivos:** `F/scripts/qa/run-social-pair.py (nuevo)`; `F/apps/mobile/.maestro/social/ (nuevo)`; `F/apps/web/e2e/social/ (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/entorno-datos.spec.ts`.

**Interfaces:** Produce run-social-pair.py --case ID; barreras A/B por estado observado en API, credenciales desde entorno privado.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H1.S3.M1 | [ ] Validar aislamiento de sesión | Dado A en Android y B en iOS; cuando ambos abren perfil; entonces cada pantalla presenta su cuenta correspondiente. | Live runner detecta API e identidades A/B, pero Android no está conectado; aún tampoco existen los drivers UI requeridos. Manifiesto: `../../../../scripts/qa/evidence/runs/28515af5-9e47-40fd-a0a2-3c9300d3828f/manifest.json` | BLOCKED |

| H1.S3.M2 | [ ] Añadir sesión web | Dado A/B conectados en móvil; cuando A inicia web en contexto aislado; entonces web muestra estado persistente de A sin adoptar sesión B. | Live runner bloquea por Android no conectado; cuando haya dispositivo también se necesitará el driver web/UI, aún no implementado. Manifiesto: `../../../../scripts/qa/evidence/runs/28515af5-9e47-40fd-a0a2-3c9300d3828f/manifest.json` | BLOCKED |

| H1.S3.M3 | [ ] Capturar una ejecución trazable | Dado dispositivos simultáneos; cuando se registra el recorrido; entonces video/capturas y manifest comparten runId y hora UTC. | Android no conectado; aún no están implementados los drivers de captura/rendezvous. Manifiesto: `../../../../scripts/qa/evidence/runs/28515af5-9e47-40fd-a0a2-3c9300d3828f/manifest.json` | BLOCKED |

| H1.S3.M4 | [ ] Comprobar persistencia inicial | Dado A cambia un dato permitido; cuando se reinicia su cliente; entonces el dato procede de API/BD y no solo de memoria local. | Android no conectado; aún falta el driver que edite, reinicie y vuelva a leer la preferencia por API. Manifiesto: `../../../../scripts/qa/evidence/runs/28515af5-9e47-40fd-a0a2-3c9300d3828f/manifest.json` | BLOCKED |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
