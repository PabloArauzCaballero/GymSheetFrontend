# Motor de tutoriales interactivos (Centro de ayuda)

Motor reutilizable de *product tours* para `apps/web`. Muestra recorridos paso a
paso sobre la interfaz real y ofrece un **Centro de ayuda** (`/tutorials`) donde
el usuario inicia, continúa, repite o reinicia cada guía.

Todo el código vive en [`src/features/tutorials`](../src/features/tutorials) salvo
el contrato de persistencia compartido (`packages/types`, `packages/schemas`).

---

## 1. Arquitectura

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| **Modelo** | `model/types.ts` | Tipos `TutorialDefinition` / `TutorialStep`. |
| **Validación** | `model/validation.ts` | Detecta ids duplicados, pasos sin objetivo, prerrequisitos faltantes/circulares, roles incompatibles. |
| **Registro** | `registry/tutorial-registry.ts` | Catálogo inmutable, filtrado por rol. Valida al construirse. |
| **Definiciones** | `registry/definitions/*.ts` | Un archivo por módulo. `definitions/index.ts` agrega todo. |
| **Estado** | `engine/use-tutorial-run.ts` | Máquina de estados del recorrido y controles (start/next/prev/skip/finish/reset). |
| **Efectos** | `engine/use-tutorial-run-effects.ts` | Navegación entre rutas, resolución de objetivos, auto-avance, auto-inicio. |
| **Provider** | `engine/tutorial-provider.tsx` | Compone store + estado + efectos y expone el contexto. |
| **Resolución de objetivos** | `engine/target-resolver.ts` | Encuentra `data-tutorial-id` (soporta elementos asíncronos, con `MutationObserver` + timeout). |
| **Posicionamiento** | `engine/positioning.ts` | Calcula la posición del tooltip (puro, testeable). |
| **Persistencia** | `storage/*` | Servicio backend + caché en memoria + *gateway* con degradación. |
| **UI** | `components/*` | `TutorialOverlay`, `TutorialSpotlight`, `TutorialTooltip`, `TutorialProgressBar`, `TutorialLauncher`, `TutorialCenter`, `TutorialCard`. |

El provider se monta una sola vez dentro del *shell* autenticado
([`portal-shell.tsx`](../src/shared/components/layout/portal-shell.tsx)), por lo
que persiste entre navegaciones de ruta y conoce el `role`/`userId` de la sesión.

### Flujo de ejecución

1. `start(id)` resuelve el tutorial para el rol y fija el paso inicial (reanuda si
   había progreso).
2. El efecto de resolución: si el paso declara `route`, navega; ejecuta
   `autoAction` opcional; espera el `data-tutorial-id` del objetivo.
3. Si el objetivo aparece → `TutorialOverlay` dibuja el *spotlight* y el tooltip.
   Si no aparece y el paso es `optional` → se salta; si no → estado recuperable
   *"elemento no encontrado"* (reintentar / saltar / cerrar).
4. `next`/`prev`/teclado avanzan; el progreso se persiste en cada paso.
5. `finish` marca `COMPLETED`; `skip` marca `SKIPPED`; cerrar conserva
   `IN_PROGRESS` para reanudar luego.

---

## 2. Estructura de un tutorial

```ts
import type { TutorialDefinition } from '../../model/types';

export const miTutorial: TutorialDefinition = {
  id: 'mi-tutorial',              // único en el catálogo
  version: '1.0.0',              // ver §7 (versionado)
  title: 'Mi tutorial',
  description: 'Qué enseña, en una frase.',
  category: 'TRAINING',         // filtro del Centro
  difficulty: 'BEGINNER',
  estimatedMinutes: 2,
  roles: ['CLIENTE'],           // opcional; omitido = todos los roles
  route: '/workouts',           // ruta principal (opcional)
  prerequisites: ['otro-id'],   // opcional
  recommended: true,            // opcional (badge)
  mandatory: false,             // opcional (badge)
  autoStart: false,             // sólo el intro debería ser true
  next: 'siguiente-id',         // sugerencia al completar
  steps: [ /* ... */ ],
};
```

### Un paso

```ts
{
  id: 'abrir',                          // único dentro del tutorial
  title: 'Abre Entrenamientos',
  description: 'Una sola acción por paso, en lenguaje claro.',
  target: 'nav:/workouts',              // data-tutorial-id a resaltar
  placement: 'right',                   // top|bottom|left|right|center|auto
  route: '/workouts',                   // el motor navega si hace falta
  roles: ['CLIENTE'],                   // subconjunto de los roles del tutorial
  expectedAction: 'Abre "Entrenamientos".',
  advanceOn: { type: 'click' },         // click | input | { type:'route', route }
  requireAction: true,                  // bloquea "Siguiente" hasta la acción
  advanceWhen: (ctx) => !!ctx.target,   // gate opcional personalizado
  advanceHint: 'Realiza la acción para continuar.',
  autoAction: (ctx) => { /* abrir un menú, no destructivo */ },
  waitForTargetMs: 4000,                // espera por objetivos asíncronos
  allowInteraction: true,               // el objetivo queda interactivo
  optional: true,                       // si falta el objetivo, se salta
}
```

---

## 3. Cómo crear un tutorial nuevo

1. Crea `registry/definitions/mi-modulo.ts` exportando una `TutorialDefinition`.
2. Añádela a `registry/definitions/index.ts` (`allTutorialDefinitions`).
3. Asegúrate de que cada `target` exista como `data-tutorial-id` en la UI real.

No hay que tocar el motor ni el registro: el catálogo se valida solo al arrancar.

### Asociar elementos de la interfaz

