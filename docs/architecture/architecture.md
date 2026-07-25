# Frontend architecture

## Overview

GymSheet Frontend is a Next.js App Router application organized by feature. Pages and layouts compose views; feature services own domain-specific network calls; a single shared API client validates successful and error responses. The browser communicates only with same-origin Next.js route handlers, which forward approved requests to the NestJS backend.

```txt
Browser
  -> Next.js page / client island
  -> feature service
  -> shared API client
  -> /api/backend/* BFF route
  -> GymSheetBackend /api/v1/*
```

Authentication uses dedicated `/api/auth/*` handlers. The backend token is kept in an HttpOnly cookie and is never returned to browser JavaScript after login.

## Folder responsibilities

```txt
src/app/                 routes, layouts, route handlers, boundaries
src/features/            domain-specific UI and services
src/shared/api/          validated contracts, API client, normalized errors
src/shared/components/   stable cross-feature primitives
src/shared/server/       server-only backend, cookie, session and CSRF helpers
src/test/                 shared test setup
```

## Rendering strategy

- Server Components are the default for routes and role/session gates.
- Client Components are limited to forms, mutations, live workout interaction, filters and query-driven operational views.
- The root layout stays server-side; only the provider island is client-side.
- URL-driven route selection is handled by App Router; server state is handled by TanStack Query within interactive islands.

## Data contracts

Backend JSON begins as `unknown`. The shared API client validates the success envelope and then validates `data` with a feature-specific Zod schema. Contract mismatches become a controlled `contract` error instead of leaking malformed data into UI components.

The external HTTP field names remain Spanish where the backend exposes them, including `nombreCompleto`, `grupoMuscular`, `pesoKg`, `numeroSerie`, `diasRestantes` and `programadoPara`.

## State model

- Session: server-revalidated backend principal.
- Server data: TanStack Query.
- Forms: React Hook Form.
- Shareable list state: query parameters where implemented.
- Local interaction: component `useState` only.
- No general global store was introduced because no verified cross-route client state requires one.

## Error model

Errors are normalized to validation, unauthorized, forbidden, not-found, conflict, rate-limit, network, contract or unexpected kinds. The backend's `requestId` is preserved where available. UI surfaces explicit errors and retry actions instead of silently falling back to mock data.

## Performance boundaries

- Server session calls run in parallel.
- Exercise search is debounced.
- Lists use backend pagination rather than loading unbounded histories.
- Exports stream through the BFF and become browser downloads.
- No large charting, animation or global-state library is included.
- Client components are isolated to interactive regions.
