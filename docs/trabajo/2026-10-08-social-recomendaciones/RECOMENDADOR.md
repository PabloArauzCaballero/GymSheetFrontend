# Motor independiente — diseño y plan de evaluación

Implementación en [H4](fases/H04-recomendador.md). Repositorio propuesto: `GymSheetRecommendations`, hermano de frontend/backend; aún no creado. Esta pieza recomienda personas. Reels tendrá ranking de contenido separado: una reproducción no se interpreta automáticamente como interés romántico por su autor.

## 1. Responsabilidad y estructura

| Ruta nueva en R | Responsabilidad | Interfaz |
|---|---|---|
| `src/contracts/rank.ts` | DTOs Zod versionados | RankRequest/RankResponse de arquitectura |
| `src/http/rank.controller.ts` | Autenticación interna, límites y transporte | `POST /v1/rank/people` |
| `src/projections/profile-projection.ts` | Perfil social mínimo actualizado por eventos | `applyProfileEvent(event)` |
| `src/projections/inbox.ts` | Idempotencia y orden por agregado | `consume(event): APPLIED/DUPLICATE/STALE` |
| `src/ranking/eligibility.ts` | Filtros deterministas previos | `eligible(viewer,candidate,context,now)` |
| `src/ranking/candidates.ts` | Recuperar pool acotado por celda/estado | `retrieveCandidates(request)` |
| `src/ranking/affinity.ts` | Afinidad inicial explicable | `scoreAffinity(viewer,candidate,config)` |
| `src/ranking/rerank.ts` | Diversidad, exploración y desempate | `rerank(scored,sessionSeed,seenIds)` |
| `src/learning/online-preferences.ts` | Actualización acotada por feedback | `updatePreferenceVector(events,prior)` |
| `src/evaluation/metrics.ts` | Métricas offline, sin inventar resultados | `evaluate(dataset,modelVersion)` |
| `config/affinity-v1.json` | Pesos y relaciones revisables | Schema validado y versión inmutable |
| `test/recomendador.spec.ts` | IDs H4 de aceptación dirigida | Jest, configurado como parte del primer slice |

Propuesta operativa: Node 22, TypeScript estricto, NestJS para HTTP, PostgreSQL separado para proyección/señales; sin dependencia inicial de servicio vectorial ni GPU. Dockerfile, compose de QA, `.env.example`, migraciones propias y health/readiness en H4.S1.M1. Scripts por crear: `yarn build`, `yarn lint`, `yarn type-check`, `yarn test`, `yarn evaluate --dataset <path> --model <version>`. Ninguno se afirma existente.

## 2. Datos admitidos

Perfil pseudónimo: ID social, edad derivada necesaria para filtro, género autodeclarado, intenciones, códigos de intereses/disciplinas/objetivos, disponibilidad por franjas voluntaria, celda geográfica gruesa, gimnasio público opcional, preferencias explícitas y estado/versión. Excluir nombre real, imágenes originales, teléfono, email, texto de chat, contactos, antropometría y coordenada exacta.

Relaciones/exclusiones: conexión, bloqueo en ambas direcciones, descartes y suspensión. Las proyecciones aceleran ranking, pero la base de negocio decide autorización final. La desactivación o bloqueo gana frente a cualquier caché o ranking previamente emitido.

## 3. Pipeline determinista

1. Validar contrato, credencial y límites (`limit` inicial 20, máximo 50).
2. Obtener preferencias/candidato con sus versiones; si faltan preferencias mínimas, responder error de perfil incompleto, no adivinarlas.
3. Recuperar pool de hasta 500 candidatos activos por contexto geográfico, ampliando por páginas internas solo dentro de presupuesto. Registrar saturación si el pool se corta; no confundir limitación del pool con inexistencia global de candidatos.
4. Filtrar self, menor de edad, perfil inactivo/incompleto, bloqueos, suspensión, conexión existente y descarte vigente. Género elegido por viewer obligatorio.
5. Aplicar edad/distancia. Flexibilidad se ejecuta solo para el filtro habilitado y se marca en `reasonCodes`. Primera política propuesta: hasta ±2 años respetando 18+, y hasta 1.5× radio; no expansión infinita. Estos valores son parámetros técnicos versionados.
6. Puntuar afinidad, mezclar exploración y desempatar por hash determinista de sesión+profileId.
7. Emitir IDs/score/motivos, cursor opaco firmado y versiones. Backend vuelve a validar todos los IDs y construye DTO público.

Para R37, `MAP_AREA` cambia el centro explícito de búsqueda; los límites de distancia se miden desde la zona explorada. Edad/género/bloqueos siguen iguales. Ninguna escritura de ubicación se hace durante ranking.

## 4. Afinidad sin historial

