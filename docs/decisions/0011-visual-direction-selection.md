# 0011 — Visual direction selection

- Status: Accepted
- Date: 2026-10-07
- Supersedes: 0009

## Context

Tadriss v2 needs one coherent identity across marketing, authenticated web surfaces and Expo. The
brief asks for four materially different directions before the system is rebuilt. The prototypes
live under `/[locale]/design/directions/[a|b|c|d]`. The selected system keeps the production palette
coherent across marketing, authenticated web surfaces and Expo while reserving the direction gallery for future
exploration.

## Options

- A — Quiet Precision
- B — Warm Editorial
- C — Contemporary Maghreb
- D — Cinematic Studio

## Decision

Adopt a merge of **B — Warm Editorial** and **C — Contemporary Maghreb**, with **D — Cinematic Studio** as the
interaction model for the school configurator and workflow story:

- Warm editorial typography and spacious paper surfaces make the product inviting and legible.
- Architectural frames, Majorelle blue, terracotta and sand give the identity a clear Maghreb reference without
  turning the interface into ornament.
- A dark, CSS-composited product stage gives the first screen a memorable point of view, with a static DOM fallback
  for touch users and reduced-motion preferences.

The production token sheet is now the single source of truth for web and mobile. Experimental direction tokens stay
available on the preview route so the team can compare future iterations without changing production surfaces.
