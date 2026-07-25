---
type: "query"
date: "2026-07-22T16:09:01.805923+00:00"
question: "Verify external exercise provenance, daily cache refresh, onboarding, membership entitlements, and beta integration"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Authentication", "Exercises", "Profile", "Access", "api-client.ts", "membership-service.ts"]
---

# Q: Verify external exercise provenance, daily cache refresh, onboarding, membership entitlements, and beta integration

## Answer

Root cause was frontend BACKEND_API_URL targeting port 3000 instead of the healthy Docker API on 3001. The external hasaneyldrm exercises dataset is synchronized by SHA-256 with 1324 unique external IDs and a daily worker; repeated sync skips all 1324. Onboarding, body history, membership plans, entitlements, intents, store media, idempotent development seeds, and frontend flows were integrated and verified.

## Outcome

- Signal: useful

## Source Nodes

- Authentication
- Exercises
- Profile
- Access
- api-client.ts
- membership-service.ts