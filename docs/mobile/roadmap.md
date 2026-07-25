# Roadmap móvil (Fases 4–15)

Estado actual: **Fases 0–3 completas** (auditoría, monorepo, paquetes compartidos, base Expo
con auth + navegación). Lo siguiente requiere iteración por módulo, dispositivos reales y
credenciales de tiendas.

## Fase 4 — Autenticación ✅ base implementada
- Login, hidratación/recuperación de sesión, logout, guardas de ruta, SecureStore.
- Pendiente backend: emisión por bearer, refresh rotativo, revocación remota.

## Fase 5 — Sistema de diseño móvil (parcial)
- Hecho: `Screen`, `AppText`, `Button`, `Input`, tema desde `@gymsheet/design-tokens`.
- Pendiente: `Select`, `Checkbox`, `Switch`, `Card`, `Badge`, `EmptyState`, `ErrorState`,
  `LoadingState`, `Skeleton`, `BottomSheet`, `Dialog`, `Toast`, `ListItem`.

## Fase 6 — Navegación (base implementada)
- Grupos `(auth)`/`(app)` + tabs. Pendiente: stacks por módulo, deep links, botón Atrás Android.

## Fase 7 — Migración de módulos (por prioridad)
- Nivel 1 (MVP): login ✅, recuperar contraseña ✅, inicio, perfil, notificaciones, consulta
  principal, logout ✅.
- Nivel 2: formularios, alta/edición, búsquedas, filtros, carga de archivos, historial.
- Nivel 3: exportaciones, reportes, administración (probablemente solo web).
- Plantilla por módulo: endpoints → DTO → tipos → schemas → hooks → pantalla → estados
  (carga/vacío/error) → tests → permisos → documentar diferencias con web.

## Fase 8 — Archivos y recursos del dispositivo
- `expo-document-picker`/`expo-image-picker` (reemplazan `<input type=file>`),
  `expo-file-system` + `expo-sharing` (descargas), `expo-camera`, `expo-clipboard`.
- Validar tamaño/tipo, comprimir imágenes, progreso y reintentos, permisos rechazados.

## Fase 9 — Offline y conectividad
- Empezar por nivel básico/intermedio: `@react-native-community/netinfo`, persistencia
  controlada de TanStack Query, borradores locales, reintentos con límite, estado de sync.

## Fase 10 — Notificaciones push
- `expo-notifications`: token de dispositivo, registro en backend
  (`device_id, user_id, platform, push_token, app_version, last_active_at, is_active`),
  revocación, navegación desde notificación, preferencias, sin datos sensibles en el texto.

## Fase 11 — Observabilidad
- Sentry (excepciones + source maps) por versión/ambiente; eventos vía `@gymsheet/observability`
  (`login_success`, `screen_view`, `primary_action_completed`, …). Nunca loguear las
  `REDACTED_KEYS`.

## Fase 12 — Pruebas
- Ver `estrategia-pruebas.md`. Priorizar tests unitarios de `packages/*` (protegen ambas apps).

## Fase 13 — Seguridad
- Tokens solo en SecureStore, sin secretos en el bundle, HTTPS, revisión de deep links,
  rate limits en backend, refresh rotativo, validación de archivos, auditoría de dependencias.

## Fase 14 — CI/CD ✅ esqueleto
- `.github/workflows/ci.yml` (web+paquetes / mobile-validate) y `mobile-release.yml` (EAS).
- Pendiente: `EXPO_TOKEN`, `projectId`, pipeline de staging con distribución interna + E2E.

## Fase 15 — Publicación
- Ver `publicacion.md`. Assets reales, credenciales EAS, TestFlight/prueba interna,
  política de privacidad, publicación gradual.
