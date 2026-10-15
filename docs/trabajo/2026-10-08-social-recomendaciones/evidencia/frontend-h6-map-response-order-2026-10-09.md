# H6.S3.M6 — late map response — 2026-10-09

From `GymSheetFrontend`:

```text
$ node apps/web/node_modules/vitest/vitest.mjs run --config apps/mobile/src/features/social-map/vitest.config.mts
Test Files  1 passed (1)
     Tests  3 passed (3)

$ yarn workspace @gymsheet/mobile type-check
Done in 8.53s

From apps/mobile:
$ yarn eslint 'app/(app)/social-map.tsx' src/features/social-map/social-map-screen.test.tsx src/features/social-map/vitest.config.mts
Done in 2.97s
```

Tests render the map screen with React Query and verify a slower request for area A does not leave A's selected gym/profile visible after changing to area B. The shared query keys already separate areas; the fix clears the pending cell and selected registered/external gyms on area change.

The full H6.S3.M6 exit criteria still needs the H1 PAIR runner, manifest, and device acceptance, so the plan row remains open.
