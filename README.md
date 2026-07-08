<p align="center">
  <img src="docs/banner.svg" alt="Wyrd — a version control for your life · weave your wyrd" width="100%" />
</p>

<p align="center">
  <em>Old English for fate — the root of “weird.” The Wyrd Sisters wove the threads of lives.</em>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/status-in%20development-B8912F" />
</p>

---

## What is Wyrd?

**Your life gets a repository.** Wyrd renders your trajectory as a git-style commit graph:
declare where you’re headed, commit once a day, branch for side-quests, merge what you
finish — and see, honestly and visually, where you drifted and where you recovered.

- **Main branch** — your declared trajectory (one at a time), e.g. *“Learn to code → land a junior dev role.”*
- **Commit** — a daily check-in: task checkboxes + a message. The commit log doubles as a journal.
- **Branch** — a bounded side-quest (a cert course) that **merges** back into main when its goal is met.
- **Drift** — the signature mechanic: an AI reads your commits, and a recurring distraction becomes a
  named branch. Ignore it long enough and *main merges into the distraction*, while a **ghost** of your
  original line runs alongside — showing where you would have been.
- **Counter-merge** — brings you back. The dark loop stays in history forever: proof you drifted *and* recovered.

Over months, the graph and its AI-narrated storyboard become an **autobiography** — written by nothing
but honestly showing up, day after day.

> The full product spec, flow diagram, and original interactive prototype live in [`design/`](design/).

---

## Status

| Phase | Scope | State |
|---|---|---|
| **1 — The graph** | Data-driven SVG commit-graph renderer (main · branches · drift · ghost · merges) | ✅ Done |
| **2 — Core loop** | Onboarding, daily commit dialog, branch/merge, local persistence, PWA shell | ✅ Done (local-first) |
| 3 — Honesty mechanics | Missed-day ghost fork → 15-day archive, fork-new-main | ⏳ Planned |
| 4 — AI | Drift detection, weekly retro, commit-message assist (Gemini behind a wrapper) | ⏳ Planned |
| 5 — Payoff | Storyboard generator, journal search | ⏳ Planned |

**Local-first for now:** all state persists to `localStorage`; there is no backend or auth yet.
Supabase (Postgres + auth + RLS) is the planned Phase-2.5 swap — the store is isolated behind one
module so that change touches nothing else.

---

## Architecture

The core idea is a strict one-way pipeline, so the renderer never has to know where data came from:

```
domain state           deriveGraph()            GraphModel            <WyrdGraph/>
(trajectory,     ─────▶ (pure mapping)   ─────▶ (edges + nodes) ─────▶ (declarative
 branches,                                                              SVG renderer)
 commits)
```

- **Domain** ([`src/lib/domain`](src/lib/domain)) — `Trajectory` / `Branch` / `Commit`, mirroring the
  proposal’s schema. The source of truth.
- **Store** ([`src/lib/store`](src/lib/store)) — a framework-agnostic external store persisted to
  `localStorage`, read through React via `useSyncExternalStore` (SSR-safe, no hydration hacks). Swapping
  in Supabase later means replacing this one module.
- **Graph engine** ([`src/lib/graph`](src/lib/graph)) — pure, testable, no React:
  - `theme` — palette + geometry constants (one source of truth).
  - `types` — the declarative model: typed `Edge`s (spines + connectors) and `GraphNode`s.
  - `layout` — the math: `dayY`, `laneX`, `sBezier`, edge → SVG path.
  - `deriveGraph` — turns real domain state into a `GraphModel`.
  - `sampleGraph` — the seed narrative (cert branch → drift → ghost → counter-merge) as typed data.
- **Renderer** ([`WyrdGraph.tsx`](src/components/WyrdGraph.tsx)) — walks a `GraphModel` and emits SVG.
  It never changes; only the data feeding it does.

Everything animated in the UI is `transform`/`opacity` only (compositor-only, no per-frame reflow) —
that’s deliberate, and the reason the pinned scrollytelling hero stays smooth.

---

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, Turbopack) · **React 19** · **TypeScript 5**
- **[Tailwind CSS 4](https://tailwindcss.com)** for styling; a “parchment & steel” theme in `globals.css`
- **[Lenis](https://github.com/darkroomengineering/lenis)** for app-wide smooth scroll +
  **[react-spring](https://www.react-spring.dev/)** for scroll-linked, Apple-style scrollytelling
- Custom **SVG graph renderer** (no chart library — the hard, portfolio-worthy part)
- **PWA** shell (manifest + service worker) for an installable, offline-capable “9:30 PM commit” ritual
- Display type **Cinzel**, body **Crimson Pro**, via `next/font`

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load you’ll declare a trajectory; after
that the app opens on your graph, with the daily-commit sheet in the corner.

```bash
npm run build   # production build
npm run lint    # eslint
```

> **Note:** the service worker only registers in production builds — a cache-first SW in `next dev`
> fights Fast Refresh and causes reload loops.

---

## Project structure

```
src/
  app/                     layout, root page (onboarding vs. graph), global theme
  components/
    CollapsingHero.tsx     pinned, scroll-scrubbed hero (Lenis + react-spring)
    WyrdStory.tsx          scrollytelling section — the seed narrative drawn as you scroll
    SmoothScroll.tsx       Lenis provider
    Onboarding.tsx         first-run: declare a trajectory
    CommitSheet.tsx        daily commit dialog (multi-branch, edit-in-place)
    WyrdGraph.tsx          the declarative SVG graph renderer
    WyrdLogo / WyrdBrandMark / Legend / ServiceWorkerRegister
  lib/
    domain/                Trajectory / Branch / Commit + date & id helpers
    store/                 external localStorage store + useSyncExternalStore hook
    graph/                 theme · types · layout · deriveGraph · sampleGraph
public/                    icon.svg · manifest.json · sw.js
design/                    product proposal, flow diagram, v3 HTML prototype
docs/                      README banner
```

---

## Design language

Parchment background with a fine dot grid, manuscript typography, a sword-crossguard origin, and a
glowing current tip. Colors carry meaning on the graph:

| Element | Color |
|---|---|
| Main trajectory | royal magenta `#C2185B` |
| Merge / milestone | gold `#B8912F` |
| Side branch | teal `#2C7A72` |
| Drift branch | crimson `#C93B47` |
| Ghost (the line-without-you) | `rgba(194,24,91,0.32)`, dashed |

The two things the app asks of you, surfaced where each is tested:

> **Stay true to yourself** — keep walking the trajectory you declared.
> **Stay true to keep an accurate history** — write what actually happened, not what you wish had.

---

<p align="center"><em>weave your wyrd</em></p>
