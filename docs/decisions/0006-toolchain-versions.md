# 0006 — Toolchain versions and deviations from "latest"

- Status: Accepted
- Date: 2026-10-06

| Tool              | Version                    | Why not latest                                                                               |
| ----------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Next.js           | 16.3                       | latest. Uses `proxy.ts` (Next 16 rename of middleware) and `next/root-params` for the locale |
| React (web)       | 19.3                       | latest                                                                                       |
| Expo SDK          | 57 (RN 0.86, React 19.2.3) | latest; React version is pinned by Expo                                                      |
| TypeScript        | **6.0**                    | typescript-eslint does not support TS 7 yet (`<6.1.0`)                                       |
| ESLint            | **9.39**                   | eslint-plugin-react does not support ESLint 10 yet                                           |
| Tailwind (web)    | 4.3                        | latest                                                                                       |
| Tailwind (mobile) | **3.4**                    | NativeWind 4 requires Tailwind 3; NativeWind 5 is still RC                                   |
| pnpm              | 9.15                       | matches the installed toolchain; upgrade in its own PR                                       |
| Zod               | 4                          | latest                                                                                       |

Revisit each bold pin when its blocker ships.
