# Reporte de implementación

> **Fase 1 — web** (§1–§16) · **Fase 2 — iOS/Android** (§17 en adelante).

## Fase 1 — apps/web

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
  (SecureStore/RN); el núcleo `core/` es reutilizable como base. **Resuelto en la
  fase 2** (§17).

## 16. Próximos pasos

1. Conectar telemetría real vía `setTelemetrySink`.
2. Evaluar confirmaciones para transiciones de estado sensibles a producción.
3. ~~Portar el núcleo agnóstico a `apps/mobile` con un adaptador nativo.~~ Hecho
   en la fase 2.

---

## Fase 2 — apps/mobile (iOS/Android)

## 17. Resumen ejecutivo

El núcleo agnóstico se extrajo de `apps/web` a **`packages/notifications`** y se
construyó el renderer nativo en `apps/mobile`: pila de toasts propia
(`ToastHost`) y diálogo de confirmación sobre `Modal` de React Native. La API
(`notify`, `confirm`, `confirmDelete`) es idéntica en los dos clientes, y la
copia de errores, la política y la deduplicación ahora existen **una sola vez**.
Sin dependencias nuevas en ninguna de las dos apps.

Las features de `apps/web` **no cambiaron**: siguen importando
`@/shared/notifications`; ese barril ahora reexporta el paquete.

## 18. Estado inicial del móvil

- **Cero** superficie de notificación: ni toasts, ni confirmaciones, ni `Alert`.
- `login.tsx` mostraba `error.message` crudo del backend en un `<AppText>`.
- **Cerrar sesión** se ejecutaba al primer toque, sin confirmación.
- `onUnauthorized` (`src/api/client.ts`) borraba los tokens en silencio: la
  sesión desaparecía sin explicación.
- `recover-password.tsx` mostraba «enviamos instrucciones» incluso si la petición
  fallaba por red (`finally`), afirmando un éxito que no ocurrió.

## 19. Arquitectura implementada

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md). El motor pasa a `packages/notifications`;
web conserva su adaptador `sonner` + `ConfirmRoot` de Radix; el móvil añade
`ToastQueue` → `ToastHost` y `ConfirmRoot` sobre `Modal`.

## 20. Archivos creados

```
packages/notifications/
  package.json · tsconfig.json
  src/{index,types,messages,dedupe,policy,telemetry,notify,confirm-store,toast-queue}.ts

apps/mobile/src/notifications/
  index.ts                 barril público
  notify.ts                ToastQueue(maxVisible: 2) + singleton + sink dev
  toast-host.tsx           pila de toasts (safe area, Animated, box-none)
  confirm-root.tsx         diálogo global sobre Modal nativo
  notification-root.tsx    monta ambas superficies
  use-reduce-motion.ts     lee «Reducir movimiento» del sistema

apps/web/src/shared/notifications/toast-queue.test.ts   (cubre la cola del móvil)
```

## 21. Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/shared/notifications/{index,notify}.ts` | reexportan `@gymsheet/notifications`; el singleton instala el sink dev |
| `apps/web/src/shared/notifications/adapters/toast-adapter.ts` | importa el contrato `ToastAdapter` del paquete |
| `apps/web/src/shared/notifications/confirm/confirm-root.tsx` | `confirmStore` desde el paquete |
| `apps/web/{next.config.ts,vitest.config.ts,package.json}` | alta de `@gymsheet/notifications` |
| `apps/mobile/src/providers/app-providers.tsx` | monta `<NotificationRoot />` |
| `apps/mobile/src/api/client.ts` | aviso único de sesión expirada en `onUnauthorized` |
| `apps/mobile/src/components/ui.tsx` | `Button` con variantes `primary`/`danger`/`ghost` y `accessibilityState` |
| `apps/mobile/src/theme/index.ts` | reexporta `tones` |
| `apps/mobile/app/(auth)/login.tsx` | `error.message` crudo → `notify.error(error)` |
| `apps/mobile/app/(auth)/recover-password.tsx` | no declara éxito si la petición no salió del dispositivo |
| `apps/mobile/app/(app)/settings.tsx` | cerrar sesión pide confirmación + resultado |

Se eliminaron de `apps/web` los archivos ahora compartidos: `core/{types,
messages,dedupe,policy,telemetry}.ts` y `confirm/confirm-store.ts`.

## 22. Acciones protegidas y errores traducidos (móvil)

| Pantalla | Antes | Ahora |
| --- | --- | --- |
| `settings.tsx` | cierre de sesión inmediato | `confirm` + `notify.success` |
| `login.tsx` | `error.message` del backend en pantalla | `notify.error(error)` → copia amigable |
| `api/client.ts` (401) | tokens borrados en silencio | aviso «Sesión expirada» (deduplicado) |
| `recover-password.tsx` | «enviamos instrucciones» aunque fallara la red | error de red explícito; el resto sigue neutro (anti-enumeración) |

## 23. Accesibilidad (móvil)

`accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` en los toasts,
con `accessibilityHint` del gesto de descarte; `accessibilityViewIsModal` y
movimiento del foco de VoiceOver/TalkBack a la tarjeta del diálogo; acción
segura primero en orden de lectura y de toque en prompts destructivos; objetivos
de 44 pt; animación reducida a fundido con «Reducir movimiento»; contenedor de
toasts `pointerEvents="box-none"` para no bloquear la pantalla.

## 24. Pruebas ejecutadas

