# Backend contract gaps affecting the frontend

## OpenAPI coverage drift

The OpenAPI document covers auth, user/profile, equipment, exercises/media/favorites, workouts, exports, dataset import and gateway routes. The active application module also registers facilities, membership, access control, access credentials and notifications, whose controllers are not represented in the current primary OpenAPI document.

The frontend therefore derives those contracts from controller paths, Zod request schemas and response mappers. This is deliberate but should be temporary: the backend should extend OpenAPI so generated clients can detect drift in CI.

## Role drift

The domain enum contains `ADMIN`, `CLIENTE`, `ENTRENADOR_EXTERNO`, `COACH` and `FRONT_DESK`, while the current OpenAPI authentication schemas list only the first three. Runtime session schemas accept all five verified domain roles.

## Weakly typed generic responses

Several write endpoints are documented or implemented as generic objects, including workout child mutations, equipment assignments and staff writes. The frontend validates only the fields guaranteed by the current service response. The backend should publish specific response schemas.

## Missing list/detail capabilities

- There is no verified endpoint to list staff profiles; staff can be created and status-updated only by known user ID.
- Access event detail exists, but the UI emphasizes decision history because no paginated event-list endpoint is exposed.
- Equipment's public list returns available items; no dedicated full administrative equipment list endpoint is exposed. The admin screen cannot reliably display inactive/maintenance inventory unless the backend changes the list contract.
- No token refresh or logout endpoint exists in the backend; frontend logout clears its own cookie.

## Mock access route

`POST /admin/access/mock/events` is an ADMIN-only development/test adapter. It is intentionally absent from the production navigation and UI. Exposing it would require a verified environment gate and an explicit product requirement.
