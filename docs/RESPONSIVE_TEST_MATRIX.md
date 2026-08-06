# Matriz de pruebas responsivas — GymSheet Web

## 1. Anchos objetivo

| Categoría | Ancho | Verificación clave |
|---|---:|---|
| Móvil muy pequeño | 320px | Sin desborde; series usables; acciones tocables |
| Móvil pequeño | 360px | Igual |
| Móvil estándar | 390px | Igual |
| Móvil grande | 430px | Igual |
| Tablet vertical | 768px | Grids 1→2 col; navegación en píldoras |
| Tablet horizontal | 1024px | Sidebar aparece (`lg`) |
| Laptop | 1280px | Densidad de escritorio |
| Escritorio | 1440px | `max-w-[1440px]` centra el contenido |
| Escritorio grande | 1920px | Márgenes automáticos; sin estiramiento excesivo |
| Ultraancha | 2560px | Contenido acotado y centrado |

Además: orientación vertical/horizontal, zoom 200%, fuentes aumentadas, textos
largos (emails/UUIDs), datos vacíos/numerosos, errores de validación, menús y
modales abiertos.

## 2. Cobertura automatizada

### E2E (Playwright) — `apps/web/e2e/`
Proyectos: `chromium` (Desktop Chrome) y `mobile` (Pixel 7).

| Spec | Qué valida | Estado |
|---|---|---|
| `responsive-overflow.spec.ts` **(nuevo)** | Barrido de los 10 anchos × 9 rutas autenticadas → `scrollWidth ≤ clientWidth`; nav móvil no ensancha el documento | Requiere backend |
| `media-responsive.spec.ts` | Imágenes cargan + sin overflow en `/dashboard`, `/exercises`, `/profile`, `/membership` | Requiere backend |
| `auth.spec.ts`, `customer-experience.spec.ts` | Flujos funcionales (no romper) | Requiere backend |

> Los E2E necesitan backend NestJS + PostgreSQL con usuarios mock
> (`active.mock@gymsheet.local`). No se ejecutaron en esta sesión por ausencia de
> backend (regla del proyecto: no afirmar E2E sin backend). Comando:
> `yarn workspace @gymsheet/web test:e2e`.

### Unitarias (Vitest) — 21 pruebas
`empty-state`, `domain-image`, `api-client`, `api-error`, `numbers`,
`backend-route-policy`. **Resultado en esta sesión: 21/21 verdes.**

## 3. Checklist manual por pantalla (320 / 768 / 1440)

Para cada ruta: ☐ sin scroll horizontal · ☐ nada cortado/superpuesto · ☐ acciones
tocables (≥40px) · ☐ formularios legibles sin auto-zoom · ☐ tablas con scroll ·
☐ modales dentro del viewport · ☐ estados vacío/carga/error correctos.

| Ruta | 320 | 768 | 1440 | Notas |
|---|:--:|:--:|:--:|---|
| `/login`, `/register` | ☐ | ☐ | ☐ | Panel decorativo `hidden lg:flex` |
| `/dashboard` | ☐ | ☐ | ☐ | Grid de métricas reflow; barra de progreso clamp |
| `/workouts`, `/workouts/[id]` | ☐ | ☐ | ☐ | **Series a 320px** (arreglo crítico) |
| `/routines`, `/plans` | ☐ | ☐ | ☐ | UUID propietario con `break-all` |
| `/exercises`, `/exercises/[id]` | ☐ | ☐ | ☐ | Tarjetas + imágenes `object-cover` |
| `/membership`, `/access` | ☐ | ☐ | ☐ | Imágenes remotas vía proxy |
| `/notifications`, `/profile` | ☐ | ☐ | ☐ | Email con `truncate` |
| `/onboarding` | ☐ | ☐ | ☐ | `choice-group` 1→2→3 col |
| `/admin/*` | ☐ | ☐ | ☐ | Cabeceras de panel apilan; tablas con scroll |

## 4. Estados especiales a verificar

☐ Modal abierto (`Dialog`) a 320px: cabe, scroll interno, cierre por Escape/botón.
☐ Nav móvil (píldoras): scroll horizontal propio, activo centrado, sin ensanchar página.
☐ Formulario con errores: el mensaje no rompe el layout.
☐ Tabla con muchos datos: scroll horizontal, no desborde de página.
☐ `prefers-reduced-motion`: sin animaciones; contenido visible.
☐ Zoom 200%: contenido usable, sin recortes.

## 5. Regresión visual (capturas)

`media-responsive.spec.ts` ya guarda `exercises.png` y `membership.png`
(`fullPage`). Para ampliar, capturar por ruta × {320, 768, 1440} en ambos
proyectos y comparar antes/después. Organizar por `ruta/ancho/estado`.
