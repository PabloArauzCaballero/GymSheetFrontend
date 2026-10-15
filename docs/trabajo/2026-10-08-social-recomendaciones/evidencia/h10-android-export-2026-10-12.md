# H10 — export Android del bundle (2026-10-12)

## Comando ejecutado

Desde `GymSheetFrontend/apps/mobile`:

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin CI=1 node node_modules/expo/bin/cli export --platform android --output-dir /private/tmp/gymsheet-android-export-correct
```

Resultado: **PASS**, exit code 0. Metro empaquetó la entrada de Expo Router con 2.348 módulos; se generó el bundle Android Hermes de 6,9 MB y se exportaron 61 assets a `/private/tmp/gymsheet-android-export-correct`.

## Corrección de diagnóstico

La ejecución anterior mediante `yarn workspace @gymsheet/mobile exec expo export --platform android` no conservó el argumento `--platform` y Expo intentó empaquetar también web. Eso falló porque el paquete opcional `react-native-web` no está instalado. Al ejecutar Expo directamente desde `apps/mobile` con `--platform android`, se empaquetó únicamente Android y no hizo falta añadir esa dependencia.

## Límite

Esto prueba el bundle Android, no el arranque de la app en emulador ni el recorrido PAIR de H10. `adb devices -l` no lista dispositivos y `emulator -list-avds` no lista AVDs en este equipo. La aceptación visual/interactiva sigue pendiente.
