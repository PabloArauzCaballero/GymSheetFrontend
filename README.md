# GymSheet

Monorepo de GymSheet: aplicación web (Next.js) y móvil (Expo / React Native) que comparten
la lógica de negocio mediante paquetes internos. El backend NestJS hermano es la autoridad
de autorización.

## Estructura

```text
apps/
  web/      Next.js 16 (App Router, React 19, Tailwind) — BFF + cookie HttpOnly
  mobile/   Expo (React Native) — iOS & Android, bearer token en SecureStore
packages/
  types/ schemas/ api-client/ domain/ auth/ design-tokens/ observability/ tsconfig/
```

Ver [`docs/mobile/arquitectura.md`](docs/mobile/arquitectura.md) y el resto de docs en
[`docs/mobile/`](docs/mobile/).

## Requisitos

- Node 20+ (`>=20 <24`), Yarn 1.
- Móvil: Xcode (iOS) y Android Studio + SDK (Android); `eas-cli` para builds en la nube.

## Instalación

```bash
yarn install
```

## Comandos (raíz, vía Turborepo)

```bash
yarn dev            # dev de todos los workspaces
yarn build          # build (turbo)
yarn type-check     # tsc en todo el monorepo
yarn lint           # eslint
yarn test           # tests
yarn verify         # source-check + type-check + lint + test + build

yarn web <script>       # = yarn workspace @gymsheet/web <script>
yarn mobile <script>    # = yarn workspace @gymsheet/mobile <script>
```

Solo web (verificado: compila sin regresiones):

```bash
yarn workspace @gymsheet/web build
```

Móvil (requiere toolchain nativo):

```bash
cp apps/mobile/.env.example apps/mobile/.env
yarn workspace @gymsheet/mobile start
```

## Reglas

- El navegador consume solo rutas BFF `/api/*`; el JWT permanece en cookie HttpOnly.
- Tokens móviles solo en Expo SecureStore. Nunca Web Storage/AsyncStorage sin cifrar.
- `packages/*` no importan desde `apps/*`. Fuente única de verdad para la lógica.
