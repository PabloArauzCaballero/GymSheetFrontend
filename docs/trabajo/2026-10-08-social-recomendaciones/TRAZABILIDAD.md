# Trazabilidad de requisitos y pruebas
Estado inicial: todos los casos pendientes; los IDs son nombres obligatorios para las pruebas futuras. La matriz operativa se genera del plan escrito, no de resultados de ejecución.
| Requisito | Hitos responsables | Estado |
|---|---|---|
| R01 | H1; aceptación H12 | TODO |
| R02 | H1; aceptación H12 | TODO |
| R03 | H2; aceptación H12 | TODO |
| R04 | H2; aceptación H12 | TODO |
| R05 | H2; aceptación H12 | TODO |
| R06 | H2; aceptación H12 | TODO |
| R07 | H3, H6; aceptación H12 | TODO |
| R08 | H2, H4, H5, H6; aceptación H12 | TODO |
| R09 | H2, H4, H5, H6; aceptación H12 | TODO |
| R10 | H4; aceptación H12 | TODO |
| R11 | H3, H4, H5; aceptación H12 | TODO |
| R12 | H3, H5; aceptación H12 | TODO |
| R13 | H10; aceptación H12 | TODO |
| R14 | H10; aceptación H12 | TODO |
| R15 | H10; aceptación H12 | TODO |
| R16 | H8; aceptación H12 | TODO |
| R17 | H7; aceptación H12 | TODO |
| R18 | H7; aceptación H12 | TODO |
| R19 | H7; aceptación H12 | TODO |
| R20 | H7; aceptación H12 | TODO |
| R21 | H3, H7, H8, H10, H11; aceptación H12 | TODO |
| R22 | H3, H7, H8, H11; aceptación H12 | TODO |
| R23 | H9; aceptación H12 | TODO |
| R24 | H9; aceptación H12 | TODO |
| R25 | H9; aceptación H12 | TODO |
| R26 | H9; aceptación H12 | TODO |
| R27 | H9; aceptación H12 | TODO |
| R28 | H9, H11; aceptación H12 | TODO |
| R29 | H2; aceptación H12 | TODO |
| R30 | H2, H6; aceptación H12 | TODO |
| R31 | H2; aceptación H12 | TODO |
| R32 | H2; aceptación H12 | TODO |
| R33 | H11; aceptación H12 | TODO |
| R34 | H6; aceptación H12 | TODO |
| R35 | H6; aceptación H12 | TODO |
| R36 | H6; aceptación H12 | TODO |
| R37 | H6; aceptación H12 | TODO |

## Casos dirigidos

