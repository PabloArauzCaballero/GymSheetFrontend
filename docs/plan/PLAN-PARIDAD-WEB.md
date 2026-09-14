# Plan — Paridad móvil → web (cierre)

Fecha: 2026-09-13 · Rama base: `dev` @ `61f7860` · Estado: **propuesto**

## Contexto

El commit `61f7860` ("la capa social alcanza al móvil") cerró la mayor parte de la brecha
social en web: directorio con filtros, Descubrir con baraja persistida y arrastre real
(framer-motion), perfil ajeno con registro de visita, interacciones completas (likes,
vistas, nexts, devolver a la baraja), stories con subida y visor, y chat completo
(media multipart, vista única, ubicación, apodo, presencia y checks por socket).

Auditoría fichero a fichero (2026-09-13) confirma que los contratos compartidos
(`packages/schemas/src/definitions/social.ts`, `stories.ts`) ya se consumen desde ambas
apps y que la web tiene camino de subida multipart propio (`shared/api/api-client.ts`
`apiUpload` → BFF `app/api/backend/[...path]/route.ts`).

## Huecos reales restantes (verificados)

| # | Hueco | Evidencia |
|---|-------|-----------|
| H1 | **Push web** inexistente: sin service worker ni `PushManager`; `/notifications/device-tokens` ni siquiera está en el allowlist del BFF (`shared/server/backend-route-policy.ts`). El backend de push actual es Expo Push API (solo tokens móviles). | `apps/mobile/src/notifications/push.ts` no tiene equivalente web |
| H2 | **Captura desde cámara** en stories y galería de perfil: `shared/components/media/camera-capture.tsx` existe pero solo lo usa admin. | `plan-image-button.tsx:208`, `person-enrollment.tsx:223` |
| H3 | **Registrar peso manual**: `onboarding-service.ts:47-56 addMeasurement` existe sin ningún consumidor; en móvil es la pantalla `registrar-peso.tsx`. | grep `addMeasurement` → solo la definición |
| H4 | **`MembershipGate`** (aviso de membresía no vigente + petición de activación) no existe en `/dashboard`. | grep en web → 0 resultados |
| H5 | **Divergencia de vídeo en stories**: la web acepta `image/*,video/*` y reproduce vídeo; el móvil restringe a imágenes por no tener reproductor (`stories-bar.tsx:246`). Un vídeo subido desde web **no se puede ver en móvil**. | `stories-strip.tsx` vs `stories-bar.tsx` |
| H6 | Baraja web limitada a `max-w-2xl` (decisión razonable en escritorio; opcional revisarla en viewport móvil-web). | `descubrir-client.tsx` |
| V0 | **Sin verificación E2E** de las pantallas web nuevas contra datos reales (declarado en el propio commit `61f7860`). | `INFORME-EJECUCION.md` |

Deuda anotada (no bloqueante): la lista de vistas de perfil re-agrega el historial en cada
página, y el contador de interacciones no comparte tope con la lista (>50 likes → números
discrepantes).

## Estado (2026-09-14)

**F1, F2, F3, F4 y F5 hechas y desplegadas en dev.** Queda F0 (E2E con Playwright) y los
pulidos de F6.

| Fase | Estado | Dónde |
|---|---|---|
| F0 — E2E de lo portado | **pendiente** | única deuda de verificación que queda |
| F1 — stories solo imágenes | hecha y **revertida por F5** (ya hay vídeo en ambas) | `stories-strip.tsx` |
| F2 — registrar peso + MembershipGate | hecha | `record-weight-dialog.tsx`, `membership-gate.tsx` |
| F3 — cámara en stories y galería | hecha | `media-source-dialog.tsx` |
| F4 — push web (VAPID) | hecha y **activa en dev** | ADR-0011; `public/sw.js`, `use-web-push.ts` |
| F5 — vídeo en stories | hecha | `expo-video` en el visor móvil + proxy de media |
| F6 — pulidos | pendiente | baraja a sangre, deuda de rendimiento |

Hallazgos que el plan no anticipaba y que resultaron ser el trabajo de verdad:

