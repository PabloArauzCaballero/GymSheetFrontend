# Reporte de implementación

## 1. Resumen ejecutivo

Se implementó un **motor centralizado de notificaciones y confirmaciones** en
`apps/web`, sobre la infraestructura existente (`sonner` + `@radix-ui/react-dialog`),
sin añadir dependencias. Se migraron los 37 archivos que usaban `sonner`
directamente a `@/shared/notifications`, se tradujeron ~48 mensajes de error
crudos (`error.message`) a copia amigable, y se protegieron 10 acciones
destructivas/irreversibles que antes se ejecutaban sin confirmación.

## 2. Stack detectado

Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind 4 ·
TanStack Query 5 · **sonner** (ya montado) · **Radix Dialog** ·
react-hook-form + zod. `ApiError` con `kind` tipado en `@gymsheet/api-client`.

## 3. Auditoría del estado inicial

- `sonner` importado directamente en **37 archivos** (acoplamiento al proveedor
  en cada feature).
- **~48** `toast.error(error.message)` mostrando texto potencialmente técnico.
- **Sin** capa de confirmación reutilizable; el único patrón previo era un
  `Dialog` de Radix inline (`exercise-detail.tsx`) y un `window.confirm`
  (`membership-experience.tsx`).
- **10 acciones destructivas/irreversibles sin confirmación** (ver §10).

## 4. Implementaciones duplicadas encontradas

| Tipo | Antes | Ahora |
| --- | --- | --- |
| Toast provider | `import { toast } from 'sonner'` × 37 | `@/shared/notifications` (barril) |
| Mensaje de error | `error.message` crudo × 48 | `notify.error(error)` → `resolveError` |
| Confirmación | `window.confirm` + `Dialog` inline | `confirm` / `confirmDelete` (motor) |

## 5. Riesgos identificados

- **Popup de WhatsApp (`membership-experience.tsx`).** El `window.confirm`
  síncrono se reemplazó por `confirm()` asíncrono. Si un bloqueador de popups
  impide `window.open` tras el `await`, el flujo cae al comportamiento existente
  de misma pestaña (`window.location.href`). Sin regresión funcional.
- **Singleton de dedupe.** El motor deduplica errores idénticos en una ventana
  de 4 s; mensajes distintos no se ven afectados.

## 6. Arquitectura implementada

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md). Núcleo agnóstico → adaptador sonner →
engine `notify`; store de confirmaciones agnóstico → `ConfirmRoot` (Radix),
montado una vez en `app/providers.tsx`.

## 7. Archivos creados

```
apps/web/src/shared/notifications/
  index.ts
  notify.ts                       (+ notify.test.ts)
  core/types.ts
  core/messages.ts                (+ messages.test.ts)
  core/dedupe.ts                  (+ dedupe.test.ts)
  core/policy.ts
  core/telemetry.ts
  adapters/toast-adapter.ts
  confirm/confirm-store.ts        (+ confirm-store.test.ts)
  confirm/confirm-root.tsx        (+ confirm-root.test.tsx)
docs/notifications/{README,ARCHITECTURE,USAGE_GUIDE,MIGRATION_REPORT}.md
```

## 8. Archivos modificados

- `app/providers.tsx` — monta `<ConfirmRoot />`.
- **36 componentes de features** — `sonner` → `@/shared/notifications`,
  `toast.error(error.message)` → `notify.error(error)`, más 10 confirmaciones.

## 9. Componentes migrados

Los 37 consumidores de `sonner` (admin, workouts, training, exercises,
membership, notifications, profile, onboarding, tutorials). Sin referencias a
`toast.` restantes en `src/features` (verificado por grep).

## 10. Acciones protegidas (antes sin confirmación)

| Componente | Acción | Entidad | Confirmación |
| --- | --- | --- | --- |
| `workout-set-row.tsx` | eliminar serie | serie | `confirmDelete` |
| `workout-exercise-panel.tsx` | eliminar ejercicio de la sesión | ejercicio | `confirmDelete` |
| `routine-detail-client.tsx` | quitar ejercicio de la rutina | ejercicio | `confirm` (danger) |
| `exercise-media-manager.tsx` | retirar medio | medio | `confirm` (danger) |
| `live-workout.tsx` | cancelar sesión | sesión | `confirm` (danger) |
| `credential-panel.tsx` | revocar credencial | credencial | `confirm` (danger) |
| `equipment-admin.tsx` | inactivar equipo | equipo | `confirm` (warning) |
| `exercise-admin.tsx` | inactivar ejercicio global | ejercicio | `confirm` (warning) |
| `exercise-detail.tsx` | inactivar ejercicio personal | ejercicio | migrado a `confirm` (danger) |
| `membership-experience.tsx` | solicitar/renovar plan | membresía | migrado de `window.confirm` a `confirm` |

## 11. Integración con API

`resolveError()` mapea cada `ApiErrorKind` (400/401/403/404/409/422/429/red/
contrato/inesperado) a copia amigable en español. Backend message sólo se
muestra para `validation`/`conflict`/`rate-limit` y si no parece técnico;
`requestId` y `kind` van a telemetría, no a la UI.

## 12. Accesibilidad

Diálogo de confirmación vía Radix: `role="dialog"`, `aria-modal`, título y
descripción asociados, focus trap, restauración de foco, Escape. Foco inicial en
**Cancelar** para severidad `danger`. Responsivo (botones apilados en móvil,
`flex-col-reverse`).

## 13. Pruebas ejecutadas

- `messages.test.ts` (6) — mapeo de errores, ocultamiento de detalle técnico.
- `dedupe.test.ts` (4) — ventana de deduplicación y claves.
- `confirm-store.test.ts` (4) — confirm/cancel/dismiss, encolado, `confirmDelete`.
- `notify.test.ts` (6) — toasts, mapeo de `ApiError`, dedupe, `promise`.
- `confirm-root.test.tsx` (4) — render accesible, confirmar, foco en Cancelar,
  Escape = dismiss.

## 14. Resultados

Gate completo de `apps/web`, todo en verde:

```
source-check ✓   type-check ✓   lint ✓ (0 problemas)   test ✓ (97/97)   build ✓
```

## 15. Problemas pendientes

- Los toggles de estado reversibles vía `<Select>` (sala/plan/sede/membresía/
  dispositivo) no piden confirmación (por diseño: reversibles). Si se decide
  proteger transiciones a `INACTIVE/SUSPENDED`, usar `confirm` (warning).
- Conexión de `setTelemetrySink` a `@gymsheet/observability` queda como gancho
  disponible, sin cablear (sink dev-only por defecto).
- App móvil (`apps/mobile`) fuera de alcance: requiere su propio adaptador
  (SecureStore/RN); el núcleo `core/` es reutilizable como base.

## 16. Próximos pasos

1. Conectar telemetría real vía `setTelemetrySink`.
2. Evaluar confirmaciones para transiciones de estado sensibles a producción.
3. Portar el núcleo agnóstico a `apps/mobile` con un adaptador nativo.
