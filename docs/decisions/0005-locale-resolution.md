# 0005 — Locale resolution

- Status: Proposed
- Date: 2026-10-06

## Context

French is the product default; Arabic (RTL) and English are supported.

## Decision

- **Web:** the locale is in the URL (`/` = fr, `/ar`, `/en`; next-intl `localePrefix: 'as-needed'`).
  Browser `Accept-Language` is **not** used (`localeDetection: false`), so `/` is always French
  and pages stay statically cacheable. Users switch explicitly.
- **Mobile:** the first supported device language wins, else French (`resolveLocale`).
  Direction is applied via `I18nManager.forceRTL` and requires an app reload.
- Later (Phase 1+): a signed-in user's saved preference overrides both.

## Consequences

An English-browser visitor lands on French and must switch once. Revisit if analytics show
many non-French visitors.
