# Matriz de reutilización (Fase 0)

Clasificación de cada módulo del frontend según su reutilización web/móvil.

Categorías: **Compartible** (directo), **Compartible con adaptación** (quitar deps de
navegador), **Exclusivo web** (HTML/DOM), **Exclusivo móvil** (APIs nativas).

| Módulo original | Categoría | Destino | Estado |
|---|---|---|---|
| `shared/api/contracts/*` (tipos, enums) | Compartible | `@gymsheet/types` | ✅ Extraído |
| `shared/api/schema-definitions/*` (Zod) | Compartible | `@gymsheet/schemas` | ✅ Extraído |
| `shared/api/api-error.ts` | Compartible | `@gymsheet/api-client` | ✅ Extraído |
| `shared/api/api-client.ts` (fetch BFF) | Compartible con adaptación | `@gymsheet/api-client` (core transport-agnóstico) | ✅ Core extraído; web conserva su cliente BFF |
| `shared/lib/numbers.ts`, `lib/date.ts` | Compartible | `@gymsheet/domain` | ✅ Extraído |
| Reglas de roles/permisos | Compartible | `@gymsheet/domain` (`permissions.ts`) | ✅ Nuevo |
| Contrato de sesión / almacenamiento auth | Compartible | `@gymsheet/auth` (`AuthStorage`, `SessionState`) | ✅ Nuevo |
| Tokens visuales (colores, spacing, radios) | Compartible | `@gymsheet/design-tokens` | ✅ Extraído de `globals.css` |
| Logger / analítica / redacción | Compartible | `@gymsheet/observability` | ✅ Nuevo |
| Schemas de formularios (login/registro) | Compartible | `@gymsheet/schemas` (`forms.ts`) | ✅ Nuevo |
| `shared/api/query-keys.ts` | Compartible con adaptación | Candidato a `@gymsheet/hooks` | ⏳ Pendiente |
| Hooks TanStack Query por feature | Compartible con adaptación | Candidato a `@gymsheet/hooks` | ⏳ Pendiente (viven en `services/`) |
| `shared/server/*` (cookies, CSRF, sesión) | Exclusivo web | `apps/web` | ⛔ No migra |
| `shared/components/ui/*` (Radix, Tailwind) | Exclusivo web | `apps/web` | ⛔ Reimplementado nativo en `apps/mobile/src/components` |
| `shared/components/layout/*` (portal shell, sidebar) | Exclusivo web | `apps/web` | ⛔ Navegación móvil propia (tabs) |
| `features/*/components/*` (JSX DOM) | Exclusivo web | `apps/web` | ⛔ Pantallas nativas por feature |
| SecureStore, cámara, push, deep links | Exclusivo móvil | `apps/mobile` | 🆕 Nativo |

## Estimación de reutilización

- **Lógica de negocio compartida hoy**: tipos, validaciones, contrato de API, formateadores,
  permisos, contratos de auth, tokens de diseño y observabilidad → ~100 % de la lógica no visual.
- **UI**: 0 % compartida por diseño (web = DOM/Tailwind, móvil = React Native nativo).
- La prioridad no es un porcentaje alto de código compartido, sino **una única fuente de
  verdad para la lógica** y una experiencia móvil realmente nativa.

## Próximos candidatos a extraer

1. `@gymsheet/hooks` — hooks de TanStack Query (queries/mutaciones/invalidación) que hoy
   viven acoplados a los `services/` de cada feature web.
2. Casos de uso de dominio adicionales (cálculos de workouts, políticas de membresía).
