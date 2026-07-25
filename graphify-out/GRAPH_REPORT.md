# Graph Report - GymSheetFrontend  (2026-07-21)

## Corpus Check
- 184 files · ~79,203 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 998 nodes · 2112 edges · 102 communities (73 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- button.tsx
- dependencies
- api-client.ts
- [...path]/route.ts
- Lineamientos de programación profesional para código en producción
- devDependencies
- compilerOptions
- exercise-service.ts
- Instrucciones generales de generación del proyecto
- 07 — Prevención obligatoria de overfetch y uso de endpoints de picking
- workout-service.ts
- requireRole
- 14 — Animaciones, transiciones, navegación, notificaciones y clics
- contracts/core.ts
- enums.ts
- session.ts
- index.ts
- membership-admin-service.ts
- programacionFrontendWeb.md
- 13 — Diseño UI/UX profesional y minimalista
- facilities-admin-service.ts
- notification-preference-form.tsx
- 03 — Migración desde React, Vite, CRA u otro frontend hacia Next.js
- 16 — Accesibilidad WCAG 2.2 AA
- access-admin-service.ts
- portal-shell.tsx
- 09 — Auth, sesión, rutas protegidas y permisos
- Frontend architecture
- 20 — PII, privacidad y seguridad frontend
- 33 — Definición objetiva de calidad 10/10
- GymSheet Frontend — Specification
- STITCH_DESIGN.md
- 2. Responsabilidades
- 06 — Capa de red y contratos de API
- 08 — TanStack Query y estado de servidor
- 11 — Formularios
- 23 — Rendimiento, Core Web Vitals y bundle
- 25 — Pruebas
- GymSheet Frontend
- formatDate
- Backend contract gaps affecting the frontend
- 05 — Server Components, Client Components y composición
- 12 — Tablas, filtros, búsqueda y visualización de datos
- source-check.mjs
- Security model
- GymSheet visual system
- 00 — Objetivo, alcance y principios no negociables
- 02 — Perfil tecnológico Next.js
- 15 — Design system, shadcn/ui y consistencia
- 17 — Responsive, móvil y dispositivos
- 19 — Internacionalización y localización
- 22 — Observabilidad frontend
- admin-overview.tsx
- ADR-0001: Same-origin BFF and HttpOnly session cookie
- Implementation progress
- Verification report
- .prettierrc.json
- 01 — Precedencia de fuentes y lectura obligatoria
- 10 — Server Actions, Route Handlers y BFF
- 18 — Estados de pantalla y resiliencia visual
- 21 — Notificaciones operativas y tiempo real
- (portal)/access/page.tsx
- admin/access/page.tsx
- exercises/new/page.tsx
- (portal)/exercises/page.tsx
- notifications/page.tsx
- profile/page.tsx
- workouts/[id]/page.tsx
- workouts/new/page.tsx
- numbers.ts
- next.config.ts
- dashboard/page.tsx
- workouts/page.tsx
- rest-timer.tsx
- library-selection.md
- screen-endpoint-matrix.md
- docs/README.md
- testing/README.md
- ui/README.md
- ui-ux-source-traceability.md
- prompt/README.md
- access/README.md
- admin/README.md
- auth/README.md
- exercises/README.md
- membership/README.md
- notifications/README.md
- profile/README.md
- features/README.md
- workouts/README.md
- shared/README.md

## God Nodes (most connected - your core abstractions)
1. `Button` - 39 edges
2. `queryKeys` - 32 edges
3. `cn()` - 30 edges
4. `Field()` - 27 edges
5. `Input` - 26 edges
6. `Lineamientos de programación profesional para código en producción` - 26 edges
7. `Badge()` - 22 edges
8. `ErrorPanel()` - 21 edges
9. `formatDateTime()` - 21 edges
10. `EmptyState()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `AccessAdminPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/(portal)/admin/access/page.tsx → src/shared/server/session.ts
- `AdminPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/(portal)/admin/page.tsx → src/shared/server/session.ts
- `EquipmentAdminPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/(portal)/admin/equipment/page.tsx → src/shared/server/session.ts
- `ExerciseAdminPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/(portal)/admin/exercises/page.tsx → src/shared/server/session.ts
- `FacilitiesAdminPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/(portal)/admin/facilities/page.tsx → src/shared/server/session.ts

## Import Cycles
- None detected.

## Communities (102 total, 29 thin omitted)

### Community 0 - "button.tsx"
Cohesion: 0.10
Nodes (67): AccessDevicePanel(), statuses, AccessEventLookup(), AccessHistoryPanel(), CredentialPanel(), FormValues, schema, createSchema (+59 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (47): clsx, @hookform/resolvers, lucide-react, next, dependencies, clsx, @hookform/resolvers, lucide-react (+39 more)

### Community 2 - "api-client.ts"
Cohesion: 0.07
Nodes (28): metadata, metadata, metadata, Providers(), AuthFrame(), FormValues, LoginForm(), schema (+20 more)

### Community 3 - "[...path]/route.ts"
Cohesion: 0.10
Nodes (29): authEnvelopeSchema, loginSchema, POST(), clearSession(), GET(), POST(), authEnvelopeSchema, POST() (+21 more)

### Community 4 - "Lineamientos de programación profesional para código en producción"
Cohesion: 0.06
Nodes (35): 0. Modo obligatorio: temperatura 0, precisión y cero adivinanzas, 10. Tipado y contratos de datos, 11. Organización de carpetas, 12. Performance y escalabilidad, 13. Integraciones externas, 14. Logs y observabilidad, 15. Código listo para producción, 16. Formato de respuesta esperado (+27 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (33): @axe-core/playwright, eslint, eslint-config-next, jsdom, devDependencies, @axe-core/playwright, eslint, eslint-config-next (+25 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, es2022, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "exercise-service.ts"
Cohesion: 0.12
Nodes (17): exerciseAdminService, ExerciseFilters, ExerciseInput, Exercise, equipmentStatuses, equipmentTypes, trainingGoals, userRoles (+9 more)

### Community 8 - "Instrucciones generales de generación del proyecto"
Cohesion: 0.10
Nodes (20): 0. Modo de trabajo obligatorio: precisión, temperatura 0 y cero adivinanzas, 10. Workers como procesos persistentes de producción, 1. Lectura obligatoria de prompts base, 2. Lectura y análisis de diagramas del sistema, 3. Criterios de interpretación de los diagramas, 4. Manejo de diagramas faltantes o incompletos, 5. Relación entre diagramas y arquitectura generada, 6. Generación de entregables (+12 more)

### Community 9 - "07 — Prevención obligatoria de overfetch y uso de endpoints de picking"
Cohesion: 0.10
Nodes (20): 07 — Prevención obligatoria de overfetch y uso de endpoints de picking, 10. Query deduplication, 11. Prefetch, 12. Métricas, 13. Gate anti-overfetch, 14. Tests, 1. Regla principal, 2. No inventar nombres (+12 more)

### Community 10 - "workout-service.ts"
Cohesion: 0.16
Nodes (15): FormValues, schema, SetEntryForm(), WorkoutExercisePanel(), WorkoutSetRow(), deleteSchema, objectSchema, workoutService (+7 more)

### Community 11 - "requireRole"
Cohesion: 0.13
Nodes (14): EquipmentAdminPage(), metadata, ExerciseAdminPage(), metadata, FacilitiesAdminPage(), metadata, AdminLayout(), MembershipAdminPage() (+6 more)

### Community 12 - "14 — Animaciones, transiciones, navegación, notificaciones y clics"
Cohesion: 0.11
Nodes (18): 10. Notificaciones, 11. Campana y centro de notificaciones, 12. Dialogs y drawers, 13. Listas, 14 — Animaciones, transiciones, navegación, notificaciones y clics, 14. Reduced motion, 15. Rendimiento, 16. Tokens (+10 more)

### Community 13 - "contracts/core.ts"
Cohesion: 0.14
Nodes (15): EquipmentAdminInput, equipmentAdminService, ProfileInput, profileService, Equipment, ExerciseMedia, FavoriteExercise, Profile (+7 more)

### Community 14 - "enums.ts"
Cohesion: 0.16
Nodes (16): AccessOutcome, accessOutcomes, CredentialStatus, credentialStatuses, CredentialType, credentialTypes, maintenanceStatuses, maintenanceTypes (+8 more)

### Community 15 - "session.ts"
Cohesion: 0.19
Nodes (12): GET(), EditExercisePage(), metadata, ExercisePage(), metadata, PortalLayout(), ExerciseDetail(), PortalShell() (+4 more)

### Community 16 - "index.ts"
Cohesion: 0.26
Nodes (10): AccessPointPanel(), BranchPanel(), EquipmentAssignmentPanel(), PlanPanel(), RoomPanel(), StaffPanel(), UserRole, TabsContent() (+2 more)

### Community 17 - "membership-admin-service.ts"
Cohesion: 0.15
Nodes (12): CustomerInput, PlanInput, membershipService, MembershipStatus, PlanType, Customer, Membership, MembershipPlan (+4 more)

### Community 18 - "programacionFrontendWeb.md"
Cohesion: 0.15
Nodes (12): 24 — Errores y boundaries, 26 — Calidad, lint y límites automáticos, 27 — CI/CD, 28 — Deploy y ambientes, 29 — Documentación obligatoria, 30 — Implementación por fases, 31 — Progress report, 32 — Formato de entrega (+4 more)

### Community 19 - "13 — Diseño UI/UX profesional y minimalista"
Cohesion: 0.15
Nodes (13): 10. Errores, 11. Empty states, 12. Responsive, 13 — Diseño UI/UX profesional y minimalista, 1. Principios, 2. Jerarquía visual, 3. Densidad, 4. Tipografía (+5 more)

### Community 20 - "facilities-admin-service.ts"
Cohesion: 0.23
Nodes (11): accessPointSchema, BranchInput, MaintenanceInput, RoomInput, MaintenanceStatus, MaintenanceType, RoomType, AccessPoint (+3 more)

### Community 21 - "notification-preference-form.tsx"
Cohesion: 0.19
Nodes (11): FormValues, NotificationPreferenceForm(), schema, toLocalDateTime(), NotificationPreferenceInput, notificationService, Notification, NotificationPreference (+3 more)

### Community 22 - "03 — Migración desde React, Vite, CRA u otro frontend hacia Next.js"
Cohesion: 0.17
Nodes (12): 03 — Migración desde React, Vite, CRA u otro frontend hacia Next.js, 10. Hidratación, 11. Gate de migración, 1. Regla principal, 2. Inventario obligatorio, 3. Mapeo de rutas, 4. Conversión a App Router, 5. React Router (+4 more)

### Community 23 - "16 — Accesibilidad WCAG 2.2 AA"
Cohesion: 0.17
Nodes (12): 10. Pruebas, 11. Gate, 16 — Accesibilidad WCAG 2.2 AA, 1. Meta, 2. Semántica, 3. Teclado, 4. Contraste, 5. Formularios (+4 more)

### Community 24 - "access-admin-service.ts"
Cohesion: 0.23
Nodes (10): accessService, AccessDevice, accessDeviceSchema, Page, AccessCredential, AccessDecision, AccessEvent, accessDecisionSchema (+2 more)

### Community 25 - "portal-shell.tsx"
Cohesion: 0.27
Nodes (8): SessionPrincipal, Brand(), LogoutButton(), adminNavigation, canSee(), NavigationItem, primaryNavigation, NavigationLinks()

### Community 26 - "09 — Auth, sesión, rutas protegidas y permisos"
Cohesion: 0.20
Nodes (10): 09 — Auth, sesión, rutas protegidas y permisos, 1. Default deny, 2. Estrategia browser, 3. 401 y 403, 4. Single-flight refresh, 5. Capas de autorización, 6. Queries, 7. Roles y permisos (+2 more)

### Community 27 - "Frontend architecture"
Cohesion: 0.22
Nodes (8): Data contracts, Error model, Folder responsibilities, Frontend architecture, Overview, Performance boundaries, Rendering strategy, State model

### Community 28 - "20 — PII, privacidad y seguridad frontend"
Cohesion: 0.22
Nodes (9): 1. Clasificación, 20 — PII, privacidad y seguridad frontend, 2. Minimización, 3. Masking, 4. Reveal, 5. Storage, 6. XSS, 7. Descargas (+1 more)

### Community 29 - "33 — Definición objetiva de calidad 10/10"
Cohesion: 0.22
Nodes (9): 33 — Definición objetiva de calidad 10/10, Accesibilidad, Arquitectura, Calidad, Datos, Operación, Rendimiento, Seguridad (+1 more)

### Community 30 - "GymSheet Frontend — Specification"
Cohesion: 0.22
Nodes (8): GymSheet Frontend — Specification, Non-goals, Primary journeys, Product goal, Security decisions, Supported actors, UX direction, Verified sources

### Community 31 - "STITCH_DESIGN.md"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 32 - "2. Responsabilidades"
Cohesion: 0.25
Nodes (8): 04 — Arquitectura de carpetas, 1. Estructura generalista recomendada, 2. Responsabilidades, 3. Prohibiciones, `app/`, `features/`, `generated/`, `shared/`

### Community 33 - "06 — Capa de red y contratos de API"
Cohesion: 0.25
Nodes (8): 06 — Capa de red y contratos de API, 1. Único punto de red, 2. Prohibido, 3. Validación, 4. OpenAPI, 5. Errores, 6. AbortSignal, 7. Timeout

### Community 34 - "08 — TanStack Query y estado de servidor"
Cohesion: 0.25
Nodes (8): 08 — TanStack Query y estado de servidor, 1. Uso, 2. Query keys, 3. `enabled`, 4. Retries, 5. Cache, 6. Polling, 7. Placeholder data

### Community 35 - "11 — Formularios"
Cohesion: 0.25
Nodes (8): 11 — Formularios, 1. Stack, 2. Estados, 3. Validación, 4. UX, 5. Doble envío, 6. Cambios sin guardar, 7. Acciones sensibles

### Community 36 - "23 — Rendimiento, Core Web Vitals y bundle"
Cohesion: 0.25
Nodes (8): 1. Metas base, 23 — Rendimiento, Core Web Vitals y bundle, 2. Medición, 3. JavaScript, 4. Gráficas, 5. Imágenes y fuentes, 6. Budgets, 7. Gate de overfetch

### Community 37 - "25 — Pruebas"
Cohesion: 0.25
Nodes (8): 1. Unit, 25 — Pruebas, 2. Component, 3. Integration, 4. E2E, 5. Contract, 6. Visual regression, 7. Coverage

### Community 38 - "GymSheet Frontend"
Cohesion: 0.25
Nodes (7): Authentication architecture, Documentation, GymSheet Frontend, Main routes, Quick start, Stack, Verification commands

### Community 39 - "formatDate"
Cohesion: 0.25
Nodes (6): metadata, CustomerPanel(), MaintenancePanel(), MembershipPanel(), MembershipPageClient(), formatDate()

### Community 40 - "Backend contract gaps affecting the frontend"
Cohesion: 0.29
Nodes (6): Backend contract gaps affecting the frontend, Missing list/detail capabilities, Mock access route, OpenAPI coverage drift, Role drift, Weakly typed generic responses

### Community 41 - "05 — Server Components, Client Components y composición"
Cohesion: 0.29
Nodes (7): 05 — Server Components, Client Components y composición, 1. Server Components por defecto, 2. Client Components solo cuando sean necesarios, 3. Límites pequeños, 4. Datos serializables, 5. Caching, 6. `force-dynamic`

### Community 42 - "12 — Tablas, filtros, búsqueda y visualización de datos"
Cohesion: 0.29
Nodes (7): 12 — Tablas, filtros, búsqueda y visualización de datos, 1. Server-side, 2. URL state, 3. Tabla, 4. Mobile, 5. Bulk, 6. Exportación

### Community 43 - "source-check.mjs"
Cohesion: 0.29
Nodes (5): allowedFetchFiles, findings, root, sourceExtensions, sourceRoot

### Community 44 - "Security model"
Cohesion: 0.33
Nodes (5): Authorization matrix, Controls, Known limits, Security model, Trust boundaries

### Community 45 - "GymSheet visual system"
Cohesion: 0.33
Nodes (5): GymSheet visual system, Interaction, Source direction, Tokens, Typography

### Community 46 - "00 — Objetivo, alcance y principios no negociables"
Cohesion: 0.33
Nodes (6): 00 — Objetivo, alcance y principios no negociables, 1. Objetivo, 2. Prioridades, 3. KISS sin fragilidad, 4. Regla de archivos, 5. Evidencia

### Community 47 - "02 — Perfil tecnológico Next.js"
Cohesion: 0.33
Nodes (6): 02 — Perfil tecnológico Next.js, 1. Versión, 2. Stack base, 3. Gestor de paquetes, 4. Librerías, 5. Animaciones

### Community 48 - "15 — Design system, shadcn/ui y consistencia"
Cohesion: 0.33
Nodes (6): 15 — Design system, shadcn/ui y consistencia, 1. Primitivas base, 2. No duplicar, 3. Tokens, 4. Variantes, 5. Storybook

### Community 49 - "17 — Responsive, móvil y dispositivos"
Cohesion: 0.33
Nodes (6): 17 — Responsive, móvil y dispositivos, 1. Mobile-first cuando aplique, 2. Navegación móvil, 3. Breakpoints de prueba, 4. Touch, 5. Teclado móvil

### Community 50 - "19 — Internacionalización y localización"
Cohesion: 0.33
Nodes (6): 19 — Internacionalización y localización, 1. Locale, 2. Formatos, 3. Textos, 4. Error codes, 5. Preparación

### Community 51 - "22 — Observabilidad frontend"
Cohesion: 0.33
Nodes (6): 1. Adaptador único, 22 — Observabilidad frontend, 2. Capturar, 3. Contexto, 4. Redacción, 5. Correlación

### Community 52 - "admin-overview.tsx"
Cohesion: 0.40
Nodes (4): AdminPage(), metadata, AdminOverview(), modules

### Community 53 - "ADR-0001: Same-origin BFF and HttpOnly session cookie"
Cohesion: 0.40
Nodes (4): ADR-0001: Same-origin BFF and HttpOnly session cookie, Consequences, Context, Decision

### Community 54 - "Implementation progress"
Cohesion: 0.40
Nodes (4): Completed, Implementation progress, Intentional constraints, Remaining release work

### Community 55 - "Verification report"
Cohesion: 0.40
Nodes (4): Executed in this delivery environment, Not executed, Required final deployment gate, Verification report

### Community 56 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 57 - "01 — Precedencia de fuentes y lectura obligatoria"
Cohesion: 0.40
Nodes (5): 01 — Precedencia de fuentes y lectura obligatoria, 1. Orden de lectura, 2. Documento de buenas prácticas UI/UX, 3. Si el documento UI/UX no está disponible, 4. Contradicciones

### Community 58 - "10 — Server Actions, Route Handlers y BFF"
Cohesion: 0.40
Nodes (5): 10 — Server Actions, Route Handlers y BFF, 1. No usar por moda, 2. Route Handlers, 3. BFF, 4. Seguridad

### Community 59 - "18 — Estados de pantalla y resiliencia visual"
Cohesion: 0.40
Nodes (5): 18 — Estados de pantalla y resiliencia visual, 1. Loading, 2. Error, 3. Partial success, 4. Optimistic UI

### Community 60 - "21 — Notificaciones operativas y tiempo real"
Cohesion: 0.40
Nodes (5): 1. Elegir mecanismo, 21 — Notificaciones operativas y tiempo real, 2. Polling, 3. WebSocket/SSE, 4. UI

### Community 62 - "admin/access/page.tsx"
Cohesion: 0.50
Nodes (3): AccessAdminPage(), metadata, AccessAdmin()

## Knowledge Gaps
- **487 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `securityHeaders` (+482 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `backendRequest()` connect `[...path]/route.ts` to `session.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Button` connect `button.tsx` to `rest-timer.tsx`, `api-client.ts`, `workout-service.ts`, `notification-preference-form.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `07 — Prevención obligatoria de overfetch y uso de endpoints de picking` connect `07 — Prevención obligatoria de overfetch y uso de endpoints de picking` to `programacionFrontendWeb.md`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _487 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `button.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09636295463067117 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `api-client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07053140096618357 - nodes in this community are weakly interconnected._