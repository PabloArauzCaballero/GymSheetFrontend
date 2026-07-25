# Estrategia de pruebas

## Niveles

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitario (paquetes) | Vitest | Reglas de negocio, validaciones Zod, formateadores, permisos, redacción |
| Unitario/integración web | Vitest + Testing Library | Ya existente en `apps/web` (21 tests ✅) |
| Componentes móvil | Jest + `@testing-library/react-native` | Formularios, botones, estados, listas |
| Integración móvil | Jest | Cliente API, auth, refresh, caché, SecureStore (mocked) |
| E2E web | Playwright | Requiere backend + PostgreSQL activos |
| E2E móvil | Maestro (recomendado) o Detox | Login → recuperar sesión → módulo principal → logout |

## Paquetes compartidos

La lógica pura extraída a `packages/*` es el mejor candidato a tests unitarios rápidos y
deterministas (sin DOM ni RN). Prioridad:

1. `@gymsheet/schemas` — validación de contratos y formularios (casos válidos/ inválidos).
2. `@gymsheet/domain` — `permissions` (matriz rol→capacidad) y formateadores (locale es-BO).
3. `@gymsheet/api-client` — parseo de envelope, `ApiError`/`classifyStatus`, timeouts.
4. `@gymsheet/observability` — `redact()` no filtra claves sensibles.

Un test aquí protege **ambas** apps a la vez.

## Flujos E2E móviles mínimos

1. Abrir la app (hidratación de sesión sin flash de rutas privadas).
2. Iniciar sesión.
3. Recuperar sesión tras reinicio.
4. Navegar al módulo principal (tabs).
5. Crear/modificar un registro.
6. Cerrar sesión.
7. Token vencido → redirección a login.
8. Pérdida de conexión → error de red distinguible del error de servidor.

## Matriz de dispositivos

Android pequeño / moderno · iPhone pequeño / moderno · varias versiones de SO · modo claro y
oscuro · texto aumentado · conexión lenta · sin conexión.

## CI

- `.github/workflows/ci.yml`:
  - `web-and-packages`: `turbo run source-check type-check lint test --filter=!@gymsheet/mobile`
    + build de web.
  - `mobile-validate`: `type-check` de la app móvil + `expo-doctor`.
- Nota: los tests E2E (web y móvil) **no** corren en el CI base porque requieren backend/BD
  o toolchain nativo; se ejecutan en pipelines de staging con servicios activos.
