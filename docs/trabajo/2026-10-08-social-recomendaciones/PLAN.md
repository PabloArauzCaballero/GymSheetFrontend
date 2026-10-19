# Plan — Flujo social, recomendaciones y mapa de GymSheet

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** dos adultos de gimnasios distintos completan perfil, descubrimiento, mapa, conexión, chat, historias, reels y entrenamiento compartido con evidencia en Android, iOS y web.

**Architecture:** frontend existente + backend existente + nuevo repositorio GymSheetRecommendations; autorización en backend, ranking independiente y datos sociales públicos mínimos.

**Tech Stack:** Expo SDK 57 / React Native 0.86, Next.js 16, TypeScript/Zod, NestJS 11, Sequelize y PostgreSQL. Conservar Yarn 1 y usar Node compatible (<24; Node 22 propuesto).

**Spec:** [ESPECIFICACION.md](ESPECIFICACION.md). **Fecha:** 2026-10-08. **Estado de implementación:** TODO.

Plan escrito: **12 hitos, 44 subtareas, 197 microtareas**. Ejecución parcial en curso: H1 preflight, H2/H3 consentimiento, revocación y bloqueo parcial, H3.S1.M1–M5 conexión cross-gym y controles de política verificados por E2E HTTP, H4 ranker con proyección SQLite durable, H6 directorio OSM y H7 recibos de lectura. Las microtareas no se consideran terminadas hasta cumplir su DoD; medios de chat históricos, integración/fallback del recomendador y QA multiplataforma de dos usuarios siguen pendientes.

## Lectura y entregables

1. [Decisiones confirmadas](DECISIONES.md).
2. [Especificación de comportamiento](ESPECIFICACION.md).
3. [Arquitectura, datos y contratos](ARQUITECTURA_Y_CONTRATOS.md).
4. [Plan detallado del motor](RECOMENDADOR.md) y [mapa](MAPA.md).
5. [Datos de prueba](DATOS_DE_PRUEBA.md), [dos dispositivos](DOS_DISPOSITIVOS.md), [QA](QA.md).
6. [Calidad y DoD](CALIDAD_Y_DOD.md), [ciclos /loop](LOOP.md), [trazabilidad](TRAZABILIDAD.md).
7. [Reporte de lo efectivamente realizado](REPORTE.md).

## Alcance y restricciones globales

IN: R01–R37 y cada hito siguiente. OUT: followers, posts tradicionales, OAuth social, chat antes de conexión, rastreo de posición exacta, modificación de planes completos al compartir sesión, sincronización bidireccional de calendarios, publicación de producción en esta tarea de planificación.

El plan usa el directorio existente de la conversación previa y conserva su borrador en evidencia/plan-inicial.md. Las tareas futuras pueden cambiar producto únicamente al ejecutarse; esta entrega modifica documentación. Los cambios locales previos de rutinas/workouts, moderación y pantallas se preservan. La nota original de planificación no infería permiso para publicar; el usuario autorizó explícitamente push y merge el 2026-10-13. El avance publicado y sus límites están en [PROGRESO.md](PROGRESO.md). No se hizo despliegue.

**Kill-test del conjunto:** A y B de gimnasios diferentes conectan en dispositivos distintos; A desconecta y B intenta leer el chat o descargar una foto mediante URL anterior. Si puede hacerlo, el flujo no está terminado aunque sus pantallas se vean correctas.

## Hitos por orden de dependencia

| Hito | Resultado observable | Dependencias | Requisitos | Plan |
|---|---|---|---|---|

| H1 | Dos cuentas pueden probar el mismo entorno | — | R01, R02 | [Abrir](fases/H01-entorno-datos.md) |

| H2 | Activar social es opcional y reversible | H1 | R03, R04, R05, R06, R08, R09, R29, R30, R31, R32 | [Abrir](fases/H02-perfil-permisos.md) |

| H3 | Dos gimnasios comparten comunidad sin abrir datos privados | H2 | R07, R11, R12, R21, R22 | [Abrir](fases/H03-conexiones.md) |

| H4 | Conocer recomienda incluso sin historial | H2, H3 | R08, R09, R10, R11 | [Abrir](fases/H04-recomendador.md) |