| Caso | Hito | Capa | Resultado que prueba | Estado |
|---|---|---|---|---|
| H1.S1.M1 | H1 | OPS | Inventariar la base de trabajo | HECHO |
| H1.S1.M2 | H1 | OPS | Fijar herramientas compatibles | HECHO |
| H1.S1.M3 | H1 | OPS | Preparar Android QA | BLOCKED: emulador requiere 7.37 GiB; disponibles ~3.3 GiB durante intento |
| H1.S1.M4 | H1 | OPS | Preparar iOS QA | HECHO: iPhone 17 Pro booted, app login verificada en Metro |
| H1.S1.M5 | H1 | OPS | Aislar servicios del recorrido | EN CURSO: API/DB local listas y preflight HTTP 200; falta entorno completo web/Metro con mismo runId |
| H1.S2.M1 | H1 | BE | Crear cuentas A y B | TODO |
| H1.S2.M2 | H1 | BE | Definir controles de exclusión | TODO |
| H1.S2.M3 | H1 | BE | Demostrar idempotencia del seed | TODO |
| H1.S2.M4 | H1 | BE | Rechazar seed productivo | TODO |
| H1.S2.M5 | H1 | BE | Limpiar exclusivamente datos QA | TODO |
| H1.S3.M1 | H1 | PAIR | Validar aislamiento de sesión | BLOCKED: Android ausente |
| H1.S3.M2 | H1 | PAIR | Añadir sesión web | BLOCKED: Android ausente |
| H1.S3.M3 | H1 | PAIR | Capturar una ejecución trazable | BLOCKED: Android ausente |
| H1.S3.M4 | H1 | PAIR | Comprobar persistencia inicial | BLOCKED: Android ausente |
| H2.S1.M1 | H2 | BE | Separar borrador privado | TODO |
| H2.S1.M2 | H2 | BE | Aplicar edad adulta | TODO |
| H2.S1.M3 | H2 | BE | Validar campos mínimos | TODO |
| H2.S1.M4 | H2 | BE | Publicar DTO mínimo | TODO |
| H2.S1.M5 | H2 | BE | Reusar XP e insignias | TODO |
| H2.S1.M6 | H2 | BE | Persistir pausa | TODO |
| H2.S2.M1 | H2 | PAIR | Ofrecer activación voluntaria | TODO |
| H2.S2.M2 | H2 | PAIR | Reanudar el paso incompleto | TODO |
| H2.S2.M3 | H2 | PAIR | Editar galería pública | TODO |
| H2.S2.M4 | H2 | PAIR | Guardar intenciones múltiples | TODO |
| H2.S2.M5 | H2 | PAIR | Configurar filtros independientes | TODO |
| H2.S2.M6 | H2 | PAIR | Abrir enlaces sociales válidos | TODO |
| H2.S3.M1 | H2 | PAIR | Continuar sin GPS | TODO |
| H2.S3.M2 | H2 | PAIR | Separar visibilidad de mapa | TODO |
| H2.S3.M3 | H2 | PAIR | Descubrir contactos voluntariamente | TODO |
| H2.S3.M4 | H2 | PAIR | Revocar contactos | TODO |
| H2.S3.M5 | H2 | PAIR | Resolver permiso no disponible en web | TODO |
| H2.S4.M1 | H2 | BE | Aplicar esquema sin pérdida | TODO |
| H2.S4.M2 | H2 | BE | Reabrir desde base vacía | TODO |
| H3.S1.M1 | H3 | BE | Permitir conexión entre gimnasios | HECHO |
| H3.S1.M2 | H3 | BE | Mantener aislamiento administrativo | HECHO |
| H3.S1.M3 | H3 | BE | Unificar solicitudes concurrentes | HECHO |
| H3.S1.M4 | H3 | BE | Validar quién acepta | HECHO |
| H3.S1.M5 | H3 | BE | Aplicar descarte persistente | HECHO |
| H3.S2.M1 | H3 | PAIR | Responder solicitudes recibidas | TODO |
| H3.S2.M2 | H3 | PAIR | Retirar solicitud pendiente | TODO |
| H3.S2.M3 | H3 | PAIR | Deshacer descarte | TODO |
| H3.S2.M4 | H3 | PAIR | Sincronizar el botón conectar | TODO |
| H3.S3.M1 | H3 | BE | Hacer desaparecer chat | TODO |
| H3.S3.M2 | H3 | BE | Cerrar acceso por socket | TODO |
| H3.S3.M3 | H3 | BE | Crear chat nuevo al reconectar | TODO |
| H3.S3.M4 | H3 | BE | Aplicar bloqueo a recursos existentes | TODO |
| H3.S3.M5 | H3 | BE | Invalidar acceso al historial previo | TODO |
| H3.S4.M1 | H3 | BE | Aplicar esquema sin pérdida | TODO |
| H3.S4.M2 | H3 | BE | Reabrir desde base vacía | TODO |
| H4.S1.M1 | H4 | REC | Aislar el servicio | HECHO |
| H4.S1.M2 | H4 | REC | Validar contrato interno | HECHO |
| H4.S1.M3 | H4 | REC | Consumir evento duplicado | HECHO |
| H4.S1.M4 | H4 | REC | Ignorar evento atrasado | HECHO |
| H4.S1.M5 | H4 | REC | Eliminar perfil proyectado | HECHO |
| H4.S2.M1 | H4 | REC | Respetar género obligatorio | HECHO |
| H4.S2.M2 | H4 | REC | Conservar edad y distancia estrictas | HECHO |
| H4.S2.M3 | H4 | REC | Inferir afinidad inicial | HECHO |
| H4.S2.M4 | H4 | REC | Tratar campos desconocidos | HECHO |
| H4.S2.M5 | H4 | REC | Explorar sin saltar filtros | HECHO |
| H4.S2.M6 | H4 | REC | Evitar duplicados al paginar | HECHO |
| H4.S3.M1 | H4 | REC | Aprender de señales válidas | HECHO (impresión observada, outbox, entrega y retractación verificados E2E; falta PAIR) |
| H4.S3.M2 | H4 | REC | Limitar efecto de una interacción | HECHO |
| H4.S3.M3 | H4 | REC | Evitar fuga de evaluación | HECHO |
| H4.S3.M4 | H4 | REC | Separar calidad sintética de real | HECHO |
| H4.S3.M5 | H4 | REC | Revertir modelo | HECHO |
| H4.S4.M1 | H4 | BE | Revalidar candidato obsoleto | HECHO: E2E bloquea durante ranking; candidato revocado no se sirve, review limpio |
| H4.S4.M2 | H4 | BE | Continuar ante caída del motor | HECHO: E2E 1/1, fallback con género/edad mínima y máxima |
| H4.S4.M3 | H4 | BE | Invalidar cursor al cambiar filtros | HECHO: 44 pruebas + E2E de segunda página e invalidación |
| H4.S4.M4 | H4 | BE | Evitar latencia acumulada | HECHO: E2E <700 ms, timeout 300 ms y una llamada |
| H5.S1.M1 | H5 | WEB | Rechazar respuesta incompatible | EN CURSO |
| H5.S1.M2 | H5 | WEB | Gestionar vacío real | EN CURSO |
| H5.S1.M3 | H5 | WEB | Reconciliar acción fallida | EN CURSO |
| H5.S1.M4 | H5 | WEB | Recuperar cursor vencido | EN CURSO |
| H5.S2.M1 | H5 | PAIR | Conectar con botones | EN CURSO |
| H5.S2.M2 | H5 | PAIR | Actualizar preferencias visibles | EN CURSO |
| H5.S2.M3 | H5 | PAIR | Mostrar ampliación permitida | TODO |
| H5.S2.M4 | H5 | PAIR | Probar dos decisiones simultáneas | TODO |
| H6.S1.M1 | H6 | BE | Agrupar personas por zona | TODO |
| H6.S1.M2 | H6 | BE | Impedir precisión individual | TODO |
| H6.S1.M3 | H6 | BE | Respetar opt-in específico | TODO |
| H6.S1.M4 | H6 | BE | Conservar posición real | TODO |
| H6.S1.M5 | H6 | BE | Aplicar exclusiones comunes | TODO |
| H6.S1.M6 | H6 | BE | Validar límites geográficos | TODO |
| H6.S2.M1 | H6 | BE | Seleccionar fuente verificable | HECHO: snapshot OSM, 3/3 E2E y manifiesto con fuente/licencia/hash/conteos |
| H6.S2.M2 | H6 | BE | Combinar registrados y externos | TODO |
| H6.S2.M3 | H6 | BE | Deduplicar identidad verificada | TODO |
| H6.S2.M4 | H6 | BE | Distinguir cobertura fallida | TODO |
| H6.S2.M5 | H6 | BE | Validar coordenadas de establecimiento | HECHO: rechaza Null Island; importador y API E2E 3/3 |
| H6.S3.M1 | H6 | PAIR | Alternar capas | TODO |
| H6.S3.M2 | H6 | PAIR | Abrir perfiles de zona | TODO |
| H6.S3.M3 | H6 | PAIR | Explorar ciudad remota | TODO |
| H6.S3.M4 | H6 | PAIR | Consultar ficha de gimnasio | TODO |
| H6.S3.M5 | H6 | PAIR | Resolver fallos de mapa | TODO |
| H6.S3.M6 | H6 | PAIR | Descartar respuesta obsoleta | TODO |
| H6.S4.M1 | H6 | BE | Aplicar esquema sin pérdida | TODO |
| H6.S4.M2 | H6 | BE | Reabrir desde base vacía | HECHO: PostgreSQL temporal vacío, migraciones y fixture OSM PASS; evidencia backend-social-map-places.txt |
| H7.S1.M1 | H7 | BE | Persistir mensaje idempotente | HECHO: E2E PostgreSQL de reintentos concurrentes |
| H7.S1.M2 | H7 | BE | Guardar audio válido | HECHO: E2E privado tras recrear app, AAC-LC validado, 60 unitarias + 4 E2E |
| H7.S1.M3 | H7 | BE | Validar sticker de catálogo | HECHO: allowlist estricta, URL arbitraria sin fetch, E2E 1/1 + review |
| H7.S1.M4 | H7 | BE | Entregar foto sin metadatos privados | HECHO: 52 pruebas dirigidas + E2E local 2/2, dos revisiones independientes |
| H7.S1.M5 | H7 | BE | Revalidar mensaje en cola | HECHO: E2E local 1/1, rechazo después del bloqueo sin persistencia, archivo ni emisión |
| H7.S2.M1 | H7 | BE | Aplicar límite de edición | HECHO: límite servidor 15 min, retry idempotente preservado, gate 7/7 + review |
| H7.S2.M2 | H7 | BE | Rechazar edición ajena | HECHO: 404, estado/ambos historiales intactos, cero evento; gate 1/1 + regresión 13/13 + review |
| H7.S2.M3 | H7 | BE | Eliminar solo para mí | HECHO: marcador por usuario, historial/media/preview persistentes; carreras de emisión/push cubiertas, gate 4/4 + suite 21/21 + review |
| H7.S2.M4 | H7 | BE | Aplicar límite de borrado global | HECHO: `EVERYONE` autor ≤24h, tombstone y digest privado; media/retries/eventos/vista única revalidados, carrera stale-view cerrada; 6 suites/28 E2E + 78 unidades + review |
| H7.S2.M5 | H7 | BE | Revocar adjunto eliminado | HECHO: audio con URL ya guardada devuelve404 tras borrar; tombstone sin re-publicación; web/móvil limpian estado por `message:deleted`; gates E2E + clientes + review |
| H7.S3.M1 | H7 | BE | Guardar excepción individual | HECHO: default activo; override solo AB; AC hereda; PostgreSQL E2E y revisión PASS |
| H7.S3.M2 | H7 | BE | Aplicar selección múltiple | HECHO: solo AB/AC cambian; AD y cutoff global permanecen; PostgreSQL E2E PASS |
| H7.S3.M3 | H7 | BE | Aplicar Todas a futuras | HECHO: excepciones borradas y nuevo chat hereda default; PostgreSQL E2E PASS |
| H7.S3.M4 | H7 | BE | Respetar reciprocidad | HECHO: cursor previo se oculta y nuevas lecturas no se publican; leído/entregado internos siguen |
| H7.S3.M5 | H7 | BE | Evitar lectura retroactiva | HECHO: `readFrom` entre m1 y m2; m1 excluido y m2 cubierto; backend E2E + dominio PASS |
| H7.S3.M6 | H7 | BE | Mantener entrega y no leídos | HECHO: entrega y cursor interno avanzan sin recibo público; backend E2E PASS |
| H7.S4.M1 | H7 | PAIR | Gestionar permisos de micrófono | EN CURSO |
| H7.S4.M2 | H7 | PAIR | Enviar audio entre dispositivos | EN CURSO |
| H7.S4.M3 | H7 | PAIR | Editar con teclado abierto | EN CURSO |
| H7.S4.M4 | H7 | PAIR | Configurar alcance del visto | EN CURSO |
| H7.S4.M5 | H7 | PAIR | Limpiar chat revocado | EN CURSO |
| H7.S5.M1 | H7 | BE | Aplicar esquema sin pérdida | HECHO |
| H7.S5.M2 | H7 | BE | Reabrir desde base vacía | HECHO |
| H8.S1.M1 | H8 | BE | Ver historia entre gimnasios | HECHO: E2E API local |
| H8.S1.M2 | H8 | BE | Restringir selección de audiencia | HECHO: B permitido, C excluido de feed/view/media en E2E |
| H8.S1.M3 | H8 | BE | Respetar expiración | HECHO: E2E de enlace expirado |
| H8.S1.M4 | H8 | BE | Restringir lista de viewers | HECHO: autor permitido, tercero 404 en E2E |
| H8.S2.M1 | H8 | BE | Crear reacción una vez | HECHO: retry idempotente persiste un mensaje |
| H8.S2.M2 | H8 | BE | Responder con texto | HECHO: referencia persistida y navegable en clientes |
| H8.S2.M3 | H8 | BE | Ocultar referencia expirada | HECHO: no disponible preserva texto y oculta media |
| H8.S2.M4 | H8 | BE | Rechazar reacción tras desconexión | HECHO: rechazo sin chat/mensaje nuevo |
| H8.S3.M1 | H8 | PAIR | Publicar con selección | EN CURSO: selectores web/móvil y guards locales; PAIR bloqueado |
| H8.S3.M2 | H8 | PAIR | Reproducir con lifecycle | EN CURSO: lógica y tests locales; falta aceptación en dispositivo |
| H8.S3.M3 | H8 | PAIR | Recuperar subida fallida | EN CURSO: idempotencia y retry local; falta corte real de red/PAIR |
| H8.S3.M4 | H8 | PAIR | Eliminar historia propia | EN CURSO: E2E y reconciliación local; falta viewer/device PAIR |
| H8.S4.M1 | H8 | BE | Aplicar esquema sin pérdida | HECHO: rollback/up conserva fila y valida constraints |
| H8.S4.M2 | H8 | BE | Reabrir desde base vacía | HECHO: cadena completa `template0` + fixture de story |
| H9.S1.M1 | H9 | BE | Validar duración de pista MP4 desde el servidor | HECHO: parser 17/17; `mvhd`/`mdhd`/`elst` contrastados con `stts`, muestras dentro de `mdat`; límite 89.9/90 aceptado, 90.1 rechazado. No decodifica codec; PAIR BLOCKED |
| H9.S1.M2 | H9 | BE | Evitar publicación incompleta | HECHO: upload storage fallido no crea fila y PROCESSING queda fuera del feed |
| H9.S1.M3 | H9 | BE | Reintentar procesamiento | EN CURSO: retry durable de upload/rollback protegido; E2E 1/1; worker/transcodificación pendientes |
| H9.S1.M4 | H9 | BE | Validar archivo por contenido | HECHO: parser 17/17 valida tablas `stsz`/`stsc`/`stco`/`co64` y rangos en `mdat`; falso MP4 rechazado; smoke ffmpeg de MP4 real 1 s aceptado por el parser; no valida decode de codec; PAIR BLOCKED |
| H9.S2.M1 | H9 | BE | Separar dos feeds | HECHO: feeds MINE/FOR_YOU/CONNECTIONS, autorización y filtros; E2E PostgreSQL PASS; ver evidencia H9.S2 2026-10-13 |
| H9.S2.M2 | H9 | BE | Mantener guardados privados | HECHO: colección privada por actor y visibilidad revalidada; E2E PostgreSQL PASS; ver evidencia H9.S2 2026-10-13 |
| H9.S2.M3 | H9 | BE | Deduplicar reposts | HECHO: original agrupado con atribuciones de repost; E2E PostgreSQL PASS; ver evidencia H9.S2 2026-10-13 |
| H9.S2.M4 | H9 | BE | Deshacer repost | HECHO: repost reversible sin retirar original; E2E PostgreSQL PASS; ver evidencia H9.S2 2026-10-13 |
| H9.S2.M5 | H9 | BE | Aplicar comentario cerrado | HECHO: cierre, replies de un nivel y likes idempotentes; E2E PostgreSQL PASS; ver evidencia H9.S2 2026-10-13 |
| H9.S2.M6 | H9 | BE | Retirar contenido eliminado | HECHO: borrado del autor y auto-ocultamiento tras tres reporteros distintos; feed/guardados/URL previa de media revocados; E2E PASS; ver evidencia H9.S2 2026-10-13 |
| H9.S3.M1 | H9 | PAIR | Crear video recortado | TODO |
| H9.S3.M2 | H9 | PAIR | Publicar desde cámara o archivo | EN CURSO: UI web/móvil con captura/selección y upload; type-check/servicio móvil PASS; falta validación de dispositivo/PAIR |
| H9.S3.M3 | H9 | PAIR | Mantener un reproductor activo | EN CURSO: UI web pausa video previo al iniciar otro; falta scroll de 30 y PAIR |
| H9.S3.M4 | H9 | PAIR | Conectar desde autor | TODO |
| H9.S3.M5 | H9 | PAIR | Comentar y responder | EN CURSO: API y UI web/móvil para comentar/responder/like; falta PAIR; evidencia H9.S2 2026-10-13 |
| H9.S3.M6 | H9 | PAIR | Borrar comentario como autor | EN CURSO: endpoint, UI Web/móvil y prueba PostgreSQL cubiertos; PAIR en dispositivo pendiente |
| H9.S4.M1 | H9 | BE | Aplicar esquema sin pérdida | HECHO: E2E 1/1 conserva usuario/story previos y confirma CHECK por duration/provider/status inválidos |
| H9.S4.M2 | H9 | BE | Reabrir desde base vacía | HECHO: registro completo desde template0, fixture, constraint y rollback protegido |
| H10.S1.M1 | H10 | BE | Restringir a conexiones | HECHO: PostgreSQL E2E rechaza no conectado/bloqueado y confirma cero invitación/revisión al rechazar |
| H10.S1.M2 | H10 | BE | Crear invitación puntual | HECHO: PostgreSQL E2E persiste invitación pública y revisión; fecha/zona/modo y replay/conflict verificados |
| H10.S1.M3 | H10 | BE | Aceptar una sola revisión | HECHO: E2E PostgreSQL transaccional crea un encuentro y evento único; ambos participantes leen el evento system; rollback forzado y replay concurrente cubiertos |
| H10.S1.M4 | H10 | BE | Contraproponer horario | HECHO: E2E PostgreSQL verifica una revisión/comando ante retry concurrente, conflicto de payload, rechazo de revisión stale y aceptación por el otro participante |
| H10.S1.M5 | H10 | BE | Vencer invitación pendiente | HECHO: al intentar aceptar después del inicio, transacción persiste EXPIRED + comando único; el endpoint devuelve 409 tras commit y no crea agenda/chat |
| H10.S1.M6 | H10 | BE | Cancelar tras desconexión | HECHO: backend; E2E PostgreSQL verifica cancelación de reunión futura y propuesta pendiente, agendas de ambos, tercero sin acceso y chat revocado; [evidencia](evidencia/backend-h10-s1-m6-qa-2026-10-12.md) |
| H10.S2.M1 | H10 | BE | Mantener rutinas propias | HECHO: PostgreSQL E2E verifica rutina y sesión propias por participante; [evidencia H10 S2/S4](evidencia/backend-h10-s2-s4-qa-2026-10-12.md) |
| H10.S2.M2 | H10 | BE | Compartir solo una sesión | HECHO (backend) |
| H10.S2.M3 | H10 | BE | Registrar pesos personales | HECHO: PostgreSQL E2E conserva pesos distintos por propietario y no los incluye en el snapshot; [evidencia H10 S2/S4](evidencia/backend-h10-s2-s4-qa-2026-10-12.md) |
| H10.S2.M4 | H10 | BE | Asignar XP individual | HECHO: PostgreSQL E2E otorga XP solo a quien finaliza su sesión; [evidencia H10 S2/S4](evidencia/backend-h10-s2-s4-qa-2026-10-12.md) |
| H10.S2.M5 | H10 | BE | Conservar entrenamiento terminado | HECHO: PostgreSQL E2E conserva historial, series y progreso al cancelar el encuentro; [evidencia H10 S2/S4](evidencia/backend-h10-s2-s4-qa-2026-10-12.md) |
| H10.S3.M1 | H10 | PAIR | Coordinar por chat y perfil | EN CURSO: el formulario web está conectado desde perfil/chat; faltan API real y PAIR |
| H10.S3.M2 | H10 | PAIR | Mostrar horario local correcto | EN CURSO: agendas web/móvil convierten UTC a zona local y pasan pruebas focales; falta PAIR en dos zonas; [web](evidencia/h10-agenda-web-2026-10-12.md), [móvil](evidencia/h10-agenda-mobile-2026-10-12.md) |
| H10.S3.M3 | H10 | PAIR | Exportar sin duplicar | EN CURSO: ICS backend autenticado con UID estable y cancelación versionada; drivers iOS/web agregados y validados, ejecución PAIR bloqueada por API no disponible y falta de invitación QA; simulador iOS arrancado; importación externa aún pendiente; [backend](evidencia/backend-h10-s3-m3-calendar-2026-10-12.md), [clientes](evidencia/h10-s3-m3-calendar-clients-2026-10-12.md), [drivers PAIR](evidencia/h10-s3-m3-pair-drivers-2026-10-12.md) |
| H10.S3.M4 | H10 | PAIR | Continuar sin permiso de calendario | EN CURSO: agenda interna no pide permiso del calendario; alternativa ICS explicada; falta PAIR con dispositivo; [evidencia](evidencia/h10-s3-m4-m5-agenda-map-2026-10-12.md) |
| H10.S3.M5 | H10 | PAIR | Abrir lugar correcto | EN CURSO: web/móvil abren Maps por etiqueta acordada; falta validar destino en dispositivo; [evidencia](evidencia/h10-s3-m4-m5-agenda-map-2026-10-12.md) |
| H10.S4.M1 | H10 | BE | Aplicar esquema sin pérdida | HECHO |
| H10.S4.M2 | H10 | BE | Reabrir desde base vacía | HECHO |
| H11.S1.M1 | H11 | BE | Reportar contenido autorizado | HECHO: referencia y evidencia mínima; no reporta contenido que el usuario ya no puede ver; [E2E](evidencia/h11-s1-moderacion-e2e-2026-10-13.md) |
| H11.S1.M2 | H11 | BE | Restringir administración de gimnasio | HECHO: admin de otro tenant no ve caso ni cola; central sí accede; [E2E](evidencia/h11-s1-moderacion-e2e-2026-10-13.md) |
| H11.S1.M3 | H11 | BE | Ocultar contenido desde moderación | HECHO: el feed omite el reel y el media endpoint da 404; [E2E](evidencia/h11-s1-moderacion-e2e-2026-10-13.md) |
| H11.S1.M4 | H11 | BE | Auditar resolución | HECHO: decisión, moderador, nota, hora y `admin.audit_log` verificados; [E2E](evidencia/h11-s1-moderacion-e2e-2026-10-13.md) |
| H11.S1.M5 | H11 | BE | Conservar evidencia tras revocación | HECHO: participantes pierden historial y central conserva caso mínimo; [E2E](evidencia/h11-s1-moderacion-e2e-2026-10-13.md) |
| H11.S2.M1 | H11 | BE | Deduplicar aviso | HECHO: retry y 8 enqueues concurrentes dejan una notificación y una entrega; [E2E](evidencia/h11-s1-moderacion-e2e-2026-10-13.md). Sin push físico |
| H11.S2.M2 | H11 | BE | Suprimir aviso revocado | HECHO: bloqueo posterior a enqueue produce `SUPPRESSED`, sin intentos, y worker completa el job; E2E aislado |
| H11.S2.M3 | H11 | BE | Reautorizar enlace | HECHO: enlace viejo falla con 404 después de revocar; Web explica indisponibilidad; [E2E](evidencia/h11-s2-m3-m4-notification-safety-2026-10-13.md) |
| H11.S2.M4 | H11 | BE | Respetar privacidad en push | HECHO: preferencia opt-in default false; E2E valida preview genérico/permitido; [evidencia](evidencia/h11-s2-m3-m4-notification-safety-2026-10-13.md) |
| H11.S3.M1 | H11 | PAIR | Reportar desde recurso | EN CURSO: UI Web/móvil conectada; falta recorrido PAIR |
| H11.S3.M2 | H11 | PAIR | Pausar sin perder vínculos | EN CURSO: controles Web/móvil conectados; falta A/B/C simultáneo |
| H11.S3.M3 | H11 | PAIR | Reanudar perfil | EN CURSO: controles Web/móvil conectados; falta validar consentimientos PAIR |
| H11.S3.M4 | H11 | PAIR | Bloquear desde menú | EN CURSO: bloqueo Web/móvil conectado; falta chat y aviso antiguo PAIR |
| H12.S1.M1 | H12 | PAIR | Completar Android A con iOS B | TODO |
| H12.S1.M2 | H12 | PAIR | Invertir dispositivos | TODO |
| H12.S1.M3 | H12 | PAIR | Cruzar Android con web | TODO |
| H12.S1.M4 | H12 | PAIR | Cruzar iOS con web | TODO |
| H12.S1.M5 | H12 | PAIR | Ensayar desconexión y reconexión | TODO |
| H12.S1.M6 | H12 | PAIR | Ensayar permisos y red | TODO |
| H12.S2.M1 | H12 | QA | Medir respuesta con carga | TODO |
| H12.S2.M2 | H12 | QA | Medir reproducción prolongada | TODO |
| H12.S2.M3 | H12 | QA | Verificar accesibilidad | TODO |
| H12.S2.M4 | H12 | QA | Revisar capturas dos veces | TODO |
| H12.S2.M5 | H12 | QA | Ejecutar regresión del entrenamiento | TODO |
| H12.S3.M1 | H12 | OPS | Validar cobertura documental | EN CURSO: 197 IDs/37 requisitos/enlaces auditados; falta amarrar cada HECHO a evidencia ejecutable verificable |
| H12.S3.M2 | H12 | OPS | Verificar último cambio | TODO |
| H12.S3.M3 | H12 | OPS | Ensayar rollback por flags | TODO |
| H12.S3.M4 | H12 | OPS | Cerrar con estado real | TODO |