Se estiman intereses a partir de lo declarado, sin inventar el perfil. La matriz de afinidad inicial es una heurística editable, no una afirmación psicológica ni un porcentaje demostrado de compatibilidad. Inspiración técnica: [Google, características declaradas y filtrado por contenido](https://developers.google.com/machine-learning/recommendation/content-based/basics).

Componentes normalizados 0–1:

| Componente | Cálculo inicial propuesto | Peso TRAINING | FRIENDSHIP | DATING |
|---|---|---:|---:|---:|
| Intención común | Jaccard sobre intenciones activas | .25 | .30 | .30 |
| Disciplinas/objetivos | Coincidencia exacta 1; relación de matriz; desconocido se omite | .25 | .15 | .10 |
| Intereses personales | Jaccard ponderado por catálogo declarado | .15 | .30 | .30 |
| Disponibilidad | Intersección/unión de franjas declaradas | .25 | .10 | .05 |
| Cercanía | Decaimiento en bandas de distancia del contexto | .10 | .15 | .25 |

Cuando hay varias intenciones se promedian los pesos de las elegidas por el viewer. Omitir dimensiones desconocidas y renormalizar los pesos conocidos; si no hay características suficientes, score neutral .5 y exploración geográfica elegible. No dar score cero por un dato no respondido. Intenciones distintas bajan afinidad blanda, no actúan como prohibición inventada.

Ejemplo de matriz técnica: `strength↔hypertrophy=.8`, `running↔trail=.7`; default de relación no registrada=0 y desconocido es distinto de relación ausente. Valores de ejemplo deben vivir con versión, justificación de producto y fixture; no se presentan como estadística empírica. No construir relaciones a partir de sexo o apariencia.

Score inicial `s0 = suma(w_i * feature_i) / suma(w_i conocidos)`. Motivos legibles: `SHARED_TRAINING_GOAL`, `SHARED_INTEREST`, `OVERLAPPING_AVAILABILITY`, `NEAR_SEARCH_AREA`, `EXPLORATION`, `AGE_RANGE_EXPANDED`, `DISTANCE_EXPANDED`. Evitar etiquetas «98% compatible» mientras no exista calibración real.

## 5. Exploración, diversidad y reciprocidad

Propuesta inicial: 80% de posiciones por afinidad, 20% exploratorias entre elegibles; si faltan candidatos, devolver menos sin repetir. Selección determinista por seed permite reproducir QA. No ordenar por XP como único criterio: el usuario nuevo también debe poder aparecer.

Preferencias inversas blandas pueden contribuir a estimar respuesta cuando existan datos; no exigir igualdad de rangos. Nunca cambiar las preferencias explícitas del usuario a partir de feedback. No afirmar que una conexión pendiente garantiza interés recíproco.

Controlar concentración de exposición por perfil y celda, sin exponer métricas individuales al cliente. Diversidad se aplica después de elegibilidad. Cada cursor fija seed, modelo, versión de preferencias y seen-set; no mezclar cursores entre usuarios/contextos.

## 6. Aprendizaje desde la primera versión

Impresión válida: tarjeta visible confirmada por cliente, deduplicada por usuario/perfil/request; no contar un resultado que nunca se mostró. Guardar conectar, rechazar y conexión mutua con referencia a impresión cuando existe. Feedback no observado no es rechazo.

Actualización inicial explícita y acotada: mantener vector de afinidad a características; conectar +1, conexión mutua +2, descartar −0.25, cada evento deduplicado. Decaimiento por edad de señal con semivida propuesta de 30 días. Mezclar `score = (1-alpha)*s0 + alpha*sb`, con `alpha = min(.35, n/(n+50))`, donde n son interacciones válidas únicas. Valores iniciales versionados y testeados; no cambiar parámetros en silencio.

Señales de privacidad o bloqueo excluyen al individuo, no entrenan una preferencia general sobre grupos de personas. No usar contenido de mensajes. Aceptar entrenamiento puede evaluar objetivo de entrenamiento, sin tratarlo como señal de citas.

Evolución futura permitida por contrato: modelo colaborativo o de ranking entrenado, solo después de dataset real con consentimiento apropiado, corte temporal y mejora demostrada. La primera versión ya adapta preferencias, por lo que el requerimiento de aprendizaje no se pospone indefinidamente.

## 7. Resiliencia y operación

- Backend publica outbox dentro de transacción; entrega por lotes, dedupe `eventId`, versiones monotónicas por agregado y cola de eventos inválidos con conteos.
- Desfase objetivo de proyección p95 ≤5 s en QA, medido, no supuesto. Filtro final de backend protege durante ese desfase.
- Presupuesto interno 300 ms; timeout abre fallback local por intención/intereses/cercanía sobre candidatos autorizados. Reintentos de eventos se hacen fuera del request de usuario, con backoff limitado y observabilidad.
- Flags separados: llamadas al motor, aprendizaje, versión del ranker. Mantener versión previa y replay de fixture para rollback.
- Métricas: request latency, candidate count, exclusions by reason agregados, fallback rate, projection lag, duplicates, coverage, exposición. No loguear coordenadas/personas/contactos ni texto de preferencias sensibles.
- Borrado: tombstone versionado elimina perfil/señales referenciables y caches; reintentar evento viejo no lo resucita. Replay respeta tombstones.

## 8. DoD específico

1. Todos los H4 dirigidos pasan en repo R y integración backend; repositorio separado inicia sin acceso a tablas privadas de negocio.
2. Cero violaciones de elegibilidad en fixture mixto, fallback, paginación y cambios de filtro; controles de edad 17/18 y género ambos incluidos.
3. Golden dataset documenta orden esperado y motivos para usuario sin historial; se prueba escenario con campos faltantes.
4. Feedback repetido no duplica aprendizaje; un rechazo no domina permanentemente el perfil; versión del modelo reproducible.
5. Evaluación separa Recall@20/NDCG@20 con labels sintéticos de métricas reales. Para uso real registrar conexiones mutuas por impresión, respuestas e invitaciones aceptadas por intención, con tamaño de muestra e intervalo; no afirmar éxito con dos cuentas artificiales.
6. Prueba con 10.000 perfiles sintéticos y 20 solicitudes concurrentes cumple presupuesto o abre defecto; no extrapolar a producción masiva.
7. Kill-test: desactivar perfil mientras R todavía lo recomienda; ninguna app lo recibe después de validación final.