Usa **atributos estables**, nunca selectores de clase:

```tsx
<button data-tutorial-id="crear-usuario">Crear</button>
```

Convenciones ya presentes: `nav:/<ruta>` (enlaces del menú), `page:<modulo>`
(cabeceras vía la prop `tutorialId` de `PageHeader`), y anclas específicas como
`dashboard:start-workout`, `exercises:search`. Para componentes compartidos que
no aceptan `data-*`, envuelve el objetivo en un `<span data-tutorial-id="…">`.

### Validar acciones (sin efectos peligrosos)

- `advanceOn` detecta la interacción esperada (click/input/cambio de ruta) y
  auto-avanza (o habilita "Siguiente" si `requireAction`).
- `advanceWhen(ctx)` permite condiciones personalizadas; se reevalúa en cada
  interacción del usuario.
- **Nunca** dispares operaciones destructivas, pagos ni eliminaciones desde un
  `autoAction`. Guía hasta el formulario, no envíes datos por el usuario.

### Rutas y modales

- `step.route` hace que el motor navegue antes de mostrar el paso.
- Objetivos dentro de modales/menús: usa `autoAction` para abrirlos y
  `waitForTargetMs` para esperar a que aparezcan.

### Restringir por rol

`roles` en el tutorial y/o en cada paso. El registro filtra el catálogo y los
pasos por rol; un tutorial sin pasos visibles para el rol no aparece. **El motor
nunca sustituye la autorización del backend**: sólo oculta lo que el rol no ve.

---

## 4. Versionado (§7 del encargo)

`version` es una cadena tipo *semver*. Estrategia implementada:

- Si un registro `COMPLETED` tiene una `version` distinta a la definición actual,
  el Centro lo marca **"Actualizado"** e invita a repetirlo.
- Al reanudar, si la versión cambió se reinicia desde el primer paso
  (`resumeStepIndex`), porque el contenido pudo desplazarse.

---

## 5. Persistencia

- **Backend (fuente de verdad).** El navegador llama al BFF
  `/api/backend/me/tutorial-progress` (ver contrato abajo). La ruta está en la
  *allowlist* (`shared/server/backend-route-policy.ts`).
- **Caché en memoria (respaldo).** `storage/local-progress-store.ts` es un
  respaldo por sesión. **No se usa Web Storage** (regla del proyecto); el backend
  provee la persistencia entre dispositivos y recargas.
- **Gateway.** `storage/tutorial-progress-gateway.ts` prioriza el backend y
  degrada a memoria ante `not-found`/`network`/`contract`/`rate-limit`; los
  errores de autorización se propagan.

### Contrato de backend requerido

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `GET` | `/me/tutorial-progress` | — | `TutorialProgressRecord[]` |
| `PUT` | `/me/tutorial-progress/:tutorialId` | `TutorialProgressUpsert` | `TutorialProgressRecord` |
| `DELETE` | `/me/tutorial-progress/:tutorialId` | — | `TutorialProgressRecord[]` |

Tipos en `@gymsheet/types` (`tutorials.ts`), validadores en `@gymsheet/schemas`
(`definitions/tutorials.ts`). `PUT` debe ser **idempotente**, autorizado, y
**jamás** permitir modificar el progreso de otro usuario (deriva el id del token).

---

## 6. Accesibilidad

- `role="dialog"` con `aria-labelledby`/`aria-describedby`; `aria-modal` en pasos
  centrados.
- **Escape** cierra (con confirmación si hay avance); **←/→** navegan.
- Foco inicial al tooltip; el foco previo se restaura al terminar.
- Progreso comunicado por texto *y* barra (nunca sólo por color).
- Respeta `prefers-reduced-motion` (`use-reduced-motion.ts`).
- El objetivo permanece interactivo (no se bloquea toda la interfaz).

---

## 7. Ejecutar las pruebas

```bash
# Unitarias + integración (jsdom)
yarn workspace @gymsheet/web test --run src/features/tutorials

# Todo el paquete web
yarn workspace @gymsheet/web test

# E2E (requiere backend + PostgreSQL activos)
yarn workspace @gymsheet/web test:e2e e2e/tutorials.spec.ts
```

Cobertura: validación de configuración, registro/filtrado por rol, avance/
retroceso, persistencia y degradación a memoria, reanudación y cambio de versión,
resolución de objetivos asíncronos, objetivo inexistente, cierre anticipado,
teclado y posicionamiento.

---

## 8. Diagnóstico

- **"No encontramos este elemento"**: el `target` no existe o está oculto. Verifica
  el `data-tutorial-id`, si el elemento es asíncrono (sube `waitForTargetMs`) o
  márcalo `optional`.
- **El tutorial no aparece en el Centro**: revisa `roles` (del tutorial y de sus
  pasos) y los `prerequisites`.
- **Config inválida**: en desarrollo el registro lanza un error con el detalle; en
  producción descarta el tutorial afectado y expone `registry.issues`.
- **Progreso no persiste entre dispositivos**: el backend debe implementar el
  contrato de §5; sin él sólo hay respaldo por sesión.

---

## 9. Decisiones y límites conocidos

- **Sin dependencias nuevas**: reutiliza Radix/Tailwind/tokens/`lucide-react`; el
  tooltip anclado y el *spotlight* se construyeron a mano (no había primitivo).
- **Web-only**: el motor usa el DOM; el contrato de progreso sí es compartido y
  podría alimentar un equivalente móvil.
- **Respaldo en memoria** (no Web Storage): el progreso offline vive por sesión
  hasta la siguiente escritura exitosa al backend.
- **`autoAction`** es *best-effort* y debe ser no destructivo por diseño.
```
