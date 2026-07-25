# Features

Feature folders contain domain-specific components and services. A feature may import stable primitives from `src/shared`, but shared code must not import a feature. Browser network calls belong in each feature's `services/` folder and must delegate to the shared API client.
