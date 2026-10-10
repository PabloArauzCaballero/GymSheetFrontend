# Movimiento y respuesta — Fase 07

> ADR-0003 (fase 4, ya hecha) tokenizó el movimiento (`--dur-1..6`, `--ease-*`) y añadió
> `shared/hooks/use-reduced-motion.ts`. Esta fase verifica cumplimiento real por muestreo de
> código, no reintroduce el sistema.

## Verificado por inspección

| Criterio del `PROMPT_MAESTRO.md` | Estado | Evidencia |
|---|---|---|
| Respeta `prefers-reduced-motion` | **Cumple, con un patrón ejemplar.** Las animaciones infinitas encontradas (halo de celebración, latido de nodo de progreso, barrido de brillo) usan el variant `motion-safe:` de Tailwind — se desactivan solas si el usuario pidió menos movimiento, sin lógica condicional propensa a error. 7 archivos además consumen el hook `useReducedMotion` explícitamente para lógica no solo CSS. | `grep motion-safe:animate` en `progression-*`; `grep -rl useReducedMotion` |
| No `transition: all` | **Una excepción, revisada y aceptada.** `tutorial-spotlight.tsx` usa `transition-all` pero (a) está detrás de `!reducedMotion &&`, y (b) anima simultáneamente posición y tamaño de un recorte de foco — un caso legítimo para no enumerar 4+ propiedades. No se cambia. | `tutorial-spotlight.tsx:83` |
| No animaciones infinitas sin propósito | Las `animate-*` infinitas encontradas (15 archivos) siguen el patrón esperado por nombre: skeletons de carga (`animate-pulse`), spinners de botón/acción async (`animate-spin`), temporizador de descanso, y las tres celebrativas ya cubiertas arriba (guardadas por `motion-safe:`). No se auditó archivo por archivo el propósito exacto de cada una — es un muestreo por convención de nombre, no una revisión exhaustiva. | Lista de 15 archivos en el log de esta sesión |
| La acción del usuario no espera una animación decorativa | Confirmado en el piloto de fase 06: registrar una serie actualiza los indicadores de cabecera al instante (sin animación de entrada bloqueante observada). | `trabajo/FLUJO_VERTICAL.md` |

## Pendiente (no ejecutado en esta pasada)

- No se perfiló rendimiento de ninguna animación (DevTools Performance/Lighthouse) — pendiente
  para fase 09 junto al resto de métricas de laboratorio.
- No se revisó cada uno de los 15 archivos con `animate-*` infinito línea por línea; el muestreo
  cubrió los tres casos de mayor riesgo (celebraciones, más visibles y más largas).
- No se probó `prefers-reduced-motion: reduce` de verdad en un navegador (emulación de DevTools)
  para confirmar que `motion-safe:` se comporta como se espera en tiempo de ejecución, más allá de
  leer el código fuente.
