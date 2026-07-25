# GymSheet Frontend

Next.js App Router frontend for `PabloArauzCaballero/GymSheetBackend`. It implements member workout flows and role-aware gym operations using the visual direction supplied in the Stitch reference screens.

## Stack

- Next.js App Router + React + strict TypeScript
- Tailwind CSS
- React Hook Form + Zod
- TanStack Query
- Radix UI primitives
- Vitest, Testing Library and Playwright
- Yarn 1.22.22; Node.js `>=20 <24`

## Quick start

```bash
cp .env.example .env.local
corepack enable
yarn install
yarn dev --port 3001
```

`BACKEND_API_URL` is server-only and should point to the backend API prefix, for example `http://localhost:3000/api/v1`. The frontend defaults to port `3001` when started with an explicit `PORT=3001`.

Dependencies are reproducible through the committed `yarn.lock`; use `yarn install --frozen-lockfile` in CI.

## Main routes

```txt
/login                         public
/register                      public
/dashboard                     authenticated
/exercises                     authenticated
/exercises/new                 authenticated
/exercises/:id                 authenticated / visible object
/exercises/:id/edit            owner of personal exercise
/workouts                      authenticated
/workouts/new                  authenticated
/workouts/:id                  owner
/profile                       authenticated
/membership                    authenticated
/access                        authenticated
/notifications                 authenticated
/admin                         ADMIN or FRONT_DESK
/admin/equipment               ADMIN or FRONT_DESK; mutations ADMIN
/admin/exercises               ADMIN
/admin/facilities              ADMIN or FRONT_DESK
/admin/membership              ADMIN or FRONT_DESK
/admin/access                  ADMIN or FRONT_DESK
```

## Authentication architecture

Login and registration are handled by same-origin route handlers. The JWT is written to an `HttpOnly` cookie and is forwarded server-side to NestJS. Client JavaScript never reads the token. Protected layouts call `/auth/me` and `/users/me` on the backend before rendering.

## Verification commands

```bash
yarn source-check
yarn type-check
yarn lint
yarn test
yarn test:e2e
yarn build
```

The static source check can run without installed packages. All remaining commands require `yarn install` first.

## Documentation

- `SPEC.md`
- `docs/architecture/architecture.md`
- `docs/security/security-model.md`
- `docs/endpoints/screen-endpoint-matrix.md`
- `docs/contracts/backend-contract-gaps.md`
- `docs/ui/design-system.md`
- `docs/ui/ui-ux-source-traceability.md`
- `docs/testing/verification-report.md`
- `docs/beta-readiness.md`
- `docs/progress/progress-report.md`
