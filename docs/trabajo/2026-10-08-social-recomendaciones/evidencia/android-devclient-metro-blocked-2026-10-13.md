# Android local — Metro no accesible desde el dev client

Fecha: 2026-10-13 (America/La_Paz). AVD: `GymSheet_API_36`, Android API 36.

## Hechos observados

- El emulador Android arrancó y `app.gymsheet.mobile` quedó instalada.
- `expo run:android` completó Gradle con `BUILD SUCCESSFUL`; el wrapper terminó con error al no encontrar `lsof` en el `PATH`.
- Metro genera el bundle Android desde el host (`/.expo/.virtual-metro-entry.bundle` respondió HTTP 200).
- Al abrir el dev client con URLs `localhost`, `127.0.0.1`, la IP LAN del host y el puente `10.0.2.2`, React Native presentó `Unable to load script`. No se obtuvo una pantalla de login ni una descarga confirmada del bundle desde el AVD.
- El fallo no se convirtió en un cambio de código: los archivos de la app permanecieron iguales. El AVD se apagó al terminar y el build QA no es evidencia de aceptación funcional.

## Efecto en el plan

La instalación y disponibilidad del emulador ya no son el bloqueo. La ejecución PAIR de Android sigue sin evidencia de runtime. El manifiesto H10 del mismo día registra 18/18 casos `BLOCKED` porque los drivers declarados por rol no existen; H10.S3.M3 también requiere `QA_H10_DISPOSABLE_INVITATION_ID`.

## Reproducción disponible

```sh
cd GymSheetFrontend/apps/mobile
corepack yarn start --dev-client --host lan --port 8081
```

En Android API 36 abrir `gymsheet://expo-development-client/?url=http://10.0.2.2:8081`. Resultado de esta sesión: `Unable to load script`. Reintentar requiere corregir o diagnosticar la ruta de red del dev client antes de usar Android como evidencia PAIR.
