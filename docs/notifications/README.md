# Motor de notificaciones y confirmaciones

Superficie **única y centralizada** para comunicar resultados, advertencias,
confirmaciones y errores al usuario, compartida por los dos clientes:

| Cliente | Import | Toasts | Confirmaciones |
| --- | --- | --- | --- |
| `apps/web` | `@/shared/notifications` | `sonner` | Radix Dialog |
| `apps/mobile` (iOS/Android) | `@/notifications` | `ToastHost` nativo | `Modal` de React Native |

Las reglas, la copia, el mapeo de errores, la deduplicación y la cola de
confirmaciones viven una sola vez en **`packages/notifications`**. Cada app añade
su renderer. El código de funcionalidad nunca importa `sonner`, un diálogo de
Radix, `Alert` de React Native ni el paquete compartido directamente: sólo su
barril.

```ts
import { notify, confirm, confirmDelete } from '@/shared/notifications'; // web
import { notify, confirm, confirmDelete } from '@/notifications';        // móvil

// Toast de resultado
notify.success('Sala creada.');
notify.error(error); // ApiError → copia amigable + telemetría

// Confirmación destructiva (acción segura primero)
const result = await confirmDelete({ entity: 'serie', name: '#3' });
if (result.confirmed) remove.mutate();

// Operación asíncrona con feedback ligado a su ciclo de vida real
await notify.promise(service.save(input), {
  loading: 'Guardando…',
  success: 'Cambios guardados.',
});
```

## Qué resuelve

- **Un solo lugar** para toasts y confirmaciones, y **una sola copia** para los
  dos clientes: un cambio de mensaje se ve igual en web y en el teléfono.
- **Acciones destructivas protegidas**: eliminar serie/ejercicio/medio, cancelar
  sesión, revocar credencial, inactivar equipo/ejercicio (web) y cerrar sesión
  (móvil) piden confirmación antes de ejecutarse.
- **Errores traducidos**: `ApiError` se transforma en copia en español apta para
  el usuario; el detalle técnico (`kind`, `requestId`) queda sólo en telemetría.
- **Sin duplicados**: errores idénticos dentro de una ventana corta se muestran
  una sola vez (p. ej. una ráfaga de 401 en paralelo → un aviso).

## Documentos

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — capas, decisiones y cómo cambiar de
  proveedor visual o añadir un cliente.
- [`USAGE_GUIDE.md`](./USAGE_GUIDE.md) — API pública, cuándo usar toast vs modal,
  recetas por caso de uso (web y móvil).
- [`MIGRATION_REPORT.md`](./MIGRATION_REPORT.md) — auditoría, inventario,
  archivos migrados y validación ejecutada en cada fase.

## Ubicación del código

```
packages/notifications/src/         # motor compartido — sin React, sin proveedor
  index.ts                          # API pública del paquete
  types.ts                          # contratos (incluye ToastAdapter)
  messages.ts                       # ApiError → mensaje amigable (resolveError)
  dedupe.ts                         # deduplicación por ventana
  policy.ts                         # defaultPolicy (web) · nativePolicy (móvil)
  telemetry.ts                      # sink de errores (setTelemetrySink)
  notify.ts                         # NotificationEngine
  confirm-store.ts                  # cola de confirmaciones (confirm/confirmDelete)
  toast-queue.ts                    # cola de toasts headless (la usa el móvil)

apps/web/src/shared/notifications/  # renderer web
  index.ts                          # barril público (único import de features)
  notify.ts                         # singleton + sink de telemetría
  adapters/toast-adapter.ts         # ÚNICO archivo acoplado a sonner
  confirm/confirm-root.tsx          # diálogo global (Radix), montado una vez
  *.test.ts(x)                      # suite del motor compartido + del diálogo

apps/mobile/src/notifications/      # renderer nativo (iOS/Android)
  index.ts                          # barril público (único import de pantallas)
  notify.ts                         # ToastQueue + singleton + sink de telemetría
  toast-host.tsx                    # pila de toasts (safe area, animada)
  confirm-root.tsx                  # diálogo global (Modal), montado una vez
  notification-root.tsx             # monta ambas superficies
  use-reduce-motion.ts              # respeta «Reducir movimiento» del sistema
```

Las pruebas del motor compartido viven en `apps/web/src/shared/notifications/`
porque `apps/web` es el único workspace con runner de tests (vitest); cubren el
código de `packages/notifications`, incluida la cola que renderiza el móvil.
