# H11.S2.M3–M4 — Enlaces de chat y privacidad de push

Fecha: 2026-10-13. Entorno: Node 22.23.3 y PostgreSQL 16 local. La E2E crea una DB aleatoria desde `template0`, afirma `current_database()` y la elimina en `afterAll`.

## Resultado

- `H11.S2.M3`: una conversación aceptada se puede consultar; al revocar la conexión, abrir el enlace anterior `/chat/:id` provoca una consulta de historial con 404. El cliente web presenta el mensaje accesible “Esta conversación ya no está disponible.”
- `H11.S2.M4`: la migración `202610130004-private-message-previews` agrega `message_preview_enabled DEFAULT false`. Un mensaje de texto genera push genérico si la opción está apagada; tras activarla, el texto se incluye según la preferencia del destinatario. La opción se puede editar desde Preferencias de notificaciones web.
- Regresión H11.S2.M1/M2 permanece verde.

## Verificaciones

- `test/social/moderacion-avisos.e2e-spec.ts` → PASS 4/4 (M1, M2, M3, M4), sobre PostgreSQL temporal; migraciones hasta `202610130004`.
- Backend `yarn type-check` → PASS.
- Backend `src/modules/chat/chat.service.spec.ts` → PASS 41/41.
- Frontend `yarn type-check` → PASS, 11/11 paquetes.
- Web `src/features/chat/components/message-thread-client.test.tsx` → PASS 7/7; verifica el aviso accesible del chat revocado.
- Limpieza incluida en `afterAll`: cierre de conexiones y eliminación verificada de la base temporal.

El runtime global era Node 24, fuera del rango `>=20 <24`; las verificaciones usaron Node 22 disponible en el caché npm. No hubo PAIR físico ni envío a proveedores externos de push.