| H5 | Descubrir y decidir funciona igual en las tres plataformas | H3, H4 | R08, R09, R11, R12 | [Abrir](fases/H05-conocer.md) |

| H6 | Explorar personas por zona y gimnasios por ciudad | H3, H4, H5 | R07, R08, R09, R30, R34, R35, R36, R37 | [Abrir](fases/H06-mapa.md) |

| H7 | Conversar con privacidad consistente entre dispositivos | H3 | R17, R18, R19, R20, R21, R22 | [Abrir](fases/H07-chat.md) |

| H8 | Historias y reacciones llegan solo a su audiencia | H3, H7 | R16, R21, R22 | [Abrir](fases/H08-historias.md) |

| H9 | Reels se publican y comparten sin seguidores | H3, H7 | R23, R24, R25, R26, R27, R28 | [Abrir](fases/H09-reels.md) |

| H10 | Entrenar juntos respeta la rutina de cada persona | H3, H7 | R13, R14, R15, R21 | [Abrir](fases/H10-entrenar-juntos.md) |

| H11 | La comunidad tiene reportes y avisos coherentes | H6, H7, H8, H9, H10 | R21, R22, R28, R33 | [Abrir](fases/H11-moderacion-avisos.md) |

| H12 | El recorrido completo queda demostrado con evidencia | H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, H11 | R01–R37 | [Abrir](fases/H12-aceptacion.md) |


## Dependencias y puertas de salida

H1 habilita ejecución real. H2 y H3 fijan identidad/política antes del motor. H4 habilita H5 y H6. H7 permite reacciones H8 e invitaciones H10. H9 reutiliza medios/autorización. H11 extiende moderación existente; los controles de bloqueo comienzan en H3, no se posponen al final. H12 exige todos los anteriores. Cada hito tiene demo vertical antes de pasar al dependiente.

## Foco de revisión del plan

- Cambio de filtro mientras llega una respuesta vieja: H4.S4.M3, H5.S2.M2, H6.S3.M6.
- Desconexión con socket/archivo conservado: H3.S3.M1–M4, H7.S1.M5.
- Recibos reactivados después de leer: H7.S3.M5.
- Aceptaciones y reintentos concurrentes: H3.S1.M3, H10.S1.M3–M4.
- Mapa de zona lejana y proveedores ausentes: H6.S1.M4, H6.S2.M4, H6.S3.M5.

## Riesgos y tratamiento

| Riesgo | Impacto | Resolución prevista |
|---|---|---|
| Android sin AVD, herramientas fuera de PATH | No hay evidencia Android | H1 instala/configura toolchain compatible y documenta arranque antes de declarar PASS. |
| Trabajo local sin commit en áreas compartidas | Sobrescribir funcionalidades previas | Inventario y diffs, cambios mínimos, integración en checkout aislado al ejecutar. |
| Cross-gym abre datos empresariales | Fuga de información | Política social específica y negativos de administración H3. |
| Media con URL pública permanente | No puede desaparecer al bloquear | Entrega privada autorizada y prueba de URL previa H7. |
| Ranking basado solo en cuentas sintéticas | Métricas engañosas de afinidad | Separar corrección offline de efectividad real; RECOMENDADOR.md. |
| Proveedor cartográfico/cuotas no contratado | Gimnasios externos incompletos | ADR en H6, fuente y cobertura comprobadas; no declarar completado con fixtures. |
| Memoria del host limitada para video y dos dispositivos | QA irreal o inestable | RAM acotada por AVD y servicios; no aceptar prueba secuencial como simultánea. |
| SDK nativo diferente de documentación online | Fallos de mapas/audio/calendario | Verificar API de versión instalada antes de escribir integración. |

## Método de ejecución

El `/loop` solicitado se documenta como ciclo observable por caso, no como tarea programada ya creada. Por defecto ejecutar directamente fase a fase; delegación requiere el método correspondiente y límites claros. No se ha creado repositorio remoto ni activado automatización. Cada microtarea tiene CA y DoD; un comando cuyo archivo aún no exista es trabajo pendiente, no evidencia.
