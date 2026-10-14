# Android Emulator — espacio insuficiente

Fecha: 2026-10-09

Se intentó habilitar Android API 36 para la aceptación social. La imagen `aosp_atd;arm64-v8a` y el perfil AVD temporal no pudieron iniciar el emulador: el proceso requirió 7.37 GiB, con aproximadamente 3.3 GiB disponibles en el volumen. Reducir `disk.dataPartition.size` no cambió el requisito reportado.

Se eliminó solo el AVD creado en esta sesión y se desinstalaron las imágenes API 36 instaladas para el intento. Al terminar, `emulator -list-avds` no mostraba AVDs y `adb devices -l` no mostraba dispositivos. No se eliminó ningún AVD previo ni se limpiaron datos/cachés preexistentes. Android queda BLOQUEADO hasta disponer de más espacio.
