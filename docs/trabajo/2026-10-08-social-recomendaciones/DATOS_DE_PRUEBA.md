# Usuarios y datos de prueba

Todo dato de persona es sintético. Esta entrega define el seed; no crea cuentas ni modifica una base. No reutilizar una cuenta de test remota sin comprobar el entorno. Credenciales se generan/leen en archivo privado ignorado, no en este documento ni en capturas.

## Conjunto mínimo

| Alias | Estado e identidad sintética | Relación inicial | Propósito |
|---|---|---|---|
| A | Hombre adulto 28, gym QA-Norte, busca mujeres, entrenamiento/amistad/citas, zona Z1 | Sin conexiones | Actor Android por defecto; luego iOS/web. |
| B | Mujer adulta 27, gym QA-Sur, busca hombres, mismas intenciones, zona Z1 | Sin conexiones | Actor iOS por defecto; luego Android/web. |
| C | Mujer adulta 30, gym QA-Centro, zona Z1, social activo | No conectada | Negativo de chat/story, positivo descubrimiento. |
| D | Mujer adulta 29, zona Z1 | Bloqueo predefinido por A solo en escenario bloqueo | Exclusión transversal. |
| E | 17 años, gym QA-Norte | Ninguna | Gate 18+ incluso por endpoint directo. |
| F | Cumple 18 en fixtureClock | Ninguna | Límite de edad inclusivo. |
| G | Mujer adulta, perfil PAUSED | Ninguna | No descubrir; conservar vínculos previos del escenario. |
| H | Mujer adulta, OFF/DRAFT | Ninguna | No publicar borrador. |
| I | Hombre adulto, zona Z1 | Ninguna | Excluir para A que busca mujeres; incluir al cambiar filtro. |
| J | Mujer adulta, zona Z2 remota | Ninguna | Explorar otra ciudad/contexto mapa. |
| K | Mujer adulta, ACTIVE, mapa opt-out | Ninguna | Elegible en tarjetas, excluida de mapa. |
| L | Mujer adulta, fuera de rango edad elegido | Ninguna | Flexibilidad apagada/encendida. |
| M | Mujer adulta, fuera de radio pero dentro de ampliación | Ninguna | Distancia flexible aislada. |
| N | Mujer adulta, contacto verificado y discoverability autorizado | Ninguna | Contactos opt-in. |
| O | Adulto con reportes y contenido suspendido de fixture | Ninguna | Moderación y exclusión. |
| SYS | Administrador central sintético | No social | Moderación transversal. |
| ADM | Administrador gym QA-Norte | No social | No acceder a casos de otro tenant sin permiso central. |

Cumpleaños se derivan de fixtureClock; no hardcodear edades que cambien al ejecutar mañana. Medición de 15 minutos/24 horas mediante clock inyectable solo en tests; no habilitar override de reloj por request de producción.

## Paquetes de escenarios

- `fresh`: A/B sin conexión ni decisiones; onboarding pendiente según caso.
- `connected`: A/B conectados con chat, C excluido. Historias para todos y selección B.
- `revocation`: mensajes texto/foto/audio/sticker, URLs previas, invitación pendiente y aceptada futura, sesión histórica completada.
- `reels`: originales de A/B/C, un reel reposteado por dos conexiones, uno guardado solo por A, comentarios raíz/respuesta, video 89.9/90/90.1 s, corrupto e interrumpido.
- `ranking`: golden de 40 perfiles con contribuciones de score y exclusiones esperadas; carga de 10.000 perfiles sintéticos para rendimiento, no para validar afinidad humana.
- `map`: dos zonas/celdas próximas y una ciudad remota, celdas de borde, gym registrado y externo sintético con la misma identidad vinculada; dataset real externo se evalúa en corrida separada con manifiesto de procedencia.
- `receipts`: m1 leído mientras apagado, m2 leído tras activar, conversación AC con excepción distinta, eliminación local y global independientes.

## Cargador futuro

`B/scripts/qa/seed-social.ts` llama al pipeline de seed existente, acepta `runId`, escenario y fixtureClock; transacción por escenario, IDs UUID deterministas bajo namespace de QA, prefijo de nombres «QA —». Segunda corrida: insertados=0. Modo refresh solo sobre entidades del runId. Limpieza dirigida por relaciones de manifest, jamás TRUNCATE global.

Preflight exige base local/QA allowlisted y credenciales no productivas; `NODE_ENV=production` o host no permitido abortan. Logs muestran conteos e IDs sintéticos, no passwords/tokens. Ningún campo de fixture activa mensajes externos ni correos a personas reales; usar dominio `.test`.

## Verificación de persistencia

Después de cada acción crítica guardar conteos y estado por ID del manifest: conexión, conversación activa/revocada, mensajes/tombstones, recibos, audiencia, saves/reposts, invitación/revisión, agenda por participante y XP antes/después. Las queries se escriben contra nombres reales del modelo al implementar, no se inventan tablas para que el reporte parezca completo.

Cada E2E usa un runId independiente; no borrar datos mientras otro actor sigue probando. Restablecer un escenario solo antes de arrancar ambas sesiones y registrar el reset.
