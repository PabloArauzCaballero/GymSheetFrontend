# H9.S2 — feeds e interacciones de reels

Fecha: 2026-10-13. Cambios en Backend y Frontend, sobre el trabajo ya publicado.

## Resultado

- Backend añade migración de guardados privados, reposts reversibles, likes, comentarios/respuestas de un nivel y estado de comentarios. Las mutaciones revalidan acceso al ejecutarse; el endpoint de media vuelve a revisar consentimiento, conexión, bloqueos, suspensión, edad disponible y estado del reel.
- Moderación acepta reportes REEL dentro del flujo existente. Tres reporteros distintos disparan auto-ocultamiento reversible; el contenido sale del feed y la descarga autenticada de una URL previa devuelve 404.
- `GET /me/reels/feed` expone `MINE`, `FOR_YOU` y `CONNECTIONS`, con cursor firmado ligado al usuario y tab. Los reposts se agrupan por reel y conservan atribución de quienes lo compartieron. `GET /me/reels/saved` devuelve solo los guardados del actor.
- Web ofrece tabs, likes, guardados, reposts y consulta/publicación de comentarios. Los schemas compartidos aceptan los campos sociales y el cursor. El servicio móvil expone los mismos contratos y acciones sociales.
- La web permite reportar el reel desde su tarjeta; el panel de moderación reconoce `REEL` en su contrato de cola y detalle.
- El cursor retiene los microsegundos de PostgreSQL; las pruebas verifican página 50 + 1 sin duplicados, rechazo de cursor usado con otro tab y separación de feeds.
- La retirada por el dueño o el auto-ocultamiento por reportes elimina el acceso desde feed/guardados y bloquea una URL previa de media.

## Verificación ejecutada

- Backend: `DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa NODE_ENV=test npm run test:e2e -- --runInBand test/social/reels.e2e-spec.ts` — **13/13 PASS** en PostgreSQL 16.14 aislado. Incluye migraciones desde base vacía, uploads previos, feeds, privacidad de guardados, paginación, deduplicación/undo de repost, cierre y threading de comentarios, likes idempotentes, reportes, auto-ocultamiento y retirada/media privada.
- Backend: `npm run type-check`, ESLint focal, Prettier focal y `git diff --check` — **PASS**.
- Moderación backend: E2E `test/social/moderacion-avisos.e2e-spec.ts` **1/1 PASS**; servicios/política de moderación **30/30 PASS**.
- Web: type-check, ESLint y Prettier focal — **PASS**; Vitest de cliente/servicio — **10/10 PASS**.
- Móvil: type-check — **PASS**; Vitest dedicado `vitest.reels.config.mts` — **5/5 PASS**.

## Alcance pendiente

Esta evidencia cubre contratos y comportamiento de API/servicios. No demuestra flujo PAIR con dos cuentas en Android/iOS/web, UI de reels nativa, recorte/portada, ranking fitness de producción ni despliegue. H9 y H12 siguen abiertos hasta cerrar esos casos y correr aceptación de dispositivo.
