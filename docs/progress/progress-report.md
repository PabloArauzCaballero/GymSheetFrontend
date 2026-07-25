# Implementation progress

## Completed

- Contract-driven Next.js App Router project.
- BFF authentication with HttpOnly cookie and protected server layouts.
- Member flows: profile, exercises, favorites, personal exercise creation/editing/inactivation and media references, workout lifecycle, history, exports, membership, access and notifications.
- Role-aware operational admin: equipment, global exercises, facilities, maintenance, memberships, staff, access devices, event inspection and credentials.
- Stitch-derived visual system and responsive shared components.
- Runtime response validation, normalized errors and explicit loading/empty/error states.
- Unit/component/browser test scaffolding and CI workflow.
- Architecture, security, contract, UI and verification documentation.

## Intentional constraints

- Mock access-event generation is excluded from production UI.
- No unsupported payments, social network, trainer assignment or analytics were invented.
- Some backend controllers are absent from OpenAPI; their current controller/schema/mapper contracts are documented.
- No font binary is bundled.

## Remaining release work

1. Install dependencies and generate `yarn.lock` in a networked environment.
2. Run all verification gates and fix any dependency-version-specific findings.
3. Point `.env.local` to an integration backend and execute Playwright against seeded test accounts.
4. Add deployment-specific CSP and observability endpoints after their domains are approved.
5. Extend backend OpenAPI to cover facilities, membership, access and notifications, then generate types and add drift detection.
