# H6 — Explorar personas por zona y gimnasios por ciudad

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A mueve el mapa a otra ciudad, ve zonas de personas elegibles y establecimientos con procedencia.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R07, R08, R09, R30, R34, R35, R36, R37. **Dependencias:** H3, H4, H5. **Estado:** EN CURSO; backend, contratos compartidos, consulta de ciudades/POIs, importación real de Bolivia y E2E PostgreSQL implementados. Falta aceptación nativa y cerrar exclusiones de bloqueo, cobertura de relaciones OSM y estado/respuesta asíncrona en dispositivos.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a mueve el mapa a otra ciudad, ve zonas de personas elegibles y establecimientos con procedencia.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H6` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H6.S1 — Consulta geográfica privada

**Archivos:** `B/src/modules/social-map/social-map.service.ts (nuevo)`; `B/src/modules/social-map/social-map.repository.ts (nuevo)`; `B/src/modules/social-map/social-map.schemas.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/mapa.e2e-spec.ts`.

**Interfaces:** Produce getAreas(actorId,SearchContext) y listAreaPeople(actorId,areaId,cursor); DTO sin coordenadas privadas.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H6.S1.M1 | [ ] Agrupar personas por zona | Dado dos personas elegibles en celda; cuando se consulta el mapa; entonces devuelve centro público de zona y lista filtrada. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S1.M1'` → PASS | EN CURSO; backend unitario y mapas de clientes implementados, falta DB/E2E |

| H6.S1.M2 | [ ] Impedir precisión individual | Dado zoom alto y bboxes muy pequeños; cuando se repiten consultas; entonces no revela puntos exactos ni refina por debajo de celda mínima. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S1.M2'` → PASS | TODO |

| H6.S1.M3 | [ ] Respetar opt-in específico | Dado perfil social activo con mapa apagado; cuando otro usuario explora su zona; entonces no aparece en grupos ni lista. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S1.M3'` → PASS | TODO |

| H6.S1.M4 | [ ] Conservar posición real | Dado A explora ciudad remota; cuando toca Buscar en esta zona; entonces contexto cambia y ubicación de perfil permanece intacta. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S1.M4'` → PASS | TODO |

| H6.S1.M5 | [ ] Aplicar exclusiones comunes | Dado B menor/bloqueado/descartado según fixture; cuando se abre listado de zona; entonces misma política que Conocer excluye B. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S1.M5'` → PASS | EN CURSO; adulto/consentimiento/decisiones excluidos; bloqueo persistido aún no existe |

| H6.S1.M6 | [ ] Validar límites geográficos | Dado bbox inválido o tamaño excesivo; cuando se consulta; entonces rechaza con error recuperable sin escaneo ilimitado. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S1.M6'` → PASS | TODO |

## H6.S2 — Directorio de gimnasios

**Archivos:** `B/src/modules/gym-places/places-provider.ts (nuevo)`; `B/src/modules/gym-places/gym-places.service.ts (nuevo)`; `B/src/modules/facilities/public-facilities.mapper.ts (modificar)`. **Pruebas nuevas:** `B/test/social/mapa.e2e-spec.ts`.

**Interfaces:** Produce GymPlace {id,source,sourceId,registered,coordinates,updatedAt}; adapter y cache por zona.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H6.S2.M1 | [x] Seleccionar fuente verificable | Dado proveedores/datasets candidatos; cuando se valida cobertura de ciudad y condiciones; entonces ADR fija fuente, atribución, cuota y presupuesto sin dependencia del Nominatim público. | B: `yarn test:e2e --runTestsByPath test/social-map-places.e2e-spec.ts` → PASS; [manifiesto y conteo real](../evidencia/osm-bolivia-261008.manifest.json) | HECHO |

| H6.S2.M2 | [ ] Combinar registrados y externos | Dado sede interna y gimnasio externo de prueba; cuando se consulta ciudad; entonces ambos aparecen con distintivo correcto. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S2.M2'` → PASS | TODO |

