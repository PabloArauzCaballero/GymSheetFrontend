# Security model

## Trust boundaries

1. Browser input is untrusted.
2. Next.js route handlers are the browser-facing application boundary.
3. GymSheetBackend is the authorization and domain-integrity authority.
4. External exercise media is untrusted remote content even when its URL was accepted by the backend.

## Controls

- JWT in HttpOnly cookie; no local/session storage.
- Server-only backend URL and bearer forwarding.
- Same-origin API routes with an exact backend-path allowlist; mock gateway and unknown future admin routes are denied by default.
- Mutation origin validation.
- Session revalidation before protected rendering.
- Role-aware server layouts and navigation.
- Zod validation for request forms and backend responses.
- No raw stack traces or backend infrastructure errors rendered.
- Security headers: frame denial, MIME sniffing prevention, restrictive referrer and permissions policy.
- Dynamic external exercise media uses native `img` only after backend URL validation; no credential-bearing fetch is performed to those origins.

## Authorization matrix

- `ADMIN`: full verified administrative mutations.
- `FRONT_DESK`: administrative pages allowed by class-level controller roles; controls requiring method-level `ADMIN` are hidden or disabled.
- Other roles: authenticated self-service portal only.
- Ownership and object visibility are never inferred solely in the frontend; backend responses are authoritative.

## Known limits

- The backend exposes access tokens only and no refresh-token contract. Expired sessions return to login.
- A Content-Security-Policy with a nonce should be added after deployment domains and monitoring endpoints are known; inventing those allowlists would be unsafe.
- External media hosts are dynamic, so `next/image` remote allowlists cannot be safely hardcoded from current requirements.
