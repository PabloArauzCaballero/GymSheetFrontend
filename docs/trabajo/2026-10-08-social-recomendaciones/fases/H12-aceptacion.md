# H12 — El recorrido completo queda demostrado con evidencia

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** El reporte acredita cada requisito por plataforma o lo deja explícitamente pendiente.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31, R32, R33, R34, R35, R36, R37. **Dependencias:** H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, H11. **Estado:** TODO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces el reporte acredita cada requisito por plataforma o lo deja explícitamente pendiente.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H12` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H12.S1 — Recorridos de extremo a extremo

**Archivos:** `F/apps/mobile/.maestro/social/ (nuevo)`; `F/apps/web/e2e/social/aceptacion.spec.ts (nuevo)`; `F/scripts/qa/run-social-pair.py (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/aceptacion.spec.ts`.

**Interfaces:** Consume fixtures A/B/C/D/E y manifest; produce evidencia de QA-AB-01 a QA-AB-08.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H12.S1.M1 | [ ] Completar Android A con iOS B | Dado fixtures limpios de distintos gyms; cuando ejecutan recorrido completo; entonces perfil→mapa→conexión→chat→story→reel→encuentro persiste. | F: `python3 scripts/qa/run-social-pair.py --case H12.S1.M1` → PASS con manifiesto y evidencias | TODO |

| H12.S1.M2 | [ ] Invertir dispositivos | Dado nuevo runId; cuando A usa iOS y B Android; entonces recorrido equivalente sin dependencia del rol/plataforma. | F: `python3 scripts/qa/run-social-pair.py --case H12.S1.M2` → PASS con manifiesto y evidencias | TODO |

| H12.S1.M3 | [ ] Cruzar Android con web | Dado sesiones A/B independientes; cuando conectan y conversan; entonces estado y media coinciden tras recarga. | F: `python3 scripts/qa/run-social-pair.py --case H12.S1.M3` → PASS con manifiesto y evidencias | TODO |

| H12.S1.M4 | [ ] Cruzar iOS con web | Dado sesiones A/B independientes; cuando comparten historia y entrenamiento; entonces audiencia y agenda coinciden. | F: `python3 scripts/qa/run-social-pair.py --case H12.S1.M4` → PASS con manifiesto y evidencias | TODO |

| H12.S1.M5 | [ ] Ensayar desconexión y reconexión | Dado AB con historial completo; cuando desconectan y reconectan; entonces chat nuevo vacío y encuentros previos cancelados. | F: `python3 scripts/qa/run-social-pair.py --case H12.S1.M5` → PASS con manifiesto y evidencias | TODO |

| H12.S1.M6 | [ ] Ensayar permisos y red | Dado permiso denegado o red interrumpida; cuando se repite acción fallida; entonces recuperación sin duplicados ni concesión de acceso. | F: `python3 scripts/qa/run-social-pair.py --case H12.S1.M6` → PASS con manifiesto y evidencias | TODO |

## H12.S2 — Calidad medible

**Archivos:** `F/scripts/qa/social-performance.ts (nuevo)`; `B/test/social/authorization.e2e-spec.ts (nuevo)`; `R/test/evaluation.spec.ts (nuevo)`; `F/docs/trabajo/2026-10-08-social-recomendaciones/evidencia/ (documentación)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/aceptacion.spec.ts`.

**Interfaces:** Produce percentiles, auditoría de autorización y matriz visual; presupuestos en CALIDAD_Y_DOD.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H12.S2.M1 | [ ] Medir respuesta con carga | Dado dataset y carga fijados; cuando se mide baraja/mapa/chat; entonces percentiles cumplen presupuesto o se registra fallo. | F: `python3 scripts/qa/run-social-pair.py --case H12.S2.M1` → PASS con manifiesto y evidencias | TODO |

| H12.S2.M2 | [ ] Medir reproducción prolongada | Dado sesión de 30 minutos con 100 reels; cuando se observa memoria y estabilidad; entonces sin crash y memoria estabilizada dentro del presupuesto documentado. | F: `python3 scripts/qa/run-social-pair.py --case H12.S2.M2` → PASS con manifiesto y evidencias | TODO |

| H12.S2.M3 | [ ] Verificar accesibilidad | Dado teclado/lector y movimiento reducido; cuando se recorren superficies; entonces acciones clave operables sin gesto exclusivo ni trampas de foco. | F: `python3 scripts/qa/run-social-pair.py --case H12.S2.M3` → PASS con manifiesto y evidencias | TODO |

| H12.S2.M4 | [ ] Revisar capturas dos veces | Dado matriz final capturada; cuando se hacen revisión funcional y adversarial; entonces cada pantalla tiene veredicto escrito y ninguna RECHAZADA. | F: `python3 scripts/qa/run-social-pair.py --case H12.S2.M4` → PASS con manifiesto y evidencias | TODO |

| H12.S2.M5 | [ ] Ejecutar regresión del entrenamiento | Dado cambios sociales terminados; cuando se corre rutina→serie→finalización; entonces entrenamiento y XP mantienen sus reglas anteriores. | F: `python3 scripts/qa/run-social-pair.py --case H12.S2.M5` → PASS con manifiesto y evidencias | TODO |

## H12.S3 — Cierre auditable

**Archivos:** `F/docs/trabajo/2026-10-08-social-recomendaciones/REPORTE.md`; `F/scripts/qa/validate-social-evidence.py (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/aceptacion.spec.ts`.

**Interfaces:** Produce matriz R01–R37 completa, reporte de ejecución y manifest de artefactos.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H12.S3.M1 | [ ] Validar cobertura documental | Dado todas las microtareas declaradas; cuando se cruza requisito/caso/evidencia; entonces ningún requisito queda sin caso o con PASS inventado. | F: `python3 scripts/qa/validate_social_evidence.py` y `python3 -m unittest discover -s scripts/qa -p 'test_validate_social_evidence.py' -v` → PASS 14/14; detecta estados inventados, resultados negados, IDs duplicados, requisito sin caso y links fuera del workspace. Vínculo/autenticidad de cada HECHO frente a evidencia ejecutable y commit/revisión vigente sigue pendiente | EN CURSO |

| H12.S3.M2 | [ ] Verificar último cambio | Dado se corrigió un defecto después de QA; cuando se vuelve a probar el área afectada; entonces evidencia corresponde a SHAs y cambios finales. | F: `python3 scripts/qa/run-social-pair.py --case H12.S3.M2` → PASS con manifiesto y evidencias | TODO |

| H12.S3.M3 | [ ] Ensayar rollback por flags | Dado funciones sociales activas en test; cuando se desactiva flag de nuevo recorrido; entonces entrenamiento y datos históricos permanecen accesibles. | F: `python3 scripts/qa/run-social-pair.py --case H12.S3.M3` → PASS con manifiesto y evidencias | TODO |

| H12.S3.M4 | [ ] Cerrar con estado real | Dado matriz completa de resultados; cuando se redacta reporte; entonces HECHO solo en tareas con DoD ejecutado y pendientes claramente identificados. | F: `python3 scripts/qa/run-social-pair.py --case H12.S3.M4` → PASS con manifiesto y evidencias | TODO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
