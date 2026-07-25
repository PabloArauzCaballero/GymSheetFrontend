# UI/UX source traceability

| Source rule or observed pattern | Applied in | Acceptance evidence |
|---|---|---|
| Black canvas and tonal surfaces | `globals.css`, Card, Dialog, PortalShell | No light default surfaces in authenticated shell. |
| Volt accent reserved for action and success | Button, Badge, metric cards, active navigation | Primary CTA remains visually dominant without multiple accent colors. |
| Large tight headings | PageHeader, AuthFrame, dashboard and live workout | Responsive `clamp()` title sizes and negative tracking. |
| Structural borders, no decorative shadows | Shared UI primitives | Panels remain legible in grayscale and high contrast. |
| Mobile-first workout capture | live workout, set entry, rest timer | Core add-set actions fit a 320px viewport and remain keyboard accessible. |
| Dense operational tables | admin panels, workout history | Semantic table with horizontal overflow rather than compressed illegible columns. |
| Explicit feedback | LoadingPanel, ErrorPanel, EmptyState, Sonner | Every query-backed page has loading/error/empty handling. |
| Progressive disclosure | Dialogs for create/edit operations | Tables remain scan-friendly; forms open on demand. |
| Minimal animation | CSS transitions and reduced-motion media query | No animation library or long blocking sequence. |
| Continuous product learning | `docs/progress/progress-report.md` | Gaps are recorded rather than hidden behind invented data or controls. |

Reference images and the supplied design specification are preserved under `docs/ui/reference/`.
