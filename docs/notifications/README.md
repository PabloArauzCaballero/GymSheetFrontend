# Motor de notificaciones y confirmaciones (web)

Superficie **única y centralizada** para comunicar resultados, advertencias,
confirmaciones y errores al usuario en `apps/web`. El código de funcionalidad
depende sólo de `@/shared/notifications`; nunca importa `sonner` ni un diálogo
de Radix directamente.

```ts
import { notify, confirm, confirmDelete } from '@/shared/notifications';

// Toast de resultado
notify.success('Sala creada.');
notify.error(error); // ApiError → copia amigable + telemetría

// Confirmación destructiva (foco inicial en «Cancelar»)
const result = await confirmDelete({ entity: 'serie', name: '#3' });
if (result.confirmed) remove.mutate();

// Operación asíncrona con feedback ligado a su ciclo de vida real
await notify.promise(service.save(input), {
  loading: 'Guardando…',
  success: 'Cambios guardados.',
});
```

## Qué resuelve

- **Un solo lugar** para toasts y confirmaciones. Antes, 37 componentes
  importaban `toast` de `sonner` y ~48 mostraban `error.message` crudo.
- **Acciones destructivas protegidas**: eliminar serie/ejercicio/medio, cancelar
  sesión, revocar credencial e inactivar equipo/ejercicio ahora piden
  confirmación antes de ejecutarse.
- **Errores traducidos**: `ApiError` se transforma en copia en español apta para
  el usuario; el detalle técnico (`kind`, `requestId`) queda sólo en telemetría.
- **Sin duplicados**: errores idénticos dentro de una ventana corta se muestran
  una sola vez.

## Documentos

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — capas, decisiones y cómo cambiar de
  proveedor visual.
- [`USAGE_GUIDE.md`](./USAGE_GUIDE.md) — API pública, cuándo usar toast vs modal,
  recetas por caso de uso.
- [`MIGRATION_REPORT.md`](./MIGRATION_REPORT.md) — auditoría del estado previo,
  inventario, archivos migrados y validación ejecutada.

## Ubicación del código

```
apps/web/src/shared/notifications/
  index.ts                    # barril público (único punto de import)
  notify.ts                   # NotificationEngine + singleton `notify`
  core/
    types.ts                  # contratos agnósticos del framework
    messages.ts               # ApiError → mensaje amigable (resolveError)
    dedupe.ts                 # deduplicación por ventana
    policy.ts                 # políticas configurables (defaultPolicy)
    telemetry.ts              # sink de errores (setTelemetrySink)
  adapters/
    toast-adapter.ts          # ÚNICO archivo acoplado a sonner
  confirm/
    confirm-store.ts          # cola imperativa (confirm/confirmDelete)
    confirm-root.tsx          # diálogo global Radix montado una vez
```
