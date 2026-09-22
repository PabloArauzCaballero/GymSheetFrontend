# Hallazgos — Fase 01 (auditoría con evidencia real)

> Entorno: backend NestJS desde fuente en `:3005` contra PostgreSQL local (`gymsheetbackend-postgres-1`,
> puerto 5433), web Next.js desde fuente en `:3006`. Cuentas usadas: `super@qa.test` (`SYSTEM_ADMIN`),
> `admin.a@qa.test` (`ADMIN`, tenant `topfitness`). Capturas en `trabajo/evidencia/`.

## H01 — El BFF nunca aprendió las rutas de Auditoría, Permisos, Moderación y Reportar contenido — **CORREGIDO Y VERIFICADO**

**Severidad: P1 (autorización/funcionalidad rota).** Cuatro pantallas dadas por "implementadas y
verificadas" en sesiones previas del plan de admin portal están completamente desconectadas del
backend en producción-equivalente, porque `apps/web/src/shared/server/backend-route-policy.ts`
—el allowlist explícito que decide qué rutas reenvía el proxy `/api/backend/[...path]`— nunca se
actualizó cuando se construyeron:

| Función | Prefijo real en el backend | ¿En el allowlist del BFF? |
|---|---|---|
| Auditoría (`/admin/auditoria`, `/sistema/auditoria`) | `admin/audit` (`audit.controller.ts:22`) | **No** |
| Permisos (`/admin/permissions`) | `admin/permissions` (`admin-access.controller.ts:18`) | **No** |
| Moderación (`/admin/moderacion`) | `admin/moderation` (`moderation.controller.ts:58`) | **No** |
| Reportar contenido (botón en `/perfil/[userId]`) | `me/reports` (`moderation.controller.ts:35`) | **No** |

**Evidencia:**
- `grep -n "permission\|moderat\|audit" backend-route-policy.ts` → cero coincidencias (el archivo
  tiene 134 líneas de patrones para todo lo demás: acceso, equipamiento, membresía, chat,
  descubrimiento, stories...).
- Reproducido en vivo como `SYSTEM_ADMIN`: `GET /api/backend/admin/audit?limit=50` → **404** con
  un toast visible "No encontrado — No encontramos el recurso solicitado" (captura
  `evidencia/sistema-auditoria.png`).
- Confirmado que el backend SÍ sirve la ruta: `curl http://127.0.0.1:3005/api/v1/admin/audit`
  (sin cookie) → **401** (ruta existe, exige auth — no 404).
- `resolveAllowedBackendPath()` es un allowlist estricto (`.some(pattern => pattern.test(path))`,
  por defecto deniega); sin una entrada que matchee, cualquier llamada a esos cuatro prefijos se
  corta en el BFF antes de tocar el backend real, para cualquier cuenta y cualquier rol.

