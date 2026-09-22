# Componentes y skills — Fase 05

> Verificación por muestreo real de `shared/components/ui/` (14 primitivas) contra el contrato de
> estados que exige `PROMPT_MAESTRO.md` ("normal, foco, activado... hover, seleccionado, ocupado,
> deshabilitado y error") y la skill `apple-premium-ui` ("Interaction quality").

## Catálogo de primitivas (`shared/components/ui/`)

`badge, button, card, checkbox, dialog, field, input, metric-card, pagination, select, table,
tabs, textarea` — 14 componentes. Consumidos en todos los módulos de `features/*` inspeccionados
hasta ahora; ningún duplicado obvio encontrado (p. ej. no hay un segundo `Button` casero en algún
feature).

## Contrato de estados verificado en `Button`/`ButtonLink`

| Estado exigido | Presente | Cómo |
|---|---|---|
| Normal | Sí | Clase por variante (`primary/secondary/danger/ghost`) |
| Hover | Sí | `hover:` por variante, con su propio tono (no solo opacidad) |
| Activado/presionado | Sí | `active:scale-[0.97]` — feedback táctil consistente con la skill (transform, no layout) |
| Foco visible | Sí, pero **global, no por componente** — `:focus-visible` está definido una sola vez en `globals.css:142` y se aplica a todo elemento enfocable. Mejor patrón que repetirlo por primitiva: una sola fuente, imposible que un componente nuevo lo "olvide". | `app/globals.css` |
| Deshabilitado | Sí | `disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45` |
| Ocupado/cargando | Sí | Prop `loading` reemplaza el contenido por `LoaderCircle` animado y fuerza `disabled` a la vez — no se puede hacer doble clic mientras carga |
| Error | N/A a nivel de botón (variante `danger` cubre la acción destructiva, no un estado de error del control) | — |

**Veredicto sobre `Button`:** contrato completo, sin huecos. No se propone ningún cambio.

## Otros componentes — verificación más ligera

- **`checkbox.tsx`**: usa `peer-focus-visible` además del foco global, para estilizar el
  indicador visual (el `<input>` real queda accesible pero visualmente oculto tras el `<span>`) —
  patrón correcto para checkboxes custom, el foco sigue siendo del elemento nativo.
- **`field.tsx`**: no inspeccionado en detalle esta pasada — candidato para revisión de estado de
  error de validación en fase posterior si se detectan formularios con mensajes inconsistentes.

## Skills: catálogo vs. uso real

El repo declara 20 skills obligatorias en `CLAUDE.md` con un mapa "tarea → skill". Esta sesión
cargó explícitamente `apple-premium-ui` (dirección de arte, gate final) antes de tocar cualquier
código de UI, siguiendo esa tabla. No se creó ninguna skill nueva — ningún hallazgo de esta
auditoría constituye "una tarea repetible con decisiones no triviales" que justifique una (la
propia regla de `INSTALAR_SKILLS.md`: "no atribuir a una skill una mejora causal que no se ha
demostrado").

## Pendiente (no ejecutado)

- No se verificó el contrato de estados de `select`, `dialog`, `tabs`, `table`, `pagination` —
  quedan para una pasada dedicada si el usuario prioriza componentes específicos.
- No se corrió un catálogo visual tipo Storybook (no existe en el repo) — la verificación fue
  lectura de código, no renderizado aislado de cada estado.
