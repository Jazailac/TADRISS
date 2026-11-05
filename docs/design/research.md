# Tadriss visual direction research

Research completed 6 October 2026 before proposing the four directions. The external references
were used as evidence for techniques, not as a request to copy their identity. No external
reference was treated as proof of Lighthouse, accessibility, or reduced-motion compliance.

## What we steal / what we refuse

| Source                                                                                         | Steal                                                                                                        | Refuse                                                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Linear                                                                                         | Product UI before explanation; numbered workflow chapters; progressive detail.                               | Developer jargon, hidden controls, and density that makes the next school action unclear.     |
| Vercel / Geist                                                                                 | Semantic type roles; hairline alignment; responsive grid discipline.                                         | Decorative grid lines behind every surface.                                                   |
| Stripe                                                                                         | Outcome-first storytelling; real product evidence; proof beside the claim.                                   | Invented metrics, testimonials, or scale signals.                                             |
| Attio                                                                                          | One concrete work sample; task-indexed story; different paths for exploration and conversion.                | Several equal CTAs competing for the same first action.                                       |
| Mercury                                                                                        | Practical task language; early product exploration; security described as a control.                         | Banking-style aspiration that outruns implemented capability.                                 |
| Raycast                                                                                        | A memorable interaction motif; discoverable keyboard shortcuts; task-based discovery.                        | Making keyboard expertise a prerequisite for basic use.                                       |
| Notion                                                                                         | Plain parallel verbs; task-specific examples; exploration separate from conversion.                          | A vague “everything in one place” promise and an unbounded feature wall.                      |
| Arc                                                                                            | Personal setup choices; product screenshots paired with human language; contextual organisation.             | Whimsy around payments, attendance, or error states.                                          |
| Terminal Industries                                                                            | Numbered narrative chapters, a readable workflow demo, progressive disclosure.                               | Unverified ROI claims or cinematic scroll that obscures the CTA.                              |
| Wembi                                                                                          | A repeated modular motif; transformation that explains a complex workflow; literal HTML beside concept.      | Heavy industrial 3D and elaborate animation in ordinary forms.                                |
| Sileent                                                                                        | Restrained base surfaces, strong type, authored selected states.                                             | Simultaneous video, custom cursors, and pointer-dependent navigation.                         |
| Logitech G 360° Racing Studio                                                                  | Optional configurator; focused journey; scene changes that respond to choices.                               | Live video streaming, WebGL as a loading gate, and an inaccessible fallback experience.       |
| [Google Classroom](https://edu.google.com/intl/en/workspace-for-education/products/classroom/) | Keep the class as the primary context; connect feedback, grading and insight to one visible workflow.        | A stream-first information architecture that makes school operations feel like a social feed. |
| [Canvas / Instructure](https://www.instructure.com/higher-education)                           | Role-aware pathways, real-time progress visibility and clear separation between learning and administration. | Enterprise dashboard sprawl, “scale” claims that do not help a Moroccan school act today.     |

## SaaS craft notes

Linear’s product-first home and workflow chapters support direction A’s density. Geist’s official
typography and grid documentation support semantic type tokens, tabular numbers and shared column
edges. Stripe’s current home moves from business outcome to distinct product modules; this supports
direction B’s editorial narrative. Attio and Mercury both make the work sample concrete early, which
supports a browsable Tadriss preview before signup. Raycast’s keyboard-first explanation informs the
command-palette affordance, while the ordinary navigation remains available for touch users.

The current pages for Linear, Attio and Notion foreground AI. Tadriss borrows their hierarchy and
demonstration discipline, not their positioning.

## Education product patterns

Google Classroom’s official product page frames the class as the working context and links
assignments, feedback, grading and insights. Canvas describes a central learning hub, role-based
paths and real-time progress visibility for instructors and administrators. Those patterns support
Tadriss showing one concrete school day in the prototypes, then progressively revealing attendance,
grades, fees and permissions. The prototypes avoid copying either product’s stream or LMS chrome:
Tadriss needs the direction’s first action to be school operations, with learning modules as a
connected layer.

## Immersive and award references

The [Terminal Industries award record](https://www.awwwards.com/sites/terminal-industries) confirms
Site of the Day on 3 September 2025 and tags storytelling, scrolling, animation and interaction
design. The current [Terminal Industries site](https://terminal-industries.com/) exposes staged
adoption, product-area tabs and a benefit calculator; the current page may have evolved since the
award. The [ET Studio Wembi case study](https://www.e-t.studio/works/wembi) and [Sileent case study](https://www.e-t.studio/works/sileent)
confirm the designer’s 2026 Site of the Day claims; the linked Awwwards records timed out during
research, so their exact award dates remain unverified.

The [Logitech G experience](https://www.logitechg.com/en-gb/360-racing-studio) visibly presents a
“Build your setup” configurator and a cinematic product stage. Its own accessibility notice says
the experience is delivered as a live video stream and directs some visitors to the standard site.
Direction D therefore uses accessible DOM panels and CSS depth, with a plain form and static preview
as the complete experience.

## Arabic-first implementation notes

Arabic is treated as a first-class layout, not a translated screenshot: the direction pages use the
same semantic content under `dir="rtl"`, logical spacing, mirrored directional marks and Arabic-aware
display/UI font roles. Numbers and dates remain locale-formatted. The production v2 font pairing is
IBM Plex Sans Arabic for UI and Amiri for display; its line-height is allowed to breathe more than
Latin UI text. All prototypes are checked at the Arabic route as well as French light and dark.

## Decision frame

The four proposals differ by composition and interaction, not only hue:

- **A — Quiet Precision:** near-monochrome, compact, keyboard-visible, hairline grid.
- **B — Warm Editorial:** bright paper, expressive display type, layered module cards.
- **C — Contemporary Maghreb:** architectural frames, Majorelle blue/terracotta/sand, a roll-call sequence.
- **D — Cinematic Studio:** near-black stage, school configurator, CSS-composited real UI panels.

## Selected direction

The product owner selected a merged foundation: B’s warm editorial typography and paper-led spacing with C’s
contemporary Maghreb architecture, plus D’s cinematic studio stage for the interactive school setup. The production
system uses sand, ink, Majorelle blue and terracotta as semantic tokens; the direction gallery remains a preview-only
workspace for comparing future options.