| H6.S2.M3 | [ ] Deduplicar identidad verificada | Dado sede vinculada a sourceId externo; cuando se consulta; entonces aparece un único establecimiento con procedencia conservada. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S2.M3'` → PASS | TODO |

| H6.S2.M4 | [ ] Distinguir cobertura fallida | Dado proveedor agotó cuota; cuando se abre mapa; entonces muestra datos cacheados con antigüedad o aviso, no ciudad vacía falsa. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S2.M4'` → PASS | TODO |

| H6.S2.M5 | [x] Validar coordenadas de establecimiento | Dado fuente entrega coordenada inválida; cuando se importa; entonces no coloca un punto en cero ni sobre la ubicación del usuario. | B: `yarn test --runInBand src/workers/social-map-places-import.command.spec.ts` → PASS (rechaza Null Island); E2E del directorio real → PASS | HECHO |

## H6.S3 — Experiencia multiplataforma del mapa

**Archivos:** `F/apps/web/src/features/social-map/ (nuevo)`; `F/apps/mobile/src/features/social-map/ (nuevo)`; `F/packages/schemas/src/definitions/social-map.ts (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/mapa.spec.ts`.

**Interfaces:** Consume celdas y GymPlace; produce Personas/Gimnasios/Ambos y búsqueda explícita por zona.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** TODO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
|---|---|---|---|---|

| H6.S3.M1 | [ ] Alternar capas | Dado mapa con personas y gimnasios; cuando cambia selector; entonces solo se muestran elementos de la capa elegida. | F: `python3 scripts/qa/run-social-pair.py --case H6.S3.M1` → PASS con manifiesto y evidencias | TODO |

| H6.S3.M2 | [ ] Abrir perfiles de zona | Dado grupo visible; cuando toca zona y luego perfil; entonces abre perfil autorizado con conectar coherente. | F: `python3 scripts/qa/run-social-pair.py --case H6.S3.M2` → PASS con manifiesto y evidencias | TODO |

| H6.S3.M3 | [ ] Explorar ciudad remota | Dado ciudad actual visible; cuando mueve mapa y busca zona nueva; entonces resultados pertenecen a la nueva zona sin sobrescribir perfil. | F: `python3 scripts/qa/run-social-pair.py --case H6.S3.M3` → PASS con manifiesto y evidencias | TODO |

| H6.S3.M4 | [ ] Consultar ficha de gimnasio | Dado marcador externo visible; cuando abre ficha; entonces ve nombre, dirección disponible, procedencia y distintivo. | F: `python3 scripts/qa/run-social-pair.py --case H6.S3.M4` → PASS con manifiesto y evidencias | TODO |

| H6.S3.M5 | [ ] Resolver fallos de mapa | Dado tiles o GPS fallan; cuando abre vista alternativa; entonces lista usable conserva búsqueda y selección. | F: `python3 scripts/qa/run-social-pair.py --case H6.S3.M5` → PASS con manifiesto y evidencias | TODO |

| H6.S3.M6 | [ ] Descartar respuesta obsoleta | Dado consulta de zona A lenta y B rápida; cuando terminan en orden inverso; entonces pantalla permanece en B sin mezclar puntos. | Web local: `yarn workspace @gymsheet/web test --run src/features/social-map/components/social-map-client.test.tsx` → 4/4 PASS; type-check PASS. Evidencia: [regresión web](../evidencia/frontend-h6-s3-m6-web-2026-10-10.md). Aceptación PAIR con manifiesto sigue pendiente. | EN CURSO (regresión web local) |

## H6.S4 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/ (nueva migración del módulo; ID secuencial disponible)`; `B/test/social/mapa.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/mapa.e2e-spec.ts`.

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

| H6.S4.M1 | [ ] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | B: `yarn test:e2e --runTestsByPath test/social/mapa.e2e-spec.ts -t 'H6.S4.M1'` → PASS | TODO |

| H6.S4.M2 | [x] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | B: PostgreSQL 16 temporal vacío → `yarn migration:up`, importación `yarn db:import:social-map`, API E2E → PASS; [evidencia](../evidencia/backend-social-map-places.txt) | HECHO |


## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
