# H6.S3.M6 — regresión web de respuesta fuera de orden

Fecha: 2026-10-10. Alcance: prueba unitaria de `SocialMapClient`; no es aceptación PAIR ni validación nativa.

El test mantiene pendiente la consulta de la zona A, mueve el mapa a B, resuelve B primero y libera A al final. Comprueba que la lista accesible conserva B y no muestra la zona A obsoleta.

## Comandos y resultados

- `PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn workspace @gymsheet/web test --run src/features/social-map/components/social-map-client.test.tsx` — PASS, 1 archivo y 4 pruebas.
- `PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn workspace @gymsheet/web type-check` — PASS (`tsc --noEmit`).

Una ejecución inicial con Node 24.19.0 fue rechazada por el engine del workspace (`>=20 <24`). Con Node 22.23.3, el primer intento del test detectó que el harness emitía `moveend` fuera de `act`; al envolver el evento en `act`, la regresión pasó. No se ejecutó PAIR ni se cambió la implementación de producción.
