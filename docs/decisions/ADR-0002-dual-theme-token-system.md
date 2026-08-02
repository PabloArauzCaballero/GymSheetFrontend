# ADR-0002: Dual-theme (dark/light) token system

- Status: accepted
- Date: 2026-08-02

## Context

`apps/web` had a single dark "volt" identity. Adding a light theme required a way
to switch palettes across ~30 screens and 60+ components without a risky visual
rewrite or regressions. Styling already flowed almost entirely through CSS custom
properties consumed as Tailwind arbitrary values (`text-[var(--text-muted)]`,
~350 sites), but a handful of literal colors (`text-white`, `bg-black`, tone
hex codes) would not adapt to a light background. The project also forbids Web
Storage for client persistence.

## Decision

- Make the CSS custom properties **theme-aware**: dark tokens in `:root`, light
  overrides under `:root[data-theme='light']` in `globals.css`. Because existing
  styles read `var(--…)`, the theme switch propagates from one source.
- Add semantic **tone tokens** (`--{success,warning,danger,info}-{bg,border,text}`)
  and an `--accent-ink` token so accent **text/icons** stay legible in light mode
  while `--volt` remains the vivid **fill** color.
- Tokenize the remaining literal colors app-wide; keep `global-error.tsx` (renders
  outside the root layout) as a standalone dark fallback.
- Register tokens with Tailwind `@theme inline` for clean, theme-reactive utilities.
- Persist the choice in a **cookie** (`gymsheet-theme`), not Web Storage. A
  `<head>` script sets `data-theme` before first paint (no FOUC), falling back to
  `prefers-color-scheme`. `ThemeProvider` reads the value via `useSyncExternalStore`.
- Mirror the palettes in `@gymsheet/design-tokens` (`lightColors`, `tones`) so the
  Expo client can offer light mode from the same source.

## Consequences

- Light/dark reaches every screen from a single token layer; visual output in dark
  is unchanged (zero-diff for dark users).
- No `setState`-in-effect and no hydration mismatch (`useSyncExternalStore`).
- New UI should use `--accent-ink` for accent text and reserve `--volt` for fills.
- Duplicated "form error box" markup remains a documented follow-up (extract a
  `<FormError>` atom).
- `globals.css` is near the project's 300-line source-check limit; further tokens
  may need a companion file.
