---
name: apple-premium-ui
description: Directs premium, restrained, Apple-like product interface design without copying Apple assets or trade dress. Use for polished SaaS, dashboards, landing pages, onboarding, product surfaces, mobile-like web UIs, premium motion, micro-interactions, visual hierarchy, typography, spacing, glass/translucency, responsive behavior, and design audits.
---

# Apple Premium UI Director

Use this skill as a coordinating art-direction layer over frontend-design, UI/UX Pro Max, Motion Design, GSAP, Motion/Framer and Vercel UI review skills.

## Design intent

Create interfaces that feel:
- calm
- deliberate
- spatially generous
- premium
- tactile without looking skeuomorphic
- technically precise
- visually quiet until interaction is needed
- coherent across light and dark modes

Do not clone Apple.com, iOS, macOS, Apple assets, icons, screenshots, typography files, product renders, or proprietary trade dress. Take inspiration from high-end product design principles rather than copying a specific screen.

## Visual hierarchy

Prefer:
- fewer, stronger elements
- one dominant action per region
- large, disciplined spacing
- clear type scale
- restrained radii
- subtle borders
- minimal dividers
- low-noise surfaces
- deep neutral tones with one intentional accent
- content-led composition

Avoid:
- generic 3-card SaaS layouts
- purple/blue AI gradients by default
- random glow
- excessive glassmorphism
- gradients without functional purpose
- giant pill buttons everywhere
- too many badges
- decorative icons that add no information
- over-rounded containers
- noisy dashboards
- walls of equal-weight cards

## Typography

Favor system-quality typography and strong hierarchy.
For Apple-platform-adjacent experiences, prefer platform/system font stacks when appropriate.
Use optical size, tracking, line-height and weight intentionally.
Never rely on font weight alone to create hierarchy.

## Surfaces

Use depth sparingly:
1. base canvas
2. elevated content surface
3. temporary overlay
4. focus/interaction state

Prefer subtle separation through:
- luminance
- translucency
- blur only where compositing makes sense
- 1px borders with low contrast
- restrained shadows

## Motion personality

Motion should communicate state and causality, not decorate.

Default priorities:
1. continuity
2. direct manipulation
3. response
4. spatial relationship
5. delight only after usability

Prefer:
- transform and opacity
- spring motion for direct manipulation
- short ease-out for entrances
- smooth shared-layout transitions
- subtle scale/opacity feedback
- stagger only when it improves reading order
- scroll motion only when tied to narrative or spatial context

Avoid:
- bouncing everything
- long hero animations before content is usable
- motion on every hover
- parallax that harms readability
- scroll-jacking
- simultaneous unrelated animations

Always respect:
- prefers-reduced-motion
- keyboard users
- touch users
- focus visibility
- interruption/reversal
- animation cleanup on unmount

## Performance

Treat animation performance as a product requirement.
Prefer compositor-friendly properties.
Avoid layout thrashing.
Do not animate expensive blur/filter continuously without profiling.
For React, clean up GSAP/Motion effects correctly.
For scroll-driven sequences, prefer tested GSAP ScrollTrigger patterns.
For simple state transitions, prefer CSS or Motion before adding a heavy animation stack.

## Interaction quality

Every interactive element must have:
- default
- hover when relevant
- active/pressed
- focus-visible
- disabled when relevant
- loading when relevant
- error/success when relevant

Target controls must remain comfortable on touch devices.

## Responsive behavior

Do not merely shrink desktop.
Recompose:
- navigation
- type scale
- information density
- action placement
- media
- animation amplitude

Motion should become simpler on smaller or lower-power devices when needed.

## Workflow

Before implementing:
1. infer product goal and audience
2. define one visual direction
3. define spacing/type/surface tokens
4. identify interaction hierarchy
5. identify where motion improves understanding
6. choose the lightest animation tool that fits
7. implement
8. audit accessibility
9. audit responsive behavior
10. audit performance
11. remove decorative excess

When multiple installed skills apply:
- frontend-design -> aesthetic direction
- ui-ux-pro-max -> system/tokens/UX reasoning
- motion-design -> choreography and timing
- motion-framer -> React Motion implementation
- gsap-* -> advanced timelines/scroll/complex choreography
- web-design-guidelines -> final UI audit
- react-best-practices -> React/Next performance audit
- react-view-transitions -> native/shared document transition decisions

## Final quality gate

Before declaring a UI finished, verify:
- no obvious AI-generated layout cliches
- hierarchy is obvious in 3 seconds
- primary action is unmistakable
- spacing is consistent
- typography is deliberate
- motion is purposeful
- reduced-motion path works
- keyboard path works
- mobile composition is intentional
- no accidental horizontal overflow
- no avoidable CLS
- no animation memory leaks
- no gratuitous dependencies
- visual polish survives without animation
