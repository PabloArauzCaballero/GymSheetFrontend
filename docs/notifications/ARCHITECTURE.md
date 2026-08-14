# Arquitectura del motor de notificaciones

## Capas

```
Componentes de features ─┐
                         │  importan sólo
                         ▼
              @/shared/notifications (barril)
                         │
      ┌──────────────────┼──────────────────────┐
      ▼                  ▼                        ▼
  notify (engine)   confirm/confirmDelete    ConfirmRoot (React)
      │                  │                        │
      ▼                  ▼                        │
 core/ (types,       confirm-store            usa el store
 messages, dedupe,   (cola agnóstica)         via useSyncExternalStore
 policy, telemetry)      ▲                        │
      │                  └────────────────────────┘
      ▼
 adapters/toast-adapter  ← ÚNICO acoplamiento a sonner
      │
      ▼
   sonner <Toaster>  (montado en app/providers.tsx)
```

- **Núcleo (`core/`)** — contratos y reglas puras. No importa React, sonner ni
  Radix. Testeable de forma aislada.
- **Adaptador (`adapters/toast-adapter.ts`)** — traduce `NotificationRequest` a
  llamadas de sonner. Es el único punto que conoce el proveedor visual.
- **Engine (`notify.ts`)** — orquesta política + deduplicación + mapeo de
  errores + telemetría sobre el adaptador. Expone el singleton `notify`.
- **Confirmaciones (`confirm/`)** — `confirm-store.ts` es una cola imperativa
  agnóstica del framework; `confirm-root.tsx` la renderiza con Radix Dialog
  (foco atrapado, `aria-modal`, Escape, restauración de foco).

## Decisiones

1. **Reutilizar la infraestructura existente.** El proyecto ya tenía `sonner`
   montado y `@radix-ui/react-dialog`. En vez de introducir dependencias, se
   construyó una capa de abstracción encima. Cambiar de proveedor implica
   reescribir sólo `toast-adapter.ts` (toasts) o `confirm-root.tsx` (modales).

2. **Confirmaciones imperativas con `await`.** `confirm()` devuelve una
   `Promise<ConfirmationResult>`. El llamador decide qué hacer; el motor sólo
   informa la decisión. Esto encaja con el patrón `useMutation` existente y
   evita reestructurar el JSX de cada componente.

3. **Estado sin librería nueva.** El store de confirmaciones es vanilla
   (`useSyncExternalStore`), no añade Zustand/Redux. Una confirmación a la vez;
   las siguientes se encolan para que un aviso crítico nunca quede oculto.

4. **Cerrar ≠ cancelar.** `ConfirmationResult.action` distingue
   `confirm` / `cancel` / `dismiss` (Escape u overlay). El llamador puede tratar
   el descarte distinto de una cancelación explícita.

5. **Mensajes de error separados del transporte.** `resolveError()` mapea
   `ApiError.kind` a copia amigable. Los mensajes del backend sólo se muestran
   para `validation` / `conflict` / `rate-limit` y sólo si no parecen técnicos
   (heurística en `messages.ts`). El resto usa copia genérica; `requestId` y
   `kind` van a telemetría, nunca a la UI.

## Accesibilidad

`confirm-root.tsx` se apoya en Radix Dialog: `role="dialog"`, `aria-modal`,
título/descripción asociados (`aria-labelledby`/`aria-describedby`), focus trap y
restauración de foco al cerrar. Para severidad `danger` el foco inicial se
redirige al botón seguro (**Cancelar**). Escape y click fuera se pueden bloquear
con `dismissible: false`. Los toasts usan las regiones vivas de sonner.

## Jerarquía de capas (z-index)

- overlay de diálogos de UI (`ui/dialog.tsx`): `z-50`
- **confirmación crítica** (`confirm-root.tsx`): overlay `z-[100]`, panel
  `z-[101]` — por encima de cualquier diálogo de formulario para que una
  confirmación nunca quede tapada.
- toasts: gestionados por sonner (portal propio).

## Cómo cambiar de proveedor visual

- **Toasts:** implementar `ToastAdapter` (`show`/`dismiss`) para la nueva
  librería y pasarlo a `new NotificationEngine(nuevoAdapter)`. Ningún componente
  cambia.
- **Modales:** reescribir `confirm-root.tsx` consumiendo `confirmStore`; la API
  `confirm()` / `confirmDelete()` no cambia.

## Telemetría

`core/telemetry.ts` expone `setTelemetrySink(fn)`. Por defecto registra sólo
errores en consola en desarrollo. El host puede conectar `@gymsheet/observability`
sin tocar features. Nunca se registran cuerpos de mensaje (pueden contener datos
del usuario); sólo `severity`, `code`, `requestId`, `correlationId`, `retryable`.
