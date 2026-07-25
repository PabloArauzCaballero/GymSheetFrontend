# Library selection

| Responsibility | Selected | Reason | Exit path |
|---|---|---|---|
| Web framework | Next.js App Router | Server layouts, route handlers, streaming boundaries and deployable standalone output. | React Router/Vite would require replacing BFF/session layout behavior. |
| Styling | Tailwind CSS | Matches the supplied utility-first Stitch references and keeps design tokens centralized in CSS. | Plain CSS modules can replace feature by feature. |
| Forms | React Hook Form | Controlled validation lifecycle without rerendering entire forms. | Native forms for simple cases. |
| Runtime validation | Zod | Mirrors the backend's validation-first contract and validates unknown responses. | Generated OpenAPI validators after the backend spec covers all controllers. |
| Server-state cache | TanStack Query | Query cancellation, retries, invalidation and mutation state for interactive client islands. | Server Components for noninteractive data. |
| Accessible primitives | Radix Dialog/Tabs | Keyboard/focus behavior for complex primitives. | Native dialog/details where sufficient. |
| Tables | Semantic HTML | Current tables need only responsive overflow and server pagination; no table engine is installed without verified sorting/grouping requirements. | TanStack Table can be introduced when those requirements exist. |
| Icons | Lucide | Small, consistent icon set. | Inline SVG components. |
| Toasts | Sonner | Lightweight mutation feedback. | Inline live regions. |
| Unit tests | Vitest + Testing Library | Fast pure and component contract tests without a second browser runner. | Jest equivalents. |
| Browser tests | Playwright + Axe | Route, responsive and accessibility verification. | Another browser runner only with ADR. |

No second form, server-state, table, modal or animation library was installed.
