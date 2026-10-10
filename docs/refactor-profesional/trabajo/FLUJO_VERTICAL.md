# Flujo vertical piloto — Fase 06

> Criterio de la fase: "una tarea real funciona de principio a fin". Se eligió **entrenar**
> (`/workouts/new` → sesión en vivo → finalizar → historial) por ser, según INVENTARIO.md, la
> tarea principal del producto — es la acción del encabezado en casi toda la navegación del
> miembro.

## Recorrido ejecutado con datos reales (no simulado)

Cuenta: `admin.a@qa.test`, backend real en `:3005`, Postgres local. Pasos y resultado:

1. `/workouts/new` → "Iniciar entrenamiento" (con observación opcional) → crea sesión real
   (`POST`, UUID `8b39fb2f-db2e-46fa-a4a3-b9c085b8c8a7`), redirige a la sesión en vivo.
2. Sesión en vivo: métricas en cero (Tiempo, Volumen, Series, RIR medio) — estado inicial
   correcto, sin datos inventados. Temporizador de descanso local, con su propio aviso ("no
   modifica el historial del backend") — un ejemplo correcto de no mezclar UI efímera con datos
   persistidos.
3. "Modo clásico" → "Agregar ejercicio" → selector con 374 ejercicios reales, cada uno con texto
   alternativo aunque la imagen no cargó ("exercise demonstration: imagen no disponible" —
   degradación accesible ante el fallo de medios ya documentado como ruido de entorno en
   HALLAZGOS.md, no un defecto nuevo).
4. Ejercicio agregado ("air bike") → serie registrada (8 reps, RIR 2) → los indicadores de cabecera
   se actualizan en vivo (Series: 0→1, RIR medio: 0.0→2.0) sin recargar la página.
5. "Finalizar" → la sesión pasa a "FINALIZADA", vista de detalle de solo lectura con el mismo
   resumen.
6. `/workouts` → la sesión aparece en el historial paginado, con fecha, duración (1 min),
   volumen y estado — persistencia confirmada de punta a punta, no solo en memoria de cliente.

Capturas: `evidencia/pilot-workout-set-registrado.png`, `evidencia/pilot-workout-historial.png`.

## Veredicto

**Criterio de aceptación de la fase 06 cumplido**: la tarea principal funciona de extremo a
extremo con datos de prueba reales — inicia, informa su estado en cada paso, persiste, y se
recupera en el historial. Ningún hallazgo nuevo en este recorrido específico (más allá del ruido
de entorno ya documentado).

## Lo que NO cubre este piloto (alcance honesto)

- No se probó el "Modo guiado" (alternativa al modo clásico visto en el screenshot del paso 2).
- No se probó cancelar una sesión a medias, ni el límite "una sola sesión en progreso por
  usuario" mencionado en la propia UI.
- No se probó con una rutina asignada (`routines/:id/start`) en vez de una sesión libre.
- No se completó una segunda tarea completa de "recuperación/edición" (editar un ejercicio propio
  ya creado, o recuperar contraseña de punta a punta con el correo real) — sigue pendiente de
  INVENTARIO.md/PLAN_SITUADO.md.
