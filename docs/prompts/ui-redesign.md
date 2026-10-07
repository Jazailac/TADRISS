# Prompt — Tadriss v2 UI & visual redesign

> Paste everything below into a fresh Claude Code session at the repo root.

---

You are the design engineer leading a full visual redesign of **Tadriss** (تدريس), a multi-tenant
school-management SaaS for private schools in Morocco (web: Next.js 16 + Tailwind v4; mobile:
Expo + NativeWind; three locales fr/ar/en with full RTL). The product works: auth, roles and
tenancy are done and tested. Your job is to make it look and feel like a best-in-class product.
Benchmark it against the top SaaS sites and the Awwwards Site of the Day standard, **not**
against other school software.

## 0. What you may throw away, and what you may not

**Throw away freely.** The current visual identity ("Zellige & Ink", ADR 0009) is not binding:
palette, fonts, the eight-point-star motif, shadows, radii, spacing scale, component styling,
page layouts and all marketing copy structure. Supersede ADR 0009 with a new ADR. Don't preserve
anything out of loyalty to it.

**Keep.** These are functional requirements, not taste:
- All three locales, and Arabic as a first-class RTL experience (logical CSS: `ps/pe`, `ms/me`,
  `start/end`). Every string goes through next-intl / i18next.
- Colours live as tokens in `packages/ui-tokens` (you redefine them freely). Raw hex values in
  components still fail lint, and the WCAG contrast test must still pass (AA minimum).
- Light **and** dark themes, both polished. Don't ship a dark mode that's just inverted.
- `prefers-reduced-motion` respected everywhere. Keyboard navigation and visible focus.
- Every existing test keeps passing (`pnpm lint type-check test`, `pnpm test:e2e`). Update e2e
  selectors only where labels intentionally change.
- **No fabricated social proof.** No fake customer logos, testimonials, ratings or usage numbers.
  Use honest proof instead: product UI, concrete capabilities, security facts.

## 1. Research before you design (write it down)

Study these and extract specific, nameable techniques, not vibes. For each, note 2–3 things worth
stealing and 1 thing to avoid:

- **SaaS craft leaders:**
  - **Linear:** density, keyboard-first, motion restraint, dark marketing.
  - **Vercel/Geist:** typography system, grid discipline.
  - **Stripe:** gradients, editorial storytelling, product-as-hero.
  - **Attio, Mercury, Raycast, Notion:** warmth, illustration, empty states.
  - **Arc / The Browser Company:** personality.
- **Awwwards SOTD patterns (2025–2026):** one committed visual concept instead of mixed effects;
  scroll-driven narrative ("scrollytelling") with a sticky product frame; real product UI shown
  early; restraint; Lighthouse mobile ≥ 90; reduced-motion support. Generic particle backgrounds
  and template layouts are losing.
