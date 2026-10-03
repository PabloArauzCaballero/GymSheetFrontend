# Relevo de calidad visual y paridad web — 3 de octubre de 2026

## Entregado en este relevo

- Se recuperó la compilación del móvil tras mover `training-metrics` a `@gymsheet/domain`. El mismo paquete ahora expone la política de ubicación y las funciones del plan semanal.
- La web añade Ajustes (cuenta, tema, versión, créditos y salida), filtro de ejercicios por zona y músculo, programación de una rutina en la semana, vista semanal, ubicación opcional al finalizar y comparación semanal en el panel.
- El BFF permite `/routines/:id/schedule`; se verificó el contrato con el código del backend NestJS. El cierre acepta coordenadas opcionales y sigue si se deniega la ubicación.
- Se amplió el área táctil del filtro y del selector a 44 px y se respetó `prefers-reduced-motion`.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| `curl` a `/anatomy/surface-front.webp` en Contabo | HTTP 200, `image/webp` el 3 de octubre; el despliegue anterior de las láminas terminó. |
| `yarn -s turbo run source-check type-check lint test --filter=!@gymsheet/mobile` | 25/25 tareas correctas; web 47 archivos y 284 pruebas correctas en la pasada final. |
| `(cd apps/mobile && npx tsc --noEmit -p . && yarn -s test:unit)` | TypeScript correcto. `test:unit` terminó con código 0, pero informó **0 pruebas**; no se interpreta como cobertura del móvil. |
| Pruebas dirigidas de rutas, ajustes, filtro, plan semanal, programación, ubicación y comparación | Correctas; el BFF rechazó inicialmente la ruta de programación y la aceptó tras el cambio. |
| `yarn workspace @gymsheet/web source-check` y `type-check` | Correctos; también incluidos en la pasada final de Turbo. |
| Cherry-pick sobre `origin/test` en worktree temporal | Commit `70fff5a`; se conservó la navegación propia de `test` y se añadió Ajustes. En ese árbol: 25/25 tareas y 274/274 pruebas web; TypeScript móvil correcto. |
| Push a `test` | Avance rápido `e20c83f` → `70fff5a`, confirmado por `git push origin HEAD:test`. No se subió a `dev`. |

## No ejecutado o pendiente

- La muesca rectangular del pectoral mayor sigue pendiente. Los archivos `*-ids.png` que necesita `tools/anatomy/trace.py` no están en este worktree y faltan `cv2`/`Pillow` en el Python local. No se modificó `regions.generated.ts` a mano.
- No hubo capturas nuevas autenticadas del móvil: el iPhone del simulador ya no está arrancado. Solo están las dos capturas «antes» en `apps/mobile/ios-evidence/calidad-ui/antes/`.
- No hubo recorrido visual autenticado de la web a 390, 768 y 1440 px, claro/oscuro ni de dos tenants. El VPS redirige `/exercises` a `/login`; las credenciales las introduce el usuario. No se levantó un servidor local por la restricción de carga de la Mac.
- Las miniaturas de ejercicio en el VPS y el recorrido E2E con sesión iniciada no se comprobaron. No se afirma que funcionen.
- La ubicación del navegador exige un contexto seguro; el sitio compartido en el relevo usa HTTP, por lo que esa verificación puede quedar sin coordenadas hasta servir la web por HTTPS. La sesión se cierra igualmente.
- No se ejecutó `next build`, Docker, Postgres ni el backend local, por instrucción del usuario.

## Revisión de interfaz

Se contrastaron las superficies nuevas con `apple-premium-ui`, `ui-styling`, `ui-ux-pro-max` y la guía web actual de Vercel: semántica de botones, foco visible, etiquetas, estados vacíos, áreas táctiles, movimiento reducido y uso de tokens. La revisión estática no sustituye las capturas autenticadas pendientes.
