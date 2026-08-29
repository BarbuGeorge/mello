# Product

## Register

brand

## Users

Potential high-ticket clients (founders, marketing leads, agencies) evaluating George as a web developer/designer for their next project. They land from a link or referral, skim fast, and judge craft within seconds. Mobile-heavy traffic: the phone experience is the primary experience, desktop is where the wow-factor closes the deal.

## Product Purpose

Personal portfolio and reusable template (Nuxt 4 frontend + Strapi 5 CMS). Success = a visitor immediately senses top-tier frontend craft ("how was this made?"), browses projects, and reaches out. Secondary goal: every pattern built here becomes a reusable building block for future client projects.

## Brand Personality

Playful, bold, juicy. Saturated yellow drench (#FED16A) as the body surface, interactive "eyes" as the hero signature, copy with fresh-juice energy. The playfulness is the differentiator; the craft (motion, physics, detail) is what makes it read as expensive rather than childish. Confidence through interaction quality, not through sober minimalism.

## Anti-references

- Sober dark-mode "premium agency" templates (big serif, black bg, generic reel). The site must NOT pivot to that lane.
- Template-grade Bootstrap portfolios: identical card grids, icon-heading-text repetition.
- Overloaded WebGL demos that tank mobile performance. Effects serve the brand, never block the content.
- Generic AI landing-page grammar: uppercase tracked eyebrows on every section, gradient text, glassmorphism.

## Design Principles

1. **The eyes are the mascot.** New effects (particles, 3D) support the signature, never compete with it.
2. **Playful physics, precise easing.** Every animation feels hand-tuned: exponential ease-outs, real weight, no bounce-for-bounce's-sake.
3. **Mobile is the main stage.** Most traffic is phone traffic; every effect ships with a cheap, beautiful mobile variant. 60fps or it doesn't ship.
4. **Show, don't claim.** The portfolio proves skill through its own interactions instead of copy about skill.
5. **Template-ready.** Effects are built as reusable composables/components with clean mount/unmount, so they transfer to client projects.

## Accessibility & Inclusion

- `prefers-reduced-motion: reduce` honored everywhere: content visible without animation, crossfades instead of movement, no autoplaying canvas loops.
- Contrast: dark ink (#3B3B3B) on yellow passes for headings/body; verify any new color pairs at ≥4.5:1 for body text.
- Custom cursor never replaces functionality; native focus states preserved; canvas layers are `aria-hidden` decoration only.
- Touch devices get touch-appropriate interactions (no hover-dependent content).
