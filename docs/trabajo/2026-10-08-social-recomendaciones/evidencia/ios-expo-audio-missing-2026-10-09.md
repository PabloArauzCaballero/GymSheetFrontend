# iOS: `ExpoAudio` ausente del binario QA

Fecha: 2026-10-09

## Observación

Se arrancó sin borrar datos el simulador iPhone 17 Pro (`D4C28B4D-3615-4E6D-9092-C180668D5EE6`) y se abrió `app.gymsheet.mobile`. Metro respondió, pero React Native mostró `Cannot find native module 'ExpoAudio'` al importar el chat. Captura: [ios-expo-audio-missing-2026-10-09.png](ios-expo-audio-missing-2026-10-09.png).

## Evidencia del módulo nativo

- `apps/mobile/package.json` declara `expo-audio` y `apps/mobile/node_modules/expo-audio` existe.
- `apps/mobile/app.json` declara el plugin `expo-audio`.
- `apps/mobile/ios/Podfile.lock` y `apps/mobile/ios/Pods/Manifest.lock` no contienen `ExpoAudio` ni `expo-audio`; tampoco existe el pod dentro de `apps/mobile/ios/Pods`.
- El binario instalado no puede resolver el módulo nativo requerido por el bundle JS actual. La causa inmediata es que el proyecto iOS/Pods y el binario instalado están desfasados respecto a las dependencias actuales.

## Límite de verificación

`df -h .` reportó 392 MiB disponibles; `apps/mobile/ios/build/DerivedData-social-qa` ocupa 3.0 GiB. No se ejecutó `pod install`, prebuild ni Xcode porque la compilación podría agotar el espacio restante. Las variables `QA_TOKEN_A`, `QA_TOKEN_B`, `QA_API_BASE_URL`, `QA_WEB_BASE_URL` y `QA_IOS_UDID` están ausentes; la API en `localhost:3011` tampoco escucha. Por eso no se intentó aceptar H7.S4.M3 ni se modificaron mensajes.

## Próximo paso

Con espacio suficiente y QA API disponible, regenerar Pods e instalar un build nativo que incluya `ExpoAudio`; abrir de nuevo el chat y comprobar que la pantalla funciona antes de ejecutar el driver de pareja. Después, provisionar una sesión iOS cuya identidad se pueda cotejar con `QA_TOKEN_A` y completar H7.S4.M3 con Maestro.
