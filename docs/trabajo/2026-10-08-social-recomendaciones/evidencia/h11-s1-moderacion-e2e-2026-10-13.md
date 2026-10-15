# H11.S1 — Moderación y revocación de chat

Fecha: 2026-10-13. Código backend publicado como `74c66b4` (sobre `219c168`); la prueba adicional de duplicados concurrentes está en `fa3e5df`.

## Comportamiento cubierto

- El reporte de un mensaje solo se acepta si quien reporta todavía puede verlo. Se conserva referencia y evidencia mínima, sin copiar el cuerpo del chat; un identificador conocido pero no visible devuelve 404.
- Un administrador de gimnasio no puede consultar ni listar un caso de otro tenant, aunque tenga `moderation:read`. El administrador central sí puede abrirlo.
- Resolver un reporte para ocultar un reel lo quita del feed del observador y la URL del archivo responde 404.
- La resolución persiste actor, decisión, nota y hora, y escribe el evento correspondiente en `admin.audit_log`.
- Reportar el mensaje revoca la conversación entre sus participantes. Ambos reciben 404 al pedir historial; el administrador central conserva acceso al caso con evidencia mínima.

## Verificación

- Backend `test/social/moderacion-avisos.e2e-spec.ts`: PostgreSQL E2E PASS 7/7 (H11.S1.M1–M5 y H11.S2.M1–M4).
- H11.S2.M1 focal: PASS 1/1 con ocho llamadas duplicadas concurrentes en transacciones distintas; una notificación y un intento de entrega.
- Backend `src/modules/moderation/moderation.service.spec.ts`: PASS 15/15.
- Node 22; E2E aislado contra `127.0.0.1:55432`, DB base `gymsheet_social_qa`, rol local `postgres`, y `AUTH_RATE_LIMIT_MAX=100`. El test crea su propia base aleatoria, confirma su conexión y la elimina en `afterAll`.
- Primera corrida completa con límite del `.env` falló por 429 al registrar fixtures; se corrigió solo el entorno de prueba y la corrida completa siguiente pasó. Las corridas sin configuración QA o con rol incorrecto fallaron antes de ejecutar casos y no modificaron la base base.
- Backend type-check PASS; prueba unitaria de moderación PASS 15/15.

## Estado y límites

H11.S1.M1–M5 y H11.S2.M1–M4 quedan HECHO para backend. La evidencia verifica idempotencia bajo enqueues concurrentes en PostgreSQL; no valida el transporte push con dispositivos físicos. H11.S3 requiere el recorrido PAIR en móvil/Web.
