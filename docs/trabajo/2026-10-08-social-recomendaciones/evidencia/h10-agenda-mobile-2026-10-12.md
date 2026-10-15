# H10 — bandeja y agenda móvil (2026-10-12)

## Alcance implementado

- `GET /me/training-invitations` valida cada entrada con revisión actual, `response` y `meeting` (`null` cuando corresponde); `POST /:id/respond` valida la respuesta `response` por separado del contrato de creación.
- La pantalla `apps/mobile/app/(app)/training-invitations.tsx`, accesible desde Perfil, separa Pendientes, Agenda e Historial. Agenda incluye encuentros cancelados y ordena por `startsAt` ascendente. Las horas se muestran en la zona local del dispositivo.
- La aceptación usa `revisions[0].revision`, disponible para cualquiera de los dos participantes cuando la propuesta actual es de la otra persona. Conserva `clientRequestId` ante un fallo de red, recarga la lista tras aceptar y, ante HTTP 409, descarta la clave anterior y recarga la revisión vigente.
- La acción Rechazar ahora aparece en invitaciones pendientes. Muestra confirmación antes de ejecutar `decision: 'DECLINE'`, conserva la clave idempotente si falla la red, y al completar actualiza la agenda. El cambio local agrega validación del contrato en móvil; pasó la suite focal del servicio (7/7) y el type-check móvil. La corrección backend incluye estado, decisión y migración aditiva, con pruebas unitarias focales (17/17); el E2E PostgreSQL de `DECLINE` y la migración todavía no se pudo ejecutar porque no hay servidor QA local disponible.

## Comandos ejecutados y resultado observado

Desde `GymSheetFrontend`:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn workspace @gymsheet/mobile type-check
```

Resultado final: exit code 0; `tsc --noEmit`, `Done in 4.10s.` y `Done in 4.24s.`. Una ejecución anterior señaló errores de ruta tipada y una revisión posiblemente indefinida; se corrigieron antes de este resultado.

Desde `GymSheetFrontend/apps/mobile`:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin node --import ./scripts/register-ts-extension.mjs --test --experimental-strip-types src/features/training-invitations/training-invitations-service.test.ts
```

Resultado previo de esta evidencia: exit code 0; TAP `1..6`, `pass 6`, `fail 0`, `skipped 0`. La suite posterior, que ya cubre `DECLINE`, pasó 7/7 en la continuación del 2026-10-12.

Desde `GymSheetFrontend/apps/mobile`:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn eslint 'app/(app)/training-invitations.tsx' 'app/(app)/_layout.tsx' 'app/(app)/(tabs)/profile.tsx' 'src/features/training-invitations/training-invitations-contract.ts' 'src/features/training-invitations/training-invitations-service.ts' 'src/features/training-invitations/training-invitations-service.test.ts'
```

Resultado final: exit code 0; `Done in 0.90s.`.

Desde `GymSheetFrontend`:

```sh
git diff --check
```

Resultado: exit code 0, sin salida de errores de whitespace.

## Límite de la evidencia

No se ejecutó la pantalla en Android/iOS ni un flujo con dos cuentas o dispositivos. Los tests prueban contratos y clasificación con fixtures; no prueban un intercambio HTTP real desde el móvil, notificación en vivo, accesibilidad con lector de pantalla ni aceptación PAIR H10. El bundle Android se exportó correctamente en una ejecución posterior; eso verifica Metro, pero no equivale a instalar y recorrer la pantalla en un emulador. Este slice no cierra H10.S3 ni H10 completo.
