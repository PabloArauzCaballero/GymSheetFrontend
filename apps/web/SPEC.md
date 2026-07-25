# GymSheet Frontend — Specification

## Product goal

Provide a production-oriented web client for the existing `GymSheetBackend`, covering workout tracking for members and operational administration for authorized staff. The product must preserve the backend's Spanish HTTP boundary, roles, validation rules, ownership rules, and state transitions.

## Verified sources

- Backend repository: `PabloArauzCaballero/GymSheetBackend`, branch `main`.
- Backend controllers, Zod schemas, mappers, OpenAPI and domain enums.
- User-provided Stitch screens and `DESIGN.md`.
- Project programming rules under `prompt/`.
- The uploaded SHA-256 file references `clean-code-refactoring-skill.zip`; that archive was not supplied, so no content was inferred from the checksum.

## Supported actors

| Role | Frontend capabilities |
|---|---|
| `CLIENTE` | Profile, exercise discovery, favorites, personal exercises, live workouts, workout history, exports, own membership, own access records and credentials, notifications. |
| `ENTRENADOR_EXTERNO` | Authenticated portal capabilities permitted by the backend. No administrative UI is shown. |
| `COACH` | Authenticated portal capabilities permitted by the backend. No administrative UI is shown unless the backend role contract changes. |
| `FRONT_DESK` | Operational administration for facilities, memberships, access and credentials; read-only where controller-level roles restrict mutations to `ADMIN`. |
| `ADMIN` | Full administrative routes exposed by the current controllers. |

## Primary journeys

1. Register or sign in.
2. Complete the anthropometric profile.
3. Browse/filter exercises and manage favorites or personal exercises.
4. Start a workout, add exercises, record sets, adjust emphasis/notes, finish or cancel.
5. Review and export workout history.
6. Review membership, access history, credentials and notifications.
7. Authorized staff manage equipment, facilities, maintenance, plans, customers, memberships, staff, access devices and credentials.

## Security decisions

- The backend bearer token is stored in an `HttpOnly`, `SameSite=Lax` cookie.
- Browser code calls only same-origin Next.js route handlers.
- The BFF proxy uses a root-path allowlist and rejects untrusted mutation origins.
- Server layouts revalidate the session with the backend before rendering protected routes.
- Role checks are enforced both in navigation and server layouts; the backend remains the final authority.
- No token is stored in local storage, session storage, URL parameters or client-visible state.

## UX direction

- Mobile-first, dark, minimal and technical.
- Volt accent `#c3f400`, black surfaces and subtle structural borders.
- Large, tightly tracked headings; tabular numeric values; restrained radii; no decorative shadows.
- Loading, empty, error and permission states are explicit.
- Reduced-motion preferences are respected.

## Non-goals

- No invented social, coaching, payment or analytics capability.
- No production UI for the mock access-event controller.
- No direct browser connection to the NestJS origin.
- No claim that package installation, build, lint, unit or end-to-end tests passed in this environment without dependencies.
