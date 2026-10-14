# Reintento de Android QA

Fecha: 2026-10-09. Se revisó el estado sin borrar datos existentes.

- `emulator -list-avds`: vacío.
- `adb devices -l`: ningún dispositivo conectado.
- `df -h /`: 7.6 GiB libres al iniciar el reintento; después de actividad del sistema, 3.5 GiB libres.
- SDK Manager inició `system-images;android-36;google_apis;arm64-v8a`, pero la descarga parcial llegó a ~863 MiB y se canceló antes de extraerla para no arriesgar el espacio necesario por el emulador y el resto del trabajo. No quedó imagen ni AVD instalado.
- Tras cancelar, `/sdk/.temp` no contenía paquetes parciales; el volumen reportó 3.3 GiB libres.

Resultado: H1.S1.M3 permanece BLOCKED por espacio seguro insuficiente para instalar y arrancar un AVD. No se limpió caché ni dato ajeno.
