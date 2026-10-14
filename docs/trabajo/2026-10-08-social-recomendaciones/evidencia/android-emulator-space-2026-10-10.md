# Android Emulator: espacio insuficiente (2026-10-10)

Se instaló la imagen temporal `system-images;android-36;google_apis;arm64-v8a` y se creó el AVD `GymSheetSocialAPI36` en `/private/tmp/gymsheet-social-avd`, sin cambiar AVD preexistentes. La configuración de userdata del AVD se redujo a 1 GiB para este intento.

Al arrancarlo en modo headless, el emulador verificó la imagen y falló antes de iniciar Android:

```text
FATAL | Not enough space to create userdata partition. Available: 5461.04 MB ... need 7372.80 MB.
```

Quedaron aproximadamente 5.3 GiB libres. No se borró ninguna carpeta de datos de usuario ni se modificó la configuración de un AVD existente. H1.S1.M3 y la aceptación PAIR que requiere Android siguen pendientes. El AVD y la imagen API 36 instalados para esta prueba son temporales; el AVD no está operativo.