- **Logitech G 360° Racing Studio** (https://www.logitechg.com/en-gb/360-racing-studio): the
  owner's explicit reference. Study the *feeling*: a cinematic, dark, full-bleed product world
  you explore yourself, with a single "Build your setup" journey as the CTA. Note the cost too:
  it's delivered as a live video stream, and its own accessibility notice sends some users to a
  fallback site. Steal the immersion and the configurator-as-hero idea. Refuse the streaming,
  the heaviness and the inaccessibility.
- **Education competitors:** Toddle, Classe365, Teachmint, Pronote / EcoleDirecte, Google
  Classroom. Use them mainly as **anti-references**: users call several of them dated, cluttered
  or lacking dark mode. Note every pattern they share that Tadriss can visibly beat.
- **Arabic-first products:** study how strong Arabic interfaces pair Arabic and Latin type
  (weights, x-height matching, line-height) and mirror motion and iconography.

Output: `docs/design/research.md` with screenshots or links, and a one-page "what we steal / what
we refuse" list.

## 2. Propose four directions, then stop

Build four distinct directions as live pages under `/design/directions/[a|b|c|d]` (dev-only).
Each one must show the **marketing hero + one feature section**, the **login screen**, and the
**admin dashboard**, in **French light, French dark and Arabic**. Suggested spread (you may
replace them with better ones if your research supports it):

- **A — Quiet Precision** (Linear/Vercel lineage). Near-monochrome neutrals, one electric accent,
  a tight grotesk (e.g. Geist, Inter Display, or a licensed alternative), hairline grids,
  dark-first marketing with soft light leaks, extremely dense and fast app UI.
- **B — Warm Editorial** (Stripe/Mercury/Attio lineage). Bright and spacious, an expressive display
  serif against a neutral sans, rich product compositions with layered cards, colour used to
  categorise modules (attendance, grades, finance) consistently across the marketing site and
  the app.
- **C — Contemporary Maghreb** (Awwwards-leaning). Bold large-scale typography, an abstracted
  Moroccan architectural language (arches, tile geometry used structurally, not as wallpaper),
  Majorelle blue / terracotta / sand palette, one signature scroll-driven moment (e.g. a
  timetable that assembles itself, or an attendance roll that fills in). It must stay
  professional enough for a school director to trust with payments.
- **D — Cinematic Studio** (after the Logitech G 360° Racing Studio). A dark, full-bleed,
  near-black stage with dramatic lighting on the product, and a **"Build your school"**
  configurator as the hero:
  - **The configurator:** the visitor picks a school type (primary / collège / lycée / centre
    de soutien), the roles and the modules. A 3D-feeling scene of the real Tadriss UI panels
    (dashboard, roll-call, timetable, receipt) assembles, re-lights and re-orders itself to
    match. The journey ends on "Create my school" pre-filled with those choices.
  - **How to build it:** with the real DOM UI composited in CSS 3D or a light React Three Fiber
    scene (lazy-loaded, ≤ 150 kB, GPU-friendly). **No video streaming.** It needs a static
    poster fallback for slow connections, reduced-motion and screen readers, and the full
    configurator must also work as a plain accessible form.
  - **The app:** inherits the drama only through a dark-first theme and confident type. The
    working screens stay calm and dense.

For each: a token sheet (colour, type scale, radius, shadow, motion curves), the Arabic type
pairing, and a 3-line rationale tied to the research. Screenshot all of them with Playwright at
375/1280 into `docs/design/directions/`. **Stop and ask me to choose** (or to mix elements).
Don't proceed on a guess.

## 3. After I choose: build the system, then the surfaces

**Design system first** (`packages/ui-tokens` + `apps/web/src/components/ui`):
- **Tokens:** semantic colours (surface levels, text levels, borders, accent, module colours,
  status), a fluid type scale (`clamp()`), spacing, radii, elevation, and motion tokens
  (durations, easings). Mirror them to NativeWind.
- **Primitives:**
  - Button (sizes, variants, loading)
  - Input/Select/Combobox
  - Checkbox/Radio/Switch, Segmented control, Tabs
  - Badge
  - Avatar (initials, any script)
  - Card
  - Table (sticky header, density toggle, row selection)
  - Dialog/Sheet/Drawer
  - Dropdown/Context menu, Tooltip
  - Toast
  - Skeleton, Empty state (illustrated), Command palette (⌘K)
  - Date/time displays, Money display (MAD, tabular figures)

  Prefer Radix primitives or React Aria for behaviour; you own the styling.
- **Motion:** shared spring/ease presets. Use Motion (framer-motion) or GSAP + ScrollTrigger for
  marketing scroll scenes, and CSS transitions for app micro-interactions. Use View Transitions
  for route changes where supported. Everything degrades to no motion under reduced-motion.
- A living component catalogue at `/design` (dev and preview only).

**Marketing site:**
- **Hero:** a crisp value proposition, real product UI as the visual (not a stock illustration),
  and a primary CTA above the fold at 375 px.
- **One scroll narrative** with a sticky product frame that changes as the reader moves through
  attendance → grades → timetable → fees & receipts. It needs a static fallback for
  reduced-motion and for small screens.
- **Bento grid** of capabilities with micro-demos.
- A **"made for Morocco"** section: trilingual UI with live RTL toggle, MAD invoicing, numbered
  receipts.
- **Security and data-isolation section** with honest, verifiable statements.
- **Role switcher** (Direction / Enseignants / Élèves) that re-skins a preview.
- **Final CTA and a rich footer.**
- **Pricing placeholder** wired to i18n (prices TBD, ask me).

**App** (every existing screen, plus patterns for the coming modules):
- **App shell:** collapsible sidebar with icon-only mode, ⌘K palette, breadcrumb, a user and
  school switcher, and a notifications slot. On mobile web, a bottom tab bar instead of a drawer
  where it fits better.
- **Role homes:** admin, teacher and student homes as genuinely useful dashboards with
  realistic seeded states, plus empty, loading and error states that look designed, not default.
- **Auth:** login/sign-up that feel premium (split or centred, your call), instant inline
  validation, password strength, and SSO-ready layout.
- **Data-heavy patterns** to set the bar before Phases 3–8 build them: an attendance roll-call
  grid, a grade-entry spreadsheet, a timetable week view and an invoice/receipt view. Static
  but realistic, in `/design`.

**Mobile app (Expo):** apply the same tokens, and load the chosen fonts with expo-font. Use
native-feeling navigation (tab bar per role), haptics on key actions, and large tap targets.
The Arabic layout must be mirrored correctly.

## 4. Quality bar (definition of done)

- **Performance:**
  - Lighthouse mobile ≥ 90 for performance, accessibility, best practices and SEO on `/`, `/ar`
    and `/login`.
  - LCP < 2.0 s, CLS < 0.05, INP < 200 ms.
  - Self-hosted subsetted fonts and no layout shift from them.
- **Accessibility:** WCAG 2.2 AA (axe in Playwright with zero violations on every page), full
  keyboard paths, and screen-reader labels in all three languages.
- **RTL:** visual parity in Arabic. Mirrored icons, motion directions and layouts.
  Numerals and dates follow the locale.
- **Responsive:** 375 / 768 / 1280 / 1440 visual baselines updated on Linux (the existing
  workflow) for fr and ar, light and dark.
- **Tests:** no regressions. All lint, type-check, unit, pgTAP and e2e suites pass.
- **Bundle:** marketing JS ≤ 120 kB gzipped on first load. Heavy animation libraries are
  lazy-loaded and kept out of the app shell.
- **Docs:** a new ADR superseding 0009, and the Design-system section of `CLAUDE.md` rewritten.
  Before/after screenshots in the PR description.

## 5. Working rules

- Work on branch `design/redesign` and open small PRs: tokens → primitives → marketing → app
  shell → role homes → auth → mobile.
- Show your work visually. After each PR-sized step, take Playwright screenshots (fr light,
  fr dark, ar) and look at them yourself before claiming the step is done. Fix what looks off.
- Never claim something looks good without having rendered it. If you couldn't verify something
  (e.g. no simulator for mobile), say so.
- Ask me before: choosing the direction (§2), adding paid fonts or assets, adding any dependency
  over 30 kB gzipped, writing pricing, or using any real school's name or logo.

Start with §1 (research), then §2, and stop for my choice.