1. **La web tampoco reproducía vídeo**, y no por la subida sino por la lectura:
   `/api/media` sólo admitía `^image/...` y devolvía 415 para todo vídeo, sin `Range` y
   bufferizando el cuerpo entero. Reabrir `video/*` sin arreglar eso habría repetido el
   problema de H5 con los papeles cambiados. Arreglado de paso el vídeo del chat.
2. **El build standalone de Next no incluye `public/`**, así que el service worker de F4
   nunca habría llegado al contenedor. Se añade la copia al `Dockerfile`.
3. **Una redirección del proxy sobre `/sw.js` aborta el registro del worker en silencio**;
   por eso `sw.js` sale del matcher de `proxy.ts`.

## Fases

### F0 — Verificación E2E de lo ya portado (primero, sin escribir features)

- Playwright contra el stack local (API + web) con el sembrador de demo social.
- Recorridos: directorio→perfil ajeno→like, Descubrir (swipe + undo + match), story
  (subir→ver→espectadores→borrar), chat (texto, imagen, vista única, read receipts),
  interacciones (4 pestañas + devolver a la baraja).
- Criterio de salida: suite verde y capturas en `docs/plan/evidence/` (mismo patrón que
  `apps/mobile/ios-evidence/`).

### F1 — Alineación inmediata de stories (H5) — 1 línea + decisión

- Corto plazo: restringir `stories-strip.tsx` a `accept="image/*"` para no producir
  contenido inconsumible en móvil.
- Medio plazo (fase F5): `expo-video` en el visor móvil y re-habilitar vídeo en ambas.

### F2 — Registrar peso (H3) y MembershipGate (H4)

- H3: diálogo/página "Registrar peso" en web (entrada natural desde `trayectoria` y
  `dashboard`), consumiendo `addMeasurement` con `idempotencyKey` e invalidando las
  queries de mediciones/progresión. Espejo de `app/(app)/registrar-peso.tsx`.
- H4: componente `MembershipGate` web montado en `dashboard`, espejo de
  `apps/mobile/src/components/membership-gate.tsx` (mismo endpoint y misma semántica de
  petición de activación).

### F3 — Cámara en flujos sociales (H2)

- Montar `CameraCapture` (ya escrito) en `stories-strip.tsx` y
  `profile-photo-gallery.tsx` como alternativa al `<input type="file">`, con fallback
  limpio cuando no hay permiso/cámara (escritorio sin webcam).

### F4 — Push web (H1) — requiere backend

- Backend: soporte Web Push (VAPID) además de Expo Push — `device-tokens` con
  `platform: 'web'` + envío vía `web-push`; claves VAPID en env.
- Web: service worker (`public/sw.js` o integración Next), suscripción `PushManager`
  desde la página `notifications` (opt-in explícito), alta/baja del token vía BFF.
- BFF: añadir `/notifications/device-tokens` al allowlist de
  `backend-route-policy.ts`.
- Respetar la política de permisos del navegador: pedir permiso solo tras gesto del
  usuario, nunca al cargar.

### F5 — Vídeo en stories, ambas plataformas (cierre de H5 por arriba)

- `expo-video` en `story-viewer.tsx` móvil; levantar la restricción de
  `STORY_MEDIA_TYPES`; re-habilitar `video/*` en web.

### F6 — Pulidos opcionales

- H6: baraja a sangre en viewport estrecho (`max-w` responsivo).
- Deuda de rendimiento anotada (agregación de vistas de perfil, tope compartido de
  contadores) — coordinar con backend.

## Orden y dependencias

F0 → F1 (trivial) → F2 → F3 en paralelo con F4 (F4 depende de backend) → F5 → F6.
Todo lo nuevo sigue la dirección `apple-premium-ui` y respeta `prefers-reduced-motion`.

## Fuera de alcance

- Módulo de **publicaciones/posts**: no existe en backend ni en móvil; lo "Instagram"
  del producto son stories. Si se decide crearlo, es un plan propio (backend + ambas
  apps). El plan de media en `GymSheetBackend/docs/plan/PLAN-MINIO-MEDIA.md` ya reserva
  el prefijo de almacenamiento.
- Super-like/boost (R1.6): sin backend, decisión ya registrada.
- Biografía en la ficha: decisión de producto pendiente.
