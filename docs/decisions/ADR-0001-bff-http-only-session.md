# ADR-0001: Same-origin BFF and HttpOnly session cookie

- Status: accepted
- Date: 2026-07-20

## Context

The backend returns a bearer token from login and expects `Authorization: Bearer`. Storing that token in local storage would expose it to browser JavaScript and increase the impact of XSS. The frontend also requires server-side route protection.

## Decision

Use Next.js route handlers as a narrow BFF. Authentication handlers store the backend access token in an HttpOnly, secure-in-production, SameSite=Lax cookie. A catch-all proxy forwards only allowlisted backend roots. Mutation requests must have a trusted same-origin `Origin`/`Host` relationship. Protected layouts revalidate the backend principal.

## Consequences

- Browser code never receives the bearer token.
- Client requests remain same-origin.
- Route handlers become security-sensitive and must retain allowlists and tests.
- SameSite=Lax and origin validation reduce CSRF risk; the backend remains responsible for authorization and ownership.
- Token refresh is not implemented because the verified backend exposes no refresh endpoint.
