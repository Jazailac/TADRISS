# 0008 — Visual baselines are generated on CI's Linux image

- Status: Accepted
- Date: 2026-10-06

Font rendering differs between macOS and Linux, so screenshots from a laptop never match CI.
Visual specs (`*.visual.ts`) skip on non-Linux. Baselines are produced by the manual
`Update visual baselines` workflow on `ubuntu-latest` (the same image CI compares on) and
committed to the PR. Functional Playwright specs run everywhere.