Las suites de la fase 1 siguen en verde apuntando ya al paquete compartido
(`messages`, `dedupe`, `confirm-store`, `notify`, `confirm-root`). Añadida:

- `toast-queue.test.ts` (6) — auto-descarte por duración, toast persistente,
  reemplazo por id (`loading` → resultado), tope de la pila, notificación a
  suscriptores con snapshot estable, `dismiss()` global limpia temporizadores.

## 25. Resultados

```
turbo run source-check type-check lint test --filter=!@gymsheet/mobile   ✓ (103/103)
yarn workspace @gymsheet/web build                                       ✓
yarn workspace @gymsheet/mobile type-check                               ✓
expo start --android  (emulador Pixel_4, Android 16)                     ✓
```

## 25 bis. Verificación en emulador y defectos que destapó

Ejecutada sobre un AVD Pixel_4 con Expo Go, contra el backend real en
`10.0.2.2:3000`. Se recorrió login fallido → login correcto → Ajustes → cerrar
sesión → vuelta al login. **Tres defectos que ni el tipado ni las pruebas podían
ver** aparecieron y se corrigieron:

| # | Síntoma en pantalla | Causa | Corrección |
| --- | --- | --- | --- |
| 1 | Un login fallido mostraba **dos** avisos | el 401 del propio login disparaba `onUnauthorized`, pensado para sesiones caídas | `src/api/client.ts` sólo avisa si había token guardado |
| 2 | Decía «Tu sesión expiró» ante credenciales malas | copia genérica de `unauthorized`, que asume sesión previa | `login.tsx` trata ese `kind` con «Correo o contraseña incorrectos.» |
| 3 | «Cerrar sesión» partido en dos líneas en el diálogo | ambos botones a `flex: 1` con el padding de un botón suelto | padding lateral reducido en `confirm-root.tsx` |

Verificado además en dispositivo: tonos por severidad, apilado con tope de 2,
posición bajo el notch, descarte por toque, el `Modal` por encima de la barra de
pestañas, y el sink de telemetría registrando sólo `severity`/`code` — nunca el
cuerpo del mensaje.

## 25 ter. Bloqueos previos del proyecto que hubo que resolver para poder probar

Ninguno viene de este trabajo; la app móvil simplemente nunca se había levantado.

1. **Dos Reacts incompatibles.** `resolutions` en la raíz forzaba `react@19.2.0`
   (Next 16) sobre todo el monorepo, pero Expo SDK 53 / RN 0.79 está construido
   contra **19.0.0** y aborta con *«Incompatible React versions»*. Yarn 1 no
   admite versiones por workspace: los `resolutions` anidados (`pkg/dep`) se
   ignoran. Solución: la raíz declara React 19.2 (fija la copia hoisted que usan
   `next` y `eslint-config-next`), `apps/mobile` queda con su 19.0.0 vía
   `nohoist`, y `scripts/dedupe-react.mjs` (en `postinstall`) poda las copias
   anidadas espurias que Yarn crea bajo `@tanstack/react-query` y
   `react-hook-form` — dos Reacts en un mismo árbol rompían las 6 pruebas de
   tutoriales con «Cannot read properties of null (reading 'useEffect')».
2. **Contrato de login desalineado.** `POST /auth/login` serializa el rol como
   `rol` (mientras `GET /auth/me` y `sessionPrincipalSchema` usan `role`) y **no
   emite refresh token** — requisito 2 de `docs/mobile/autenticacion.md`, aún
   pendiente en el backend. `src/state/auth-store.ts` normaliza el rol y acepta
   la ausencia de refresh token; hasta que exista `POST /auth/refresh`, la sesión
   dura lo que el access token (~15 min).
3. **`@gymsheet/observability` no compilaba** (`Cannot find name 'console'`): su
   tsconfig declaraba sólo `lib: ES2022`. Estaba enmascarado por la caché de
   Turbo. Añadido `DOM`, como ya hacía `api-client`.
4. **Bug del Expo CLI** al arrancar (`Body is unusable: Body has already been
   read` en el chequeo de versiones): se evita con
   `EXPO_NO_DEPENDENCY_VALIDATION=1`. Y el emulador no alcanza Metro por IP LAN
   (firewall de Windows), así que hay que arrancar con `--localhost` + `adb
   reverse tcp:8081 tcp:8081`.

## 26. Problemas pendientes (móvil)

- **Sin runner de tests en `apps/mobile`**: su script `test` es
  `jest --passWithNoTests` y jest no está instalado, así que los componentes RN
  (`ToastHost`, `ConfirmRoot`) no tienen pruebas unitarias. La lógica que sí es
  verificable —la cola— se prueba en `apps/web`. Instalar `jest-expo` +
  `@testing-library/react-native` es el siguiente paso natural.
- **Sin verificación en simulador**: `expo run:ios` requiere macOS/Xcode, no
  disponible en este entorno. Lo validado es tipado y lógica, no render en
  dispositivo.
- **Salida de toasts sin animación**: la entrada está animada; al descartarse, el
  aviso desaparece sin transición (la cola lo quita de inmediato).
- **Tema claro**: el móvil sigue siendo sólo oscuro (`tones.dark`); cuando adopte
  `themes`, los tonos de toast/diálogo deben leerse del tema activo.
- Telemetría de producción (Sentry) sigue sin cablear en ambos clientes: el sink
  por defecto es no-op y cada app instala uno de consola sólo en desarrollo.
