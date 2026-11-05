# Courtyard Studio — Version 2

Tadriss pairs the warmth of an editorial school journal with the precision of a daily work tool.
The courtyard arch is the recurring brand silhouette. Architectural drafting lines and bold ink surfaces establish a recognisable school identity; the
information and the next useful action lead each screen.

## Foundations

- `packages/ui-tokens/src/tokens.ts` owns the light and dark palettes, radii, timing and spacing.
  Navigation has dedicated tokens so the ink rail remains readable in either theme.
- Web fonts are licensed, bundled WOFF2 assets in `apps/web/src/app/fonts/`, loaded through
  `next/font/local`. Geist serves the interface, Fraunces the editorial headings, Geist Mono
  numbers, IBM Plex Sans Arabic Arabic interface text, and Amiri Arabic headings. Fonts never
  require a build-time download or a third-party request from the browser.
- Data-page titles stay smaller than the greeting and marketing title. Eyebrows identify the
  context, secondary copy explains the task, and tabular figures preserve scanability.
- Primary blue marks actions and selection. Terracotta provides a restrained editorial accent.
  Status colours always accompany a label or icon.

## Web surfaces

`src/app/workspace.css` provides explicit layout hooks used by shared domain components:

| Hook                               | Purpose                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `workspace-page`                   | One responsive reading width with intentional section spacing             |
| `workspace-header`                 | Page identity, contextual copy, primary actions and the short accent rule |
| `workspace-toolbar`                | Filters grouped on one quiet surface                                      |
| `workspace-toolbar-embedded`       | Filters inside an existing surface, without another outer card            |
| `workspace-tabs`                   | Scrollable segmented page navigation                                      |
| `metric-strip` / `metric-cell`     | Related numbers on one divided surface                                    |
| `workspace-list` / `workspace-row` | Directories, records and conversations as connected rows                  |
| `workspace-savebar`                | Visible contextual save feedback above the phone navigation               |

Use an outer `workspace-list` only for a standalone list. An embedded list inside a `Card` uses
ordinary dividers. Preserve unread edges and selected backgrounds on link rows.

The shared primitives in `components/ui` remain the default for buttons, fields, cards, badges,
dialogs, avatars, progress and feedback. Domain dialogs use `ActionForm`; field-error space remains
reserved so blur validation cannot move a tapped submit button. Pending actions retain their label
and disable repeat submission. Toasts clear the mobile navigation.

The role dashboards use `DayCover`, `StatTile` and open `Panel` sections. The cover pairs a large
editorial greeting and school-local date with one useful metric. Its gauge appears only when an
actual denominator exists. Daily lessons have separate start/end times and direct roll-call links
for staff. Student and parent briefings share read-only task and mark ledgers. Finance gets a
segmented collection instrument derived from collected and outstanding amounts.

`readability.css` sets the working-screen reading hierarchy: 16px body copy, 13–14px metadata,
15px navigation, clear sans-serif page headings, and compact status navigation. Homework uses full-width
lists with exact due dates; completed titles remain readable. Parent pages show the selected child
and class consistently above the content.

`daybook.css` owns the journal compositions; `domain.css` owns distinct workflow treatments:
member directories, class capacity registers, weekly timetable rails, daily attendance, deadline
ledgers, score rulers, invoice proportions, editorial notices, document covers and anchored settings.
These use the existing data and actions. There are no invented time series or decorative statistics.

The public experience uses an ink architectural hero, a panoramic product cockpit, numbered role
entrances, and an open attendance-ledger treatment on authentication screens. Its configuration
controls and all four demo sign-in actions retain their existing behavior.

## Navigation and motion

The desktop rail groups the school's work and keeps the current page explicit. It collapses to an
icon rail while retaining sign-out. On smaller screens the same navigation opens in a native dialog;
a bottom dock exposes Home, Timetable, Homework and Messages where available, plus More. Search opens the page
switcher and supports the existing keyboard shortcut. A skip link moves keyboard users into the
workspace. Parent navigation retains `?child=` through the sidebar, dock, page switcher and
notifications. Language changes retain query parameters and anchors, preserving the current file
and filters. The breadcrumb links back to the dashboard, and the page switcher is labelled “Go to a
page” to state its purpose.

Motion uses short colour, opacity and transform transitions. Buttons provide press feedback;
dialogs enter softly; skeletons breathe without a moving shimmer. Reduced-motion preferences
disable animation and transitions. No continuous decorative animation or animation library is
required.

## Mobile and multilingual use

The Expo `src/ui/kit.tsx` mirrors the token system through editorial headers, compact icons,
interactive rows, avatars, structured loading states and tactile controls. It preserves the existing
role tabs and read/write scope. `src/ui/day-ledger.tsx` supplies native day, time and task rows.
Home leads with the actual current/next lesson and pending work; More extends the same direction
through attendance, invoices, documents, results, notices and messages. The date refreshes at
school-local midnight and on foregrounding. Screen content has a capped reading width on tablets.

Web layouts support 375, 768 and 1280 pixels. Wide schedules become a phone agenda, long dialogs
scroll within the viewport, and print documents wrap on screen before becoming paper layouts.
Use logical spacing and borders, flip directional icons for RTL, render user-provided names with
`dir="auto"` or `bdi`, and keep French, Arabic and English translation keys aligned.

## Verification

Run token contrast tests after palette changes, plus lint, translation completeness, TypeScript,
unit tests and the mobile export check. Browser checks should cover the public/auth screens, every
role's home and page list, phone overflow, Arabic RTL, theme switching, dialogs and preserved user
flows. Visual baselines are regenerated only through the existing Linux workflow.
