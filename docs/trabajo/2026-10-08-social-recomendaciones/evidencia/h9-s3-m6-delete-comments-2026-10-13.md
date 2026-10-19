# H9.S3.M6 — eliminación de comentarios

**Estado:** implementación y E2E local PASS; aceptación PAIR en dispositivo pendiente.

El dueño del reel y el autor del comentario pueden eliminarlo. La Web y la app móvil piden confirmación, llaman al endpoint acotado al reel y refrescan comentarios y conteo. El backend conserva el registro eliminado para mantener referencias de respuestas, pero lo excluye del listado cuando ya no tiene respuestas activas. Un usuario que no es dueño ni autor recibe 404; el dueño del reel no elimina comentarios vecinos por accidente.

## Verificación ejecutada

- Backend: `AUTH_RATE_LIMIT_MAX=100 DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts -t 'H9.S3.M6' --runInBand` → **PASS 1/1** en PostgreSQL QA aislado.
- Web: `yarn workspace @gymsheet/web vitest run src/features/reels/components/reels-page-client.test.tsx src/features/reels/services/reels-service.test.ts` → **PASS 11/11**.
- Web: `yarn workspace @gymsheet/web type-check` → **PASS**.
- Móvil: `yarn vitest run --config apps/mobile/vitest.reels.config.mts` → **PASS 7/7**.
- Móvil: `yarn workspace @gymsheet/mobile type-check` → **PASS**.
- ESLint focal de los archivos cambiados y Prettier → **PASS**.
- El lint global móvil aún falla en `h5-s2-m1-fixture.test.mjs` y `button-accessibility.test.mjs` por globals `Response`, `setImmediate` y `URL` no definidos en esos tests ajenos a este cambio.

El E2E confirma que el comentario objetivo desaparece para quien lo escribió y para el dueño del reel, y que el comentario de otra persona sigue visible. Los flujos de confirmación en Web/móvil cuentan con prueba de UI Web y cobertura de contrato/servicio móvil; falta recorrer la pantalla móvil en un dispositivo y correr el caso PAIR con dos cuentas.
