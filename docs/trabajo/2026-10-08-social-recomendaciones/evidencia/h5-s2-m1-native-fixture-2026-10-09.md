# H5.S2.M1 — fixture y roles nativos

La build móvil solo activa la fixture cuando `__DEV__` es verdadero y `EXPO_PUBLIC_H5_S2_M1_FIXTURE=1`. La candidata sintética usa un UUID reservado local, y el transporte intercepta únicamente `GET /me/discovery/deck` y el endpoint exacto `POST /me/discovery/swipes` bajo el origen API configurado. Payload, método, cantidad o concurrencia inesperados fallan antes de llegar al `fetch` real. El resto de las rutas conserva el transporte normal del dispositivo.

La pantalla expone “Fixture QA H5.S2.M1 activa” cuando la opt-in está habilitada, y Maestro exige esa señal antes de tocar la tarjeta. Si no ve la señal o la candidata sintética, el flujo termina sin intentar una decisión. La primera decisión devuelve 503 tras un segundo de espera para observar retirada optimista; el cliente restaura la carta. La segunda respuesta solo se acepta si repite el payload exacto `LIKE` y devuelve 200. Los rótulos visibles solo en modo fixture permiten que Maestro verifique pendiente, rollback y éxito sin inspeccionar estado interno. Los roles `A_ANDROID` y `A_IOS` verifican la identidad de A y guardan tres capturas.

Validación local:

- `yarn workspace @gymsheet/mobile test:h5-s2-m1-fixture`: 6/6 PASS.
- `python3 -m unittest scripts/qa/test_h5_s2_m1_native.py scripts/qa/test_run_social_pair.py`: 43/43 PASS.
- Los drivers nativos están registrados; esta evidencia no afirma aceptación en un teléfono o simulador.

El último preflight PAIR es [ed669d6c-a5b0-4b28-9388-dfa0fcdb117d](../../../../scripts/qa/evidence/runs/ed669d6c-a5b0-4b28-9388-dfa0fcdb117d/manifest.json): la API no estaba lista y Android no tenía dispositivo conectado; el iPhone 17 Pro sí estaba booted al asignar su UDID explícitamente. Ningún driver de UI se inició. Para ejecutar el flujo móvil, iniciar Metro desde una shell de desarrollo con `EXPO_PUBLIC_H5_S2_M1_FIXTURE=1` y abrir esa app en el dispositivo asignado. Si la candidata sintética no aparece, el driver falla antes del botón y no envía una decisión real. El hito permanece EN CURSO hasta que el backend esté listo y ambas plataformas produzcan evidencia en dispositivos.
