# H10 — cierre funcional y QA local (2026-10-12)

## Sesiones propias y compartidas

La prueba PostgreSQL aislada `test/social/entrenar-juntos.e2e-spec.ts` terminó **8/8 PASS**. Además del snapshot de `SHARED_SESSION`, el recorrido verifica rutinas y sesiones separadas por usuario, pesos distintos de A/B, XP solo para quien termina, desconexión/cancelación sin borrar una sesión ya completada, acceso denegado a terceros y migraciones H10.

Web y móvil ya permiten elegir `OWN_ROUTINES` o `SHARED_SESSION`; en el segundo caso exigen seleccionar una rutina propia y muestran únicamente el snapshot confirmado (nombre y prescripción), sin peso, notas privadas ni progreso personal. Pruebas focales: Web 21/21; móvil 11/11. TypeScript y ESLint focales pasan en ambos clientes; backend type-check, 22 unitarias de las suites involucradas, ESLint y Prettier pasan.

## Exportación de calendario web

Driver `H10.S3.M3-A_WEB` ejecutado contra una API y PostgreSQL temporales en localhost, con dos cuentas sintéticas. **PASS**: la cuenta A descarga el `.ics` dos veces desde `/entrenar-juntos`; ambos archivos y una lectura final conservan el mismo UID. El navegador archivó la captura [H10.S3.M3 web local](h10-s3-m3-web-local-2026-10-12.png).

El driver cierra la guía opcional de bienvenida cuando aparece, para que la capa de tutorial no bloquee los controles de la cuenta sintética recién creada. No cambia el comportamiento del producto.

## Entorno y límites

- API `127.0.0.1:3011`, web `127.0.0.1:3002`, PostgreSQL temporal `127.0.0.1:55432`; se crearon cuentas, rutina, ejercicio e invitación únicamente en esa base.
- No se leyó ni usó la base del puerto 5432 ni credenciales productivas. Los tokens y contraseñas de prueba no se guardaron en evidencia.
- El driver web no reemplaza PAIR iOS/web ni la importación del archivo en un calendario externo. Maestro está instalado, pero la prueba iOS quedó detenida por el servicio del simulador; Android no llegó a un recorrido UI. Por eso H10 permanece EN CURSO hasta esa aceptación.
- Se compiló e instaló la app iOS Release en el simulador iPhone 17 Pro y el login con la cuenta de QA llegó al inicio (PASS parcial). La ejecución nativa se detuvo antes de abrir invitaciones porque `CoreSimulatorService` dejó de responder y `simctl` agotó el tiempo; la hoja nativa de compartir no fue verificada. Android compiló, pero su recorrido UI tampoco se completó. Detalle en [drivers PAIR](h10-s3-m3-pair-drivers-2026-10-12.md).
