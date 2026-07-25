# Publicación (iOS & Android)

## Configuración base (ya en el repo)

- `apps/mobile/app.json`: `name`, `slug`, `scheme` (`gymsheet`), bundle IDs
  (`app.gymsheet.mobile`), icono/splash, plugins (`expo-router`, `expo-secure-store`,
  `@sentry/react-native`), `newArchEnabled`, `typedRoutes`.
- `apps/mobile/eas.json`: perfiles `development` (dev client, interno), `preview` (interno,
  canal `preview`), `production` (canal `production`, `autoIncrement`).
- `.github/workflows/mobile-release.yml`: build EAS por `workflow_dispatch` o tag `mobile-v*`.

## Requisitos previos (equipo)

1. Cuenta Expo/EAS y `projectId` real en `app.json > extra.eas.projectId`.
2. `EXPO_TOKEN` como secret del repositorio.
3. Assets reales en `apps/mobile/assets/` (`icon.png`, `splash.png`, `adaptive-icon.png`).
4. Credenciales gestionadas por EAS (`eas credentials`).

## Android (Google Play)

Identificador de paquete · firma (EAS) · nombre/iconos/splash · política de privacidad ·
descripción y capturas · clasificación de contenido · pruebas internas → cerradas →
producción · publicación gradual.

## iOS (App Store)

Bundle identifier · certificados y provisioning (EAS) · App Store Connect · política de
privacidad y permisos justificados · capturas · TestFlight · revisión · producción.

## Versionado

Semver `MAJOR.MINOR.PATCH`. Registrar: versión visible, build number iOS, version code
Android, commit Git, ambiente y fecha. No reutilizar build numbers; etiquetar releases
(`mobile-vX.Y.Z`) y generar changelog. Definir versión mínima soportada del backend.

## Pipeline de release

```text
tag mobile-vX.Y.Z
  → CI (type-check + expo-doctor)
  → EAS build (Android + iOS, perfil production)
  → firma gestionada por EAS
  → TestFlight / Prueba interna Android
  → revisión
  → publicación gradual + monitoreo (Sentry)
```

## Criterios de aceptación

Builds firmadas · fichas completas · política de privacidad accesible · permisos
justificados · TestFlight y prueba interna aprobadas · rollback posible (canales EAS Update).
