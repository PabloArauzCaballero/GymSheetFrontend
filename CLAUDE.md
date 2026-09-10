# GymSheet (monorepo)

Monorepo Yarn Workspaces + Turborepo. Dos apps que comparten lógica vía `packages/*`:

- `apps/web` — Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind. El
  navegador consume únicamente rutas BFF `/api/*`; el JWT permanece en cookie HttpOnly y el
  backend NestJS hermano es la autoridad de autorización.
- `apps/mobile` — Expo (React Native), iOS & Android. Token bearer en Expo SecureStore.
- `packages/*` — `types, schemas, api-client, domain, auth, hooks, notifications,
  design-tokens, observability, tsconfig`. Fuente única de verdad de la lógica;
  **no** importan desde `apps/*`.

## Validación

- Núcleo (verificado): `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile`
  y `yarn workspace @gymsheet/web build`.
- Móvil requiere toolchain nativo; `yarn workspace @gymsheet/mobile type-check` valida tipos.
- Usa Yarn 1. TypeScript estricto en todo el monorepo.

## Reglas

- No mezclar mocks con runtime.
- No almacenar tokens en Web Storage (web) ni en AsyncStorage sin cifrar (móvil): usar cookie
  HttpOnly (web) / SecureStore (móvil).
- No afirmar E2E sin backend y PostgreSQL activos.
- La lógica compartida (contratos, schemas, cliente API, dominio, auth) vive en `packages/*`;
  la web la consume mediante barriles de re-export en `@/shared/*` para evitar regresiones.

## Skills y plugins de Claude Code (OBLIGATORIO)

Este repo trae su tooling de Claude incluido y su uso **no es opcional**:

- `.claude/skills/` contiene 20 skills de diseño/UI/motion versionadas en el repo. Claude
  Code las carga automáticamente al abrir el proyecto — no hay que instalar nada.
- `.claude/settings.json` declara los plugins obligatorios: `fullstack-dev-skills`
  (expertos backend/frontend/BD/mobile: react, react-native, flutter, swift, nestjs,
  postgres-pro, sql-pro, database-optimizer, etc.), `frontend-design`, `feature-dev`,
  `code-review` y `context7`. Al abrir el repo por primera vez Claude Code pedirá
  confiar en la carpeta e instalar estos plugins: **aceptar es requisito para
  trabajar aquí**.
- Si el prompt se rechazó o falta algo, instalar manualmente:
  `/plugin marketplace add jeffallan/claude-skills` y luego
  `/plugin install fullstack-dev-skills@fullstack-dev-skills` (y los `@claude-plugins-official`).

**Instrucción para Claude (obligatoria):** al iniciar cualquier tarea de código en este
repo, verifica que las skills del repo (p. ej. `apple-premium-ui`, `ui-ux-pro-max`) y los
plugins de `.claude/settings.json` estén disponibles. Si faltan, detente y pide al usuario
instalarlos antes de continuar; no escribas UI sin las skills de diseño cargadas.

## Diseño (OBLIGATORIO): estilo Apple, ultralimpio y premium

Toda UI nueva o modificada (web y mobile) DEBE pasar por las skills de diseño del repo.
Dirección estética innegociable: **Apple-like, ultralimpia y premium** — contención,
jerarquía tipográfica clara, espaciado generoso, translucidez/glass sutil, nada de ruido
visual — sin copiar assets ni trade dress de Apple.

Mapa de skills por tarea (usar la que corresponda, no improvisar):

| Tarea | Skill obligatoria |
|---|---|
| Cualquier superficie de producto, jerarquía, tipografía, spacing | `apple-premium-ui` (siempre, primero) |
| Componentes, layout, dark mode, accesibilidad (shadcn/Tailwind) | `ui-styling`, `ui-ux-pro-max` |
| Tokens y sistema de diseño (`packages/design-tokens`) | `design-system`, `design` |
| Principios de motion, timing, easing, micro-interacciones | `motion-design` |
| Animación en React/Next (Framer Motion) | `motion-framer` |
| Animación GSAP / scroll / timelines | `gsap-core`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-plugins`, `gsap-utils`, `gsap-performance` |
| Transiciones de ruta/estado nativas en React | `react-view-transitions` |
| Rendimiento React/Next | `react-best-practices` |
| Tendencias/glassmorphism/scrollytelling | `modern-web-design` |
| Identidad y voz de marca | `brand` |
| Auditoría final de UI/UX/accesibilidad | `web-design-guidelines` |

Regla de cierre: ningún PR de UI se considera terminado sin una pasada de
`web-design-guidelines` y sin respetar `prefers-reduced-motion` en todo motion.
