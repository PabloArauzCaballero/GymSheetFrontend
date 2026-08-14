# Guía de uso

Import único:

```ts
import { notify, confirm, confirmDelete } from '@/shared/notifications';
```

## API

### Toasts (`notify`)

```ts
notify.success('Guardado.');
notify.info('Te avisaremos cuando el reporte esté listo.');
notify.warning('Hay cambios sin guardar.');

// Título + cuerpo
notify.success({ message: 'Tutorial completado.', description: 'Sigue con el recomendado.' });

// Errores: pasa el error tal cual — se mapea a copia amigable + telemetría
notify.error(error);
// …o un mensaje explícito
notify.error('No se pudo exportar.');

// Carga persistente (devuelve id para actualizar/cerrar)
const id = notify.loading('Procesando…');
notify.dismiss(id);
```

### Operaciones asíncronas (`notify.promise`)

Liga el toast al ciclo real de la promesa: éxito **sólo** cuando resuelve.

```ts
await notify.promise(service.save(input), {
  loading: 'Guardando cambios…',
  success: 'Cambios guardados.',
  // `error` es opcional: si se omite, el error se mapea automáticamente
});
```

### Confirmaciones (`confirm` / `confirmDelete`)

```ts
// Eliminación (peligro, verbo «Eliminar», foco inicial en «Cancelar»)
const result = await confirmDelete({ entity: 'serie', name: '#3' });
if (!result.confirmed) return;
remove.mutate();

// Confirmación genérica
const result = await confirm({
  title: 'Cancelar sesión',
  message: 'Se descartará la sesión en curso. Esta acción no se puede deshacer.',
  severity: 'danger',      // 'danger' | 'warning' | 'info'
  confirmLabel: 'Cancelar sesión',
  cancelLabel: 'Volver',
});
```

`ConfirmationResult`:

```ts
{ confirmed: true,  action: 'confirm' }
{ confirmed: false, action: 'cancel' }   // botón Cancelar
{ confirmed: false, action: 'dismiss' }  // Escape / click fuera
```

## Cuándo usar cada superficie

| Situación | Superficie |
| --- | --- |
| La acción ya terminó, sin decisión | `notify.success/info/warning` |
| Falla de API / red / permisos | `notify.error(error)` |
| Operación con carga y resultado | `notify.promise(...)` |
| Acción destructiva o irreversible | `confirmDelete` / `confirm` (danger) |
| Cambio crítico (permisos, publicar) | `confirm` (danger/warning) |
| Error de un campo de formulario | inline con `react-hook-form` (no toast) |

## Reglas de UX (resumen)

- No confirmar acciones triviales ni ediciones normales: para éstas, sólo un
  toast de resultado.
- No declarar éxito antes de que el backend confirme — usa `notify.promise` o
  `onSuccess` de la mutación.
- Un solo mensaje por fallo (la deduplicación lo refuerza).
- Botones con verbos específicos (**Eliminar**, **Revocar**, **Inactivar**), no
  «Sí/No/Aceptar».
- En acciones destructivas, el foco inicial va al botón seguro (automático para
  `severity: 'danger'`).

## Patrón recomendado con `useMutation`

```ts
const remove = useMutation({
  mutationFn: () => service.removeSet(set.id),
  onSuccess: async () => {
    await refresh();
    notify.success('Serie eliminada.');
  },
  onError: (error: Error) => notify.error(error),
});

// En el handler del botón:
onClick={async () => {
  const result = await confirmDelete({ entity: 'serie', name: `#${set.numeroSerie}` });
  if (result.confirmed) remove.mutate();
}}
```

`mutation.isPending` sigue deshabilitando el botón, evitando doble envío.

## Añadir un caso nuevo

1. ¿Resultado sin decisión? → `notify.*`.
2. ¿Requiere decisión / es destructivo? → `confirm`/`confirmDelete` y luego la
   mutación.
3. ¿Nuevo error de API con copia propia? → ajusta `core/messages.ts`
   (`GENERIC_MESSAGE` / `PREFER_SERVER_MESSAGE`) — nunca hardcodees copia técnica
   en el componente.
