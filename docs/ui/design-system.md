# GymSheet visual system

## Source direction

The supplied Stitch examples use premium minimalism with technical-brutalist structure: black canvas, tonal gray panels, thin borders, compact controls, oversized headings and a single fluorescent accent. The frontend preserves that language without copying generated HTML directly.

## Tokens

| Token | Value | Use |
|---|---|---|
| background | `#000000` | application canvas |
| lowest surface | `#080808` | cards and panels |
| surface | `#131313` | controls |
| high surface | `#1f1f1f` | hover/selected states |
| border | `#262626` | structural separation |
| primary text | `#f5f5f5` | headings/body |
| muted text | `#8c8c8c` | metadata/helper text |
| Volt | `#c3f400` | primary action/success/focus emphasis |
| danger | `#ff6b63` | destructive/error state |

Radii are restrained at 4, 6 and 8 pixels. Shadows are omitted. Numeric values use tabular figures.

## Typography

The CSS stack requests Hanken Grotesk first and falls back to Inter and system sans-serif. No font binary is bundled. This avoids an unverified runtime font download; a licensed webfont can be added through the deployment's asset pipeline later.

## Interaction

- Primary actions use Volt with black text.
- Destructive actions remain visually distinct and require explicit user activation.
- Focus indicators are always visible.
- Loading buttons expose pending state.
- Tables use semantic markup and horizontal overflow on narrow screens.
- Reduced-motion users receive near-zero animation duration.