**Impacto real:** `/admin/auditoria`, `/sistema/auditoria`, `/admin/moderacion` y `/admin/permissions`
renderizan su cáscara y un estado vacío que **parece** un estado vacío legítimo ("Todavía no hay
actividad registrada") pero en realidad es un 404 silenciado — nunca mostrarán datos reales, y
cualquier escritura (otorgar un permiso, resolver un caso de moderación) fallaría igual. El botón
"Denunciar" en el perfil ajeno (cerrado en la fase F4 de moderación, según la memoria del proyecto)
tampoco puede completar su llamada.

**Corrección:** añadir a `allowedPathPatterns` cuatro entradas (siguiendo el estilo ya establecido
en el archivo, con `resourceId` donde aplique):
```
/^\/admin\/audit$/u,
/^\/admin\/permissions(\/me)?$/u,
new RegExp(`^/admin/permissions/${resourceId}$`, 'u'),
/^\/admin\/moderation\/(queue|cases)$/u,   // ajustar a las subrutas reales del controller
new RegExp(`^/admin/moderation/cases/${resourceId}(/claim|/resolve)?$`, 'u'),
/^\/me\/reports$/u,
```
(revisar `moderation.controller.ts` y `admin-access.controller.ts` para las subrutas exactas antes
de fijar los patrones — no adivinar). Riesgo de la corrección: bajo, aditivo, no toca rutas
existentes. Prueba: repetir la llamada `GET /api/backend/admin/audit` autenticado y confirmar 200
con datos reales (o array vacío legítimo, no 404).

**Aplicado en esta misma pasada** (`backend-route-policy.ts` + `backend-route-policy.test.ts`,
16 rutas nuevas siguiendo las subrutas reales de `audit.controller.ts`, `admin-access.controller.ts`
y `moderation.controller.ts`, con `targetKind` acotado al enum cerrado en vez de un comodín).
Verificado: `vitest run backend-route-policy.test.ts` → 65/65; reproducido en vivo con
`super@qa.test` en `/sistema/auditoria` → `GET /api/backend/admin/audit?limit=50` pasó de 404 a
**200**, y el toast "No encontrado" desapareció (captura `evidencia/sistema-auditoria-FIX-H01.png`
comparada con `evidencia/sistema-auditoria.png` de antes). No se probó en vivo `/admin/permissions`
ni `/admin/moderacion` (requieren una cuenta `ADMIN` con los permisos granulares concedidos, fuera
de esta pasada) — la corrección para esas dos rutas descansa en el mismo mecanismo ya verificado
para auditoría más el test unitario, no en una segunda reproducción en navegador.

## H02 — El tour de onboarding no puede persistir: reaparece en cada navegación dura

**Severidad: P2 (papelón de UX real, reproducido en 6 navegaciones, 2 cuentas, escritorio y 375px).**

El backend no implementa `/me/tutorial-progress` (cero coincidencias en `GymSheetBackend/src`).
El código del frontend ya anticipa esto con un diseño deliberado
(`tutorial-progress-gateway.ts`): si el backend no puede servir la ruta, degrada a un mapa
**en memoria** (`local-progress-store.ts`), con un comentario explícito: *"this cache lives for the
session only... survives reloads via the backend, not this map"*. El supuesto no se cumple: no hay
backend que persista nada, así que cada recarga dura (F5, o en esta auditoría, cada
`page.goto`/navegación entre rutas admin) reinicia el tour al paso 1/5, para cualquier cuenta,
indefinidamente.

**Evidencia:** capturas `evidencia/sistema-system_admin-tutorial-dialog.png`,
`evidencia/dashboard-admin-topfitness.png`, `evidencia/admin-grid-topfitness.png`,
`evidencia/workouts-list-mobile-375.png` — las cuatro muestran el mismo diálogo "¡Hola! 👋 1/5" tras
haberlo cerrado explícitamente momentos antes (con `Omitir` o con la X), en dos cuentas distintas
(`super@qa.test`, `admin.a@qa.test`).

**Matiz importante (R14):** dentro de una misma pestaña, con navegación cliente (clics en la barra
lateral, sin recarga dura), el mapa en memoria sí debería sobrevivir — no se verificó ese camino
exacto en esta pasada porque la auditoría navegó con `page.goto` (equivalente a recarga dura) la
mayoría de las veces. Lo que sí está probado y no admite duda es el caso de recarga dura.

**Impacto real:** cualquier usuario que recargue la página, cierre y reabra la pestaña, o abra un
enlace en pestaña nueva, ve el tour desde cero. Además, el copy ("te mostraremos cómo moverte...
entrenamiento, progreso...") está escrito para un socio del gimnasio, no para `SYSTEM_ADMIN` ni
`ADMIN` — vale la pena decidir en fase 02 si el tour debe mostrarse a cuentas de personal.

**Corrección de fondo:** implementar `/me/tutorial-progress` (GET) y `/me/tutorial-progress/:id`
(PUT) en el backend — fuera del alcance de un refactor de frontend puro, se registra como bloqueo
con propietario. Mitigación de frontend posible mientras tanto: usar `sessionStorage` (no
`localStorage`, coherente con la regla del repo) en vez de un `Map` en memoria de módulo, para que
al menos sobreviva una recarga dentro de la misma pestaña — a decidir en fase 02/06, no aplicado
aquí sin autorización de producto sobre alcance de esta regla.

## H03 — El dashboard de un `ADMIN` prioriza un mensaje de venta de membresía sobre su tarea operativa

**Severidad: P3 (arquitectura de información, no defecto funcional).**

Al iniciar sesión como `admin.a@qa.test` (`ADMIN`, gimnasio `topfitness`), lo primero que ve bajo el
encabezado es una tarjeta "Aún no tienes membresía — Renueva desde la app, o avísanos si ya pagaste
en recepción" (captura `evidencia/dashboard-admin-topfitness.png`). Es el mismo dashboard de un
socio, sin distinguir que quien entra es personal del gimnasio cuya tarea principal al iniciar
sesión es casi con certeza operar (ver clientes, marcar acceso, revisar equipamiento), no pagar su
propia cuota. Los indicadores reales (sesiones, volumen, avisos) aparecen después, todos en cero.

**No es un bug — es una decisión de IA a revisar en fase 02**, con el criterio del propio
`PROMPT_MAESTRO.md`: "Mantén visible y reconocible la acción principal de cada contexto." Candidatas
a evaluar: dashboard distinto para cuentas con rol de personal, o la tarjeta de membresía
reordenada/condicionada cuando el usuario tiene además acceso a `/admin`.

## Nota de entorno (no es hallazgo de producto)

Un `.next` con un build de producción del 15-sep mezclado con la caché de `next dev` del día de hoy
causaba 404 en **todo** el grupo de rutas `(auth)` (`/login`, `/register`, `/recover-password`) —
bloqueaba el login por completo. Se resolvió con `rm -rf apps/web/.next` + reinicio. Documentado
también en memoria de proyecto (`gymsheet-web-local-run.md`) para no perder tiempo si se repite.

## Nota de entorno #2 — medios rotos por el puerto del backend, no por el producto

En `/comunidad` aparecieron dos `400` de `/api/media?url=...localhost%3A3001...`: fotos de perfil
sembradas apuntan al backend Docker viejo (puerto 3001), pero esta auditoría corre un backend
propio en el 3005. Es un artefacto de tener dos backends contra la misma base de datos con
puertos distintos, no un defecto de `signedMediaSrc()`/`media-proxy.ts` — no se investiga más en
esta pasada. La lista de socios en esa pantalla es además datos de QA (`Smoke17876...`,
`Visual17876...`, `Debug C.`, `Isolate`, decenas de variantes) — no sirve como evidencia de
densidad de contenido real, solo de que la lista, la búsqueda y el "Podio del gimnasio" renderizan.

## Pendiente de esta fase (no ejecutado, alcance para continuar)

- Recorrido de "descubrir" (swipe) y "recuperar contraseña" o "editar ejercicio"
  (recuperación/edición) — quedan para la siguiente pasada de fase 01.
- No se probó con cuenta de miembro sin rol de personal (`CLIENTE`/similar) — todo lo anterior es
  con cuentas de staff.
- No se corrieron axe-core/Playwright de accesibilidad todavía (eso es fase 09, pero un barrido
  temprano barato es razonable — pendiente).
- Confirmar en vivo `/admin/moderacion` y `/admin/permissions` con una cuenta `ADMIN` a la que se
  le conceda `moderation:read`/`admin-access:manage` (la corrección de H01 las cubre por el mismo
  mecanismo que auditoría, pero solo auditoría tiene reproducción en navegador).
