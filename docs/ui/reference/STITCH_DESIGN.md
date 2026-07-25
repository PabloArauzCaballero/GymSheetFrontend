---
name: Elite Performance System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e4e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-mono:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter-desktop: 32px
  margin-desktop: 64px
  gutter-mobile: 16px
  margin-mobile: 20px
  container-max-width: 1440px
---

## Brand & Style

The design system is engineered for professional athletes and high-performance coaches. The brand personality is clinical, disciplined, and uncompromising, evoking an emotional response of focused intensity and "surgical" precision.

The style is a synthesis of **Premium Minimalism** and **Technical Brutalism**. It prioritizes extreme clarity and data density without visual clutter. By leveraging a high-contrast foundation with rare, high-impact hits of "Volt," the interface functions as a professional dashboard where information hierarchy is the primary aesthetic driver. The result is a high-fidelity, "gallery-like" environment that feels like a piece of precision-engineered equipment rather than a standard consumer application.

## Colors

The palette is anchored in absolute black (#000000) to provide maximum depth and eliminate visual noise. 

- **Primary (Volt):** Use exclusively for primary Calls to Action (CTAs), active state indicators, and critical performance alerts. It must never be used for large surfaces or decorative elements.
- **Surface Strategy:** Use a tiered system of dark greys (#0D0D0D, #121212) to define content containers.
- **Borders & Outlines:** Use `#262626` for standard structural borders and `#1A1A1A` for subtle internal separators. This creates a technical, layered look without the need for shadows.
- **Text:** High-contrast White for primary information, Medium Grey (#8C8C8C) for secondary data, and Low-contrast Grey (#4D4D4D) for disabled or tertiary metadata.

## Typography

This design system utilizes **Hanken Grotesk** across all roles to maintain a unified, technical identity.

- **Precision Kerning:** Display titles and headlines must utilize tight negative letter-spacing (-0.02em to -0.04em) to achieve a high-fidelity, editorial look.
- **Readability:** Body text is optimized for a premium feel with generous line-heights (1.6x - 1.8x). This prevents data-heavy layouts from feeling cramped.
- **Data Roles:** Use the `label-caps` role for section headers and table headers to create clear structural breaks. Use `data-mono` for metrics, timestamps, and coordinates to emphasize the technical nature of the content.

## Layout & Spacing

The layout philosophy follows a **Gallery-Grid Model**, emphasizing whitespace as a tool for focus. 

- **Grid:** A 12-column fluid grid on desktop with large 32px gutters and 64px margins. This creates an expansive, high-end feel that separates the product from consumer-grade "dense" apps.
- **Rhythm:** All spacing must be multiples of 4px. Use larger steps (e.g., 64px, 80px) between major content sections to allow the UI to "breathe."
- **Reflow:** On mobile, margins reduce to 20px, and the grid collapses to a single column, but the generous vertical spacing between elements remains to preserve the premium aesthetic.

## Elevation & Depth

This design system rejects traditional shadows in favor of **Tonal Layering and Low-Contrast Outlines**.

- **Flat Depth:** Depth is communicated through color value, not light source. Higher priority elements (like cards) sit on a surface of `#0D0D0D` with a subtle `#262626` border.
- **Structural Borders:** Use hair-line borders (1px) to define zones. This "surgical" approach to containment mimics professional medical or aerospace interfaces.
- **Active States:** Elevation is signaled by the introduction of the Volt accent as a stroke or a small high-contrast indicator, rather than a physical lift or shadow.

## Shapes

The shape language is strictly **Technical/Surgical**. 

- **Base Radius:** A consistent 4px radius is applied to buttons, input fields, and small components. 
- **Large Radius:** For primary content cards or modals, the radius increases to 8px (`rounded-lg`). 
- **Consistency:** Never use fully rounded (pill-shaped) elements or sharp 0px corners. The 4px-6px range provides a modern, engineered feel that is precise without being aggressive.

## Components

- **Buttons:** Primary buttons are Solid Volt with Black text. Secondary buttons are Ghost-style with a `#262626` border and white text. Keep padding generous (12px 24px) to maintain the premium feel.
- **Input Fields:** Use a `#0D0D0D` fill with a `#1A1A1A` border. On focus, the border transitions to White, never Volt, to keep the accent reserved for critical actions.
- **Cards:** Cards should have no background fill (pure black) and be defined entirely by a 1px `#1A1A1A` border. For "featured" data, use a `#0D0D0D` fill.
- **Status Indicators:** Use small, circular pips. Volt indicates "Active/Optimal." Warning and Error states should use a muted Amber and Red, respectively, to ensure they do not compete with the Volt primary brand color.
- **Data Visualizations:** Graphs should use thin lines (1.5px). Grids within charts should use `#121212`. The data line itself is the only place where Volt should be used at scale.