# Relevo de calidad visual y paridad web — 3 de octubre de 2026

## Entregado en este relevo

- Se recuperó la compilación del móvil tras mover `training-metrics` a `@gymsheet/domain`. El mismo paquete ahora expone la política de ubicación y las funciones del plan semanal.
- La web añade Ajustes (cuenta, tema, versión, créditos y salida), filtro de ejercicios por zona y músculo, programación de una rutina en la semana, vista semanal, ubicación opcional al finalizar y comparación semanal en el panel.
- El BFF permite `/routines/:id/schedule`; se verificó el contrato con el código del backend NestJS. El cierre acepta coordenadas opcionales y sigue si se deniega la ubicación.
- Se amplió el área táctil del filtro y del selector a 44 px y se respetó `prefers-reduced-motion`.
- Se corrigieron las dos muescas rectangulares del borde inferior del pectoral. `contour_corrections.py` aplica la corrección al regenerar `regions.generated.ts` y falla si cambia el modelo anatómico esperado.
- La cabecera `Permissions-Policy` permite ahora pedir ubicación desde el propio origen al terminar una sesión. Una prueba fija este contrato; el micrófono permanece denegado.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| `curl` a `/anatomy/surface-front.webp` en Contabo | HTTP 200, `image/webp` el 3 de octubre; el despliegue anterior de las láminas terminó. |
| `yarn -s turbo run source-check type-check lint test --filter=!@gymsheet/mobile` | 25/25 tareas correctas; web 285/285 pruebas correctas tras la corrección de `Permissions-Policy`. |
| `(cd apps/mobile && npx tsc --noEmit -p . && yarn -s test:unit)` | TypeScript correcto. `test:unit` terminó con código 0, pero informó **0 pruebas**; no se interpreta como cobertura del móvil. |
| Pruebas dirigidas de rutas, ajustes, filtro, plan semanal, programación, ubicación y comparación | Correctas; el BFF rechazó inicialmente la ruta de programación y la aceptó tras el cambio. |
| `yarn workspace @gymsheet/web source-check` y `type-check` | Correctos; también incluidos en la pasada final de Turbo. |
| Cherry-pick sobre `origin/test` en worktree temporal | Commit `70fff5a`; se conservó la navegación propia de `test` y se añadió Ajustes. En ese árbol: 25/25 tareas y 274/274 pruebas web; TypeScript móvil correcto. |
| Push a `dev` y `feat/mapa-muscular` | Ambas ramas avanzaron por fast-forward hasta `af19278`, confirmado con `git ls-remote`. |
| Push a `test` | Avance rápido hasta `f1e98b0`, equivalente por cherry-pick a `af19278`, confirmado con `git push origin HEAD:test`. La instalación de dependencias en el worktree temporal falló en la fase de enlaces de Yarn; esa última prueba no se repitió allí. La misma corrección sí pasó la batería completa en la rama de trabajo. |
| `yarn workspace @gymsheet/anatomy test` | 91/91 pruebas correctas, incluida una nueva comprobación de los dos puntos antes ausentes del pectoral. |
| Superposición del pectoral con Playwright | [Antes](evidencia/pectoral-antes.png) y [después](evidencia/pectoral-despues.png), sobre la misma lámina local. El contorno cian ya no tiene escalones rectangulares. |
| Redeploy web en Contabo | `/settings` pasó a responder con `Permissions-Policy: ... geolocation=(self)`; `/api/health` y la lámina frontal respondieron HTTP 200. |
| Cuenta de prueba del VPS | Alta HTTP 201, onboarding completado y acceso al panel. Correo `qa-22f8502cff1a@example.test`; contraseña aleatoria solo en `apps/web/.env.e2e`, ignorado por Git y con permisos `0600`. |
| Recorrido visual autenticado | 36 capturas de seis rutas a 390, 768 y 1440 px en claro y oscuro. 28 cargaron con HTTP 200 sin desborde horizontal ni errores JavaScript; ocho devolvieron 404/502 intermitentes. Las cuatro rutas afectadas dieron 200 en tres reintentos cada una. [Panel](evidencia/web-qa-dashboard-390.png). |
| Rutina y semana en el VPS | Creación HTTP 201 y programación HTTP 201 para lunes y miércoles; la asignación activa apareció en `Tu semana`. [Captura](evidencia/web-qa-rutina-programada-390.png). |
| Cierre de sesión en el VPS | Inicio HTTP 201, cierre HTTP 200 con cuerpo `{}` y estado `FINALIZADA`. `isSecureContext` fue `false`, de modo que no hubo coordenadas. La sesión de prueba vacía recibió 85 puntos; conviene revisar esa regla del backend. [Captura](evidencia/web-qa-cierre-sesion-390.png). |

## Hallazgos de producción

- El catálogo de músculos del backend está vacío: `/api/backend/muscles` devolvió `[]`, el pectoral devolvió HTTP 404 y su pantalla mostró «Músculo no encontrado». [Captura](evidencia/web-qa-musculo-sin-catalogo-390.png). El backend contiene el comando `yarn db:enrich:exercises:prod`, que crea la taxonomía y reconstruye relaciones y ratings; **no se ejecutó** porque el backend del VPS quedó fuera del alcance de este trabajo.
- El catálogo general sí devuelve 1.324 ejercicios y diez zonas en la taxonomía del filtro, pero ninguno de los primeros veinte ejercicios consultados traía imagen. Las miniaturas de esa muestra no están disponibles en el VPS.
- Se observaron respuestas transitorias 404/502 durante el recorrido de 36 pantallas. La repetición dirigida de `/routines`, `/settings`, `/dashboard` y `/exercises` obtuvo 12/12 respuestas HTTP 200. No se determinó la causa en Coolify.
- La URL principal HTTPS seguía respondiendo 503. La geolocalización web requiere un origen seguro; el cierre sin ubicación sí quedó comprobado.

## No ejecutado o pendiente

- La regeneración completa desde los archivos `*-ids.png` no se ejecutó: esas máscaras no están en este worktree y faltan `cv2`/`Pillow` en el Python local. La corrección puntual sí se aplicó a la geometría existente y quedó en el trazador para futuras regeneraciones.
- No hubo capturas nuevas autenticadas del móvil: el iPhone del simulador ya no está arrancado. Solo están las dos capturas «antes» en `apps/mobile/ios-evidence/calidad-ui/antes/`.
- No se compararon dos tenants con sesiones autenticadas ni hubo capturas nuevas del móvil junto a la web. No se levantó un servidor local por la restricción de carga de la Mac.
- La ubicación del navegador exige un contexto seguro; el sitio compartido en el relevo usa HTTP, por lo que esa verificación puede quedar sin coordenadas hasta servir la web por HTTPS. La sesión se cierra igualmente.
- La comprobación de `https://gym.161.97.85.216.sslip.io/settings` devolvió HTTP 503 y un certificado sin validar el 3 de octubre. La configuración TLS de Coolify queda pendiente para que la ubicación funcione en producción.
- No se ejecutó `next build`, Docker, Postgres ni el backend local, por instrucción del usuario.

## Revisión de interfaz

Se contrastaron las superficies nuevas con `apple-premium-ui`, `ui-styling`, `ui-ux-pro-max` y la guía web actual de Vercel: semántica de botones, foco visible, etiquetas, estados vacíos, áreas táctiles, movimiento reducido y uso de tokens. El recorrido autenticado confirmó las pantallas web; sigue pendiente la comparación visual directa con el móvil y el segundo tenant.
