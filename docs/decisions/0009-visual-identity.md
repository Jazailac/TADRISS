# 0009 — Visual identity: "Zellige & Ink"

- Status: Accepted (product owner asked for a premium, non-generic look, 2026-10-06)
- Date: 2026-10-06
- Supersedes the font choices listed in v1's CLAUDE.md (Plus Jakarta Sans / DM Sans / JetBrains Mono).

## Decision

**Colour.** Warm paper neutrals instead of cold slate. Primary is a deep zellige green;
accent is brass (eyebrows, numbering, highlights). Majorelle blue is `info`, terracotta is `danger`.
`ink` is the always-dark brand surface (auth panel, Languages band). Every foreground/background
pair is checked by a WCAG contrast unit test in both themes (`packages/ui-tokens/scripts/contrast.test.ts`):
7:1 for body text on surfaces, 4.5:1 for everything else.

**Type.** Fraunces (variable serif, `opsz` + `SOFT`) for display only, via the `.display` utility. Geist
for UI, Geist Mono with `tabular-nums` for every number, amount and time. Arabic uses IBM Plex Sans
Arabic for UI and Amiri for display. French copy uses narrow no-break spaces before `: ; ? !`.

**Motif.** The khatam (eight-pointed star) is the logo mark and the only pattern (`ZelligePattern`),
used faintly behind hero, CTA and dark sections. No stock gradients or illustrations.

**Depth.** Hairline borders and layered, warm-tinted shadows (`shadow-xs…lg` tokens). Dark mode
uses stronger shadow alpha. Scoping a section with the `dark` class switches its tokens locally.

**Motion.** A single rise-in for hero content, disabled under `prefers-reduced-motion`.

## Consequences

- UI components live in `apps/web/src/components/ui` (Button with pending state, Card, Badge,
  Field/Input, Logo/Mark, ZelligePattern) and must be reused rather than restyled per page.
- Icons: lucide-react, `strokeWidth={1.75}`. Directional icons get `rtl-flip`.
- Mobile picks up the palette automatically through the NativeWind preset. Its custom fonts
  (expo-font) are pending, because there is no simulator to verify them on this machine yet.
