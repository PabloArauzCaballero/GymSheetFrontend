# H10 — respuesta DECLINE, trabajo local (2026-10-12)

Se detectó una diferencia entre el contrato de H10, que admite `DECLINED`, y la implementación previa, que solo admitía `ACCEPT`. Se agregó soporte local para ambas respuestas en el backend, los contratos web/móvil y las agendas de ambos clientes. Rechazar requiere confirmación; el servidor conserva la revisión respondida, trata reintentos con la misma clave como idempotentes y solo crea encuentro/chat al aceptar.

## Verificaciones ejecutadas

| Área    | Verificación                              | Resultado              |
| ------- | ----------------------------------------- | ---------------------- |
| Backend | Jest focal de schemas, service y registry | 3 suites, 17/17 PASS   |
| Backend | TypeScript, ESLint y Prettier focales     | PASS                   |
| Web     | Vitest focal de servicio y agenda         | 2 archivos, 18/18 PASS |
| Web     | TypeScript, ESLint y Prettier focales     | PASS                   |
| Móvil   | Node test del contrato de invitaciones    | 7/7 PASS               |
| Móvil   | TypeScript, ESLint y Prettier focales     | PASS                   |

## PostgreSQL E2E

Se intentó ejecutar la prueba E2E de rechazo en la base aislada `gymsheet_social_qa`. Quedó **BLOCKED** antes de llegar al endpoint de invitaciones: no había servidor escuchando en `127.0.0.1:55432` (`ECONNREFUSED` durante el registro del primer usuario). No se aplicaron migraciones ni se alteró una base de datos.

Se intentó preparar un clúster PostgreSQL temporal propio. `initdb` se detuvo antes de crear datos porque macOS no pudo resolver el UID efectivo 501 (`could not look up effective user ID 501: user does not exist`). Se retiró el directorio temporal vacío. No se modificaron cuentas del sistema ni se inició Docker.

La prueba E2E y la comprobación de la constraint de migración para un estado/comando `DECLINED` quedaron agregadas, pero **no ejecutadas**. El cambio permanece EN CURSO hasta correrlas contra PostgreSQL temporal.

## No cubierto

- PostgreSQL E2E, constraints en base real y rollback de la migración.
- Interacción visual en navegador/dispositivo y PAIR de dos usuarios.
- Aceptación de calendario o navegación de lugar en dispositivos.
