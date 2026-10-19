# H3.S1.M1 — Conexión entre gimnasios

Fecha: 2026-10-09. Checkout backend con cambios locales preexistentes preservados.

Se añadió [conexiones.e2e-spec.ts](../../../../../GymSheetBackend/test/social/conexiones.e2e-spec.ts). El caso crea dos adultos por HTTP, los ubica en gimnasios distintos, activa consentimiento bilateral de perfil y descubrimiento cross-gym, y recorre solicitud, aceptación y listado de la conexión autenticado como ambas personas. El consentimiento explícito mantiene la regla de privacidad existente; la prueba no relaja la política.

Base de QA PostgreSQL temporal aislada en `/private/tmp/gym-sheet-social-qa-20261009`, puerto 55433, migrada desde el esquema del repositorio hasta `202610090015`. No se usó Docker ni datos de una base existente. Salida dirigida:

```text
PASS test/social/conexiones.e2e-spec.ts
  cross-gym connections (e2e)
    ✓ H3.S1.M1 connects opted-in adult members across gyms and lists the connection for both (529 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

ESLint del archivo y `yarn tsc --noEmit` pasan. El cierre de fixture dejó 0 tenants temporales, 0 conexiones de prueba, 0 cuentas de prueba con perfil/mapa/discovery activo y 0 cuentas fuera del tenant predeterminado. El cluster PostgreSQL temporal se detuvo y eliminó después de verificar el estado.

## H3.S1.M2 — aislamiento de datos administrativos

La regresión roja confirmó que un administrador de A recibía la decisión de asistencia de B desde `/admin/access/history?usuarioId=...`. Se añadió alcance de tenant a ambas rutas administrativas de acceso: historial y evento por ID. El listado administrativo de socios también se verifica vacío para la cuenta ajena; credenciales y eventos por ID responden 404. El gimnasio propietario puede leer su propio socio/evento y obtiene los datos sembrados.

Salida de la suite dirigida completa, contra el mismo PostgreSQL temporal:

```text
PASS test/social/conexiones.e2e-spec.ts
  cross-gym connections (e2e)
    ✓ H3.S1.M1 connects opted-in adult members across gyms and lists the connection for both (524 ms)
    ✓ H3.S1.M2 hides connected users’ membership and access credentials from another gym (1189 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

La prueba roja mostró una decisión de asistencia de B en la respuesta del admin A; los endpoints de historial y evento no aplicaban aislamiento por tenant.

## H3.S1.M3–M5 — carrera, aceptación y descarte persistente

La prueba de concurrencia envía solicitudes simultáneas desde A y B en gimnasios distintos con consentimiento mutuo: ambas respuestas devuelven el mismo ID y la base conserva una sola conexión `ACCEPTED`. La regresión de actor tercero devuelve 404 y conserva el estado `PENDING`. La regresión de descarte registra PASS, renueva la sesión y confirma que el otro socio sigue en `passes-sent`; sólo desaparece tras la acción explícita de borrar el descarte. La ficha de esas interacciones incluye candidatos cross-gym sólo bajo el consentimiento y estado de elegibilidad actual.

Salida final de la suite completa, PostgreSQL temporal:

```text
PASS test/social/conexiones.e2e-spec.ts
  cross-gym connections (e2e)
    ✓ H3.S1.M1 connects opted-in adult members across gyms and lists the connection for both (665 ms)
    ✓ H3.S1.M2 hides connected users’ membership and access credentials from another gym (1321 ms)
    ✓ H3.S1.M3 serializes simultaneous cross-gym requests into one accepted connection (676 ms)
    ✓ H3.S1.M4 prevents a third person from accepting someone else’s request (756 ms)
    ✓ H3.S1.M5 keeps a cross-gym pass after a fresh session until the owner removes it (787 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

ESLint focal y `yarn tsc --noEmit` pasan. Al cerrar, las consultas confirmaron 0 tenants, sucursales, dispositivos, eventos y conexiones temporales. Se detectaron también filas de descarte y cuentas optadas para discovery procedentes de ejecuciones rojas anteriores de M5; eran sólo del PostgreSQL temporal aislado y se eliminaron al detener y borrar el cluster completo. No se usó ni modificó una base compartida. H3.S1.M1–M5 quedan HECHO a nivel backend. H3 continúa abierto para UI y aceptación multiplataforma.
