# Arquitectura del motor de notificaciones

## Capas

```
 apps/web (features)                         apps/mobile (pantallas)
        │ importan sólo                              │ importan sólo
        ▼                                            ▼
 @/shared/notifications  ──── barriles ────  @/notifications
        │                                            │
        │        ┌───────────────────────────────────┘
        ▼        ▼
        packages/notifications  (sin React, sin proveedor visual)
        ├── notify.ts            NotificationEngine (política + dedupe + errores)
        ├── messages.ts          ApiError → copia amigable
        ├── dedupe.ts            ventana de deduplicación
        ├── policy.ts            defaultPolicy · nativePolicy
        ├── telemetry.ts         setTelemetrySink
        ├── confirm-store.ts     cola de confirmaciones (agnóstica)
        └── toast-queue.ts       cola de toasts headless (implementa ToastAdapter)
        │                                            │
        ▼                                            ▼
 adapters/toast-adapter.ts                   toast-host.tsx     (ToastQueue → RN)
   → sonner <Toaster>                        confirm-root.tsx   (Modal nativo)
 confirm/confirm-root.tsx                    notification-root.tsx
   → Radix Dialog                              monta ambas superficies
```

- **Motor compartido (`packages/notifications`)** — contratos y reglas puras. No
  importa React, sonner, Radix ni React Native. Es la única definición de la
  copia, la política y el comportamiento; los dos clientes se comportan igual.
- **Adaptador de toasts (`ToastAdapter`)** — el punto donde entra el proveedor
  visual. Web implementa `sonnerAdapter`; el móvil usa `ToastQueue`, una cola
  headless del propio paquete que su `ToastHost` pinta.
- **Confirmaciones (`confirm-store.ts`)** — cola imperativa agnóstica; cada
  cliente la enlaza con `useSyncExternalStore` a su renderer (Radix Dialog en
  web, `Modal` de React Native en móvil).

## Decisiones

1. **Reutilizar la infraestructura existente.** El web ya tenía `sonner` y
   `@radix-ui/react-dialog`; el móvil ya tenía `Modal`, `Animated` y
   `react-native-safe-area-context`. No se añadió ninguna dependencia externa en
   ninguna de las dos fases.

2. **El núcleo vive en `packages/*`, no duplicado por app.** Es la regla del
   monorepo (`CLAUDE.md`) y evita que la copia de un error se corrija en un
   cliente y no en el otro. Los barriles `@/shared/notifications` (web) y
   `@/notifications` (móvil) mantienen los imports de features sin cambios.

3. **Confirmaciones imperativas con `await`.** `confirm()` devuelve una
   `Promise<ConfirmationResult>`; el llamador decide qué hacer. Encaja con el
   patrón `useMutation` y evita reestructurar el JSX de cada pantalla.

4. **Estado sin librería nueva.** Las colas son vanilla (`useSyncExternalStore`),
   sin Zustand/Redux. Una confirmación a la vez; las siguientes se encolan para
   que un aviso crítico nunca quede oculto.

5. **Cerrar ≠ cancelar.** `ConfirmationResult.action` distingue
   `confirm` / `cancel` / `dismiss` (Escape o clic fuera en web; toque fuera o
   botón atrás de Android en móvil).

6. **Mensajes de error separados del transporte.** `resolveError()` mapea
   `ApiError.kind` a copia amigable. Los mensajes del backend sólo se muestran
   para `validation` / `conflict` / `rate-limit` y sólo si no parecen técnicos.
   El resto usa copia genérica; `requestId` y `kind` van a telemetría.

7. **Sin toasts nativos del sistema.** No se usa `Alert` de React Native: es
   modal, bloquea la interacción y no admite la copia ni la política del motor.
   Un aviso de resultado no debe interrumpir un entrenamiento en curso.

## Diferencias por cliente

| | Web | Móvil (iOS/Android) |
| --- | --- | --- |
| Política | `defaultPolicy` | `nativePolicy` (duraciones algo mayores) |
| Toasts visibles | los que apile sonner | 2 (`ToastQueue({ maxVisible: 2 })`) |
| Posición | esquina superior derecha | superior, bajo el notch (safe area) |
| Descartar | botón/timeout de sonner | toque sobre el aviso + timeout |
| Modal | Radix Dialog (`z-[100]`) | `Modal` nativo (por encima de todo) |
| Movimiento | CSS | `Animated`, respeta «Reducir movimiento» |

## Accesibilidad

**Web** — `confirm-root.tsx` se apoya en Radix Dialog: `role="dialog"`,
`aria-modal`, título/descripción asociados, focus trap y restauración de foco.
Para severidad `danger` el foco inicial va al botón seguro (**Cancelar**).
Escape y clic fuera se pueden bloquear con `dismissible: false`. Los toasts usan
las regiones vivas de sonner.

**Móvil** — los toasts se anuncian con `accessibilityRole="alert"` +
`accessibilityLiveRegion="polite"` y declaran el gesto de descarte con
`accessibilityHint`. El diálogo usa `accessibilityViewIsModal`, mueve el foco de
VoiceOver/TalkBack a la tarjeta al abrirse (`AccessibilityInfo.setAccessibilityFocus`)
y coloca la acción segura primero en el orden de lectura y de toque. Todos los
controles respetan `minTouchTarget` (44 pt). La animación de entrada se reduce a
un fundido cuando el sistema tiene «Reducir movimiento» activo. El contenedor de
toasts es `pointerEvents="box-none"`: nunca bloquea la pantalla debajo.

## Jerarquía de capas

- **Web** — overlay de diálogos de UI: `z-50`; confirmación crítica: overlay
  `z-[100]` / panel `z-[101]`; toasts: portal propio de sonner.
- **Móvil** — `ToastHost` se monta al final del árbol, sobre el navegador;
  `ConfirmRoot` es un `Modal` nativo, que el sistema sitúa por encima de todo,
  incluidos los toasts.

## Cómo cambiar de proveedor visual

- **Toasts (web):** implementar `ToastAdapter` (`show`/`dismiss`) para la nueva
  librería y pasarlo a `new NotificationEngine(nuevoAdapter)`. Ningún componente
  cambia.
- **Toasts (móvil):** reescribir `toast-host.tsx` consumiendo `toastQueue`; la
  cola, los tiempos y la deduplicación no cambian.
- **Modales:** reescribir el `ConfirmRoot` del cliente consumiendo `confirmStore`;
  la API `confirm()` / `confirmDelete()` no cambia.

## Cómo añadir un cliente

1. Elegir un `ToastAdapter` (una librería existente, o `new ToastQueue()` y
   pintarla).
2. Crear el singleton: `new NotificationEngine(adapter, policy)`.
3. Enlazar `confirmStore` a un diálogo modal del cliente.
4. Exponer todo en un barril propio e instalar un sink de telemetría.

## Telemetría

`telemetry.ts` expone `setTelemetrySink(fn)`. El paquete no asume entorno: su
sink por defecto es un no-op y cada cliente instala el suyo al arrancar (consola
sólo en desarrollo; `@gymsheet/observability`/Sentry en producción). Nunca se
registran cuerpos de mensaje (pueden contener datos del usuario); sólo
`severity`, `code`, `requestId`, `correlationId`, `retryable`.
