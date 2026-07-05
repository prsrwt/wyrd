# ⚔ Wyrd — A Version Control for Your Life

> **Wyrd** — Old English for fate, one's personal destiny; the root of "weird."
> The Wyrd Sisters wove the threads of lives — a lineage graph of fate.
> Tagline: *weave your wyrd*.
>
> A personal app that renders your life as a git-style commit graph:
> declare a trajectory, commit daily, branch for side-quests, merge what you finish,
> and see — honestly, visually — where you drifted and where you recovered.

**Status:** Proposal v1 · **Date:** 2026-07-05

---

## 1. Concept

Your life gets a repository.

- The **main branch** is your declared trajectory (one active at a time), e.g.
  *"Learn to code → land a junior dev role → go independent."*
- A **commit** is one daily check-in: task checkboxes + a message. The commit log
  doubles as a journal.
- **Branches** are bounded side-quests (a cert course) that **merge** back into main
  when their declared goal is met.
- **Drift** — the app's signature mechanic — is detected by AI reading your commits.
  A recurring distraction becomes a named branch; ignore it long enough and *main
  merges into the distraction*, while a **ghost** of your original line runs
  alongside, showing where you would have been.
- A **counter-merge** brings you back. The dark loop stays in history forever —
  proof you drifted *and* recovered.

The output over months is an **autobiography** — a storyboard of your life,
auto-narrated by AI from real commit data, written by nothing but honestly
showing up, day after day.

---

## 2. Core Objects & Rules

### 2.1 Trajectory (main branch)
- One active main at a time.
- Carries the daily task list (n tasks, default 5).
- Changing life direction = **fork**: old main ends, new main begins from that
  point. Rare, deliberate, requires a written "why" (like a breaking-change entry).

### 2.2 Commit (daily entry)
- One dialog per day. If multiple branches are active, the dialog is **sectioned
  per branch** — each section shows that branch's tasks and takes its own message,
  producing one commit per branch. Skipping a section = a miss for that branch only.
- Anatomy:

```json
{
  "date": "2026-07-05",
  "branch_id": "main",
  "tasks_completed": 4,
  "tasks_total": 5,
  "task_states": { "study": true, "exercise": true, "reading": false, "practice": true, "wind_down": true },
  "message": "feat: finished the chapter I'd been stuck on for a week"
}
```

- Graph node shows `x/n`; node fill opacity encodes completion ratio.
- **Conventional-commit prefixes are suggested, never enforced.** AI (or a
  heuristic) proposes `feat:` (progress), `fix:` (recovery day), `chore:`
  (maintenance), `docs:` (pure reflection). The user can always type freely —
  don't fight a tired human at 9:30 PM.
- **Missing a day is a commit-shaped gap on main, not an auto-branch.** Branches
  are only ever *chosen* (by the user) or *proposed* (by AI, user-confirmed).

### 2.3 Branch (side-quest)
- Created with an **intended merge condition** ("merges when the certificate is earned").
- Has its **own task list** (task lists live on the branch, not the commit).
- On completion → **merge commit** on main summarizing what it added
  (`merge: completed Certification ✦`). Main renders thicker/stronger after
  milestones.
- Abandoned branch = **dangling**: stays visible, faded, unmerged. AI may later
  prompt: "3 unmerged branches older than 60 days — archive or revive?"

### 2.4 Ghost & Death (missed-day drift)
- **3 consecutive missed days** → main stops being solid; a **ghost fork** begins:
  faded, dashed, advancing with empty nodes daily. *Your trajectory continues
  without you.*
- **Return within 15 days** → line solidifies forward from your return; the ghost
  segment stays in history as a visible wobble.
- **Day 15, no return** → trajectory is declared dead and **archived — never
  deleted.** Commits are journal entries; months of a life are never `rm --force`d.
  On eventual return, the app offers: *"This trajectory ended — fork a new main
  from here?"* New main starts from the dead tip; history stays one continuous
  line with a visible dark chapter.

### 2.5 AI Drift Detection (two warnings, then forced)
- Every commit, the AI receives recent messages + task-completion trend and
  returns structured JSON:

```json
{
  "drift_detected": true,
  "pattern": "late-night gaming",
  "days": 5,
  "correlation": "avg completion fell 4.8 → 2.2"
}
```

- **AI proposes up to two times — then it decides.** The graph is only
  redrawn without asking once the user has been given two chances. False
  positives (a one-off hobby session, a family visit) must be dismissible on
  the first prompt; silent mutation on the *first* mention = surveillance,
  and users abandon apps that judge them autonomously.
- Flow:
  1. **Pattern first appears** — a non-required item (not on the declared task
     list) recurs across consecutive days in commit messages → **prompt 1**:
     *"A rival banner rises — 'late-night gaming' appears in 5 commits and your
     completion is falling. Name it as a branch?"* User may dismiss.
  2. **Pattern persists** → **prompt 2**, final warning: *"This is the second
     time — name it now, or Wyrd will branch it for you."*
  3. **Pattern persists past prompt 2** → no more asking. The drift branch is
     **created automatically**, retroactively, using the pattern the AI already
     extracted from the commit text. Main merges into it as described below.
  4. Once forced or accepted, the drift branch appears **retroactively** over
     those days (dashed, in its own color — not the main trajectory's color).
  5. Keep it going N more days → **main merges INTO the drift branch.** The
     active line continues in the distraction's color.
  6. The **original main runs alongside as a ghost** — faded, dashed, empty
     nodes, advancing daily. The reconciliation target, always visible.
  7. **Counter-merge**: user forks back out; drift curve rejoins the ghost
     line, which solidifies forward. The loop remains in history.
- Making the user *name* the distraction on prompt 1 is half the therapy;
  the forced branch on prompt 2+ is the app refusing to keep pretending
  alongside them.
- **Honesty dependency (a real limitation, not a promise):** this entire
  mechanic reads what the user *chose to write* in commit messages. Wyrd
  cannot fact-check anyone — it can only reflect a person's own words back at
  them. If someone stops mentioning a distraction in their commits, detection
  has nothing to find. This should be stated plainly in-app rather than
  implied as some kind of surveillance the user can't opt out of.

---

## 3. AI Integration (Gemini)

**Provider:** Gemini API free tier (Gemini Flash). Generous daily quota, solid at
summarization + structured output, official SDK, ₹0 for personal-app volume.
Fallbacks: Groq (Llama), OpenRouter free models. Anthropic has no free tier.

**Architecture rule:** all AI calls go through a single `generateText(prompt)` /
`generateJSON(prompt, schema)` wrapper — swapping providers is a one-file change.

Four jobs:

| Job | Trigger | Output |
|---|---|---|
| Drift detection | every commit | structured JSON (see §2.5) |
| Weekly retro | weekly | pattern reflection: "you commit 'tired' every Thursday; exercise misses cluster after late nights" |
| Storyboard generation | on demand / monthly | narrative chapters from a date range of commits — a person's own autobiography, not written after the fact: *"Act 2: The Certification Detour"* |
| Commit message assist | optional, per commit | raw thoughts → conventional-commit format |

---

## 4. Platform & Stack

**Web app as a PWA.** The 9:30 PM commit ritual happens on a phone in bed —
installable icon, offline-capable service worker. Native Android only if the app
proves itself (v1 on Android-first would cost weeks for no benefit).

- **Frontend:** React + TypeScript, Vite, SVG graph renderer (custom — this is the
  hard, portfolio-worthy part)
- **Backend:** Supabase (Postgres + auth + row-level security)
- **AI:** Gemini Flash behind a provider wrapper (key kept server-side via a
  Supabase Edge Function — never in the client bundle)
- **Hosting:** Vercel / Netlify free tier

### 4.1 Data model (v1)

```sql
trajectories ( id, user_id, title, why, status,        -- active | forked | archived
               started_at, ended_at )

branches     ( id, trajectory_id, parent_branch_id, name, color,
               kind,              -- main | side | drift
               merge_condition, status,  -- active | merged | dangling | archived | ghost
               created_at, merged_at )

branch_tasks ( id, branch_id, label, sort_order, active )

commits      ( id, branch_id, date, message,
               tasks_completed, tasks_total, task_states jsonb,
               kind,              -- normal | merge | counter_merge | fork | miss
               created_at )

ai_events    ( id, trajectory_id, kind,  -- drift_proposal | retro | storyboard
               payload jsonb, user_response, created_at )
```

---

## 5. Visual Design (parchment & steel theme)

Parchment background, manuscript typography (Cinzel display / Crimson Pro body),
the trajectory's origin marked with a sword crossguard; current tip glows.

| Element | Rendering | Color |
|---|---|---|
| Main trajectory | solid line, thickens after milestones | royal magenta `#C2185B` |
| Merged branch / milestone | gold curve + diamond node | gold `#B8912F` |
| Active side branch | solid lane above main | teal `#2C7A72` |
| Drift branch | lane below main; dashed pre-confirm, solid post-absorb | crimson `#C93B47` |
| Ghost | dashed at 30% opacity, hollow nodes | `rgba(194,24,91,0.32)` |
| Archived / dangling | grey, faded | parchment-grey |
| Commit node | fill opacity = completion ratio, `x/n` label | branch color |
| Merge / counter-merge | diamond node | gold / magenta |

The at-a-glance payoff: months of consistency read as the line's *brightness*,
without reading a single message.

### 5.1 Single-screen layout (cause and effect, same frame)

Everything lives on **one screen** — no navigating away to see what your commit
did to your trajectory. Three stacked zones on a single scrollable view:

```
┌─────────────────────────────────┐
│                                  │
│         THE GRAPH                │  ← always visible, top of screen
│   (main · branches · ghost)      │     updates the instant you commit
│                                  │
├─────────────────────────────────┤
│  ⚡ A rival banner rises...      │  ← AI insight, inline, right where
│  [ Name it as a branch ]         │     it applies — not a separate tab
├─────────────────────────────────┤
│  Today                           │  ← commit strip, collapses to one
│  ☑ task  ☑ task  ☐ task          │     line once submitted, expands
│  "feat: ..."          [ commit ] │     on tap to edit
└─────────────────────────────────┘
```

- **Cause and effect must share a frame.** You commit at the bottom, the graph
  answers immediately at the top — no page transition, no "check the graph
  later." This is the whole emotional mechanism of the app; splitting it across
  screens (a separate "log" tab, a separate "insights" tab) would kill it.
- Past days are reached by **scrolling/panning the graph itself**, not by
  navigating to a history screen. The graph *is* the history.
- The AI insight banner appears only when there's something to say, and always
  sits between the graph and the commit strip — it explains what just moved.
- On mobile, the commit strip is a bottom sheet: collapsed to a one-line
  status ("4/5 today") by default, expands on tap. The graph keeps most of
  the vertical space at all times.

---

## 6. Build Roadmap

**Phase 1 — the risky part first (1–2 weekends)**
- SVG graph renderer with all states above (a static prototype exists:
  `wyrd-graph-prototype.jsx`)
- If the visual doesn't feel good, nothing else matters.

**Phase 2 — core loop (1–2 weeks)**
- Supabase schema + auth
- Daily commit dialog (multi-branch sections, checkboxes, message)
- Trajectory + branch CRUD, manual merge
- PWA shell (manifest, service worker, installable)

**Phase 3 — honesty mechanics (1 week)**
- Miss detection → ghost fork → 15-day archive flow
- Fork-new-main-from-dead-tip flow

**Phase 4 — AI (1 week)**
- Provider wrapper + Edge Function
- Drift detection with confirm/dismiss UI
- Weekly retro; commit message assist

**Phase 5 — the payoff**
- Storyboard generator (date range → narrated acts, printable)
- Journal search over commit messages

---

## 7. Design Principles (non-negotiables)

1. **History is a record, not a report card.** Misses are commits too; the graph
   never punishes so hard the user quits the app instead of the habit.
2. **AI proposes first, forces only after fair warning.** Every graph change
   from AI requires user confirmation on its first appearance; only after
   two explicit warnings does the app act without asking.
3. **Never hard-delete.** Archive, fade, fork — a life's journal is not `rm -rf`-able.
4. **One dialog a day.** The entire daily cost is ~60 seconds; anything heavier
   kills the ritual.
5. **The ghost is the product.** The line-without-you, running quietly alongside,
   is the single most motivating pixel on screen.
6. **Cause and effect, one screen.** The graph, the commit strip, and the AI
   insight all live in a single view. No tabs, no "check the log later" —
   what you did and what it did to your trajectory are seen together, always.

---

## 8. Voice & Core Messages

Everything the app says traces back to two lines. They aren't a slogan pasted
on a splash screen — they're the two things the app is actually asking of the
person, and each surfaces at the moment it's being tested.

> **Stay true to yourself.** — the ask of *effort*: keep walking the trajectory
> you declared.
>
> **Stay true to keep an accurate history.** — the ask of *honesty*: write what
> actually happened, not what you wish had happened.

Where each shows up:

| Moment | Message does the work of... |
|---|---|
| Onboarding, declaring a trajectory | setting the first line as a promise, not a to-do list |
| Empty/missed day | inviting an honest commit ("nothing done" is still true history) rather than shaming a skip |
| Drift prompt 1–2 | naming a distraction is an act of staying honest, not a confession |
| Forced branch (prompt 2 passed) | stated plainly: the app didn't judge, the pattern was already true in the person's own words |
| Ghost fork / 15-day archive | the ghost is not guilt — it's what an accurate record looks like when a trajectory paused |
| Counter-merge | the loop stays visible on purpose — accurate history includes the recovery, not just the fall |

Tone rules for any copy the app writes (from the interface's own voice, never
a person's voice pretending to be a friend):
- Never apologize on the user's behalf, never congratulate performatively.
- State what happened plainly; let the graph carry the emotional weight, not
  the words next to it.
- Never use the two core messages as a scold. They describe the deal the app
  offers, not a rule the user broke.

> **Note:** the copy above is v1 — a placeholder to build against, not final.
> It will get refined once there's real usage to write against. The north
> star for that refinement: the graph and its storyboard are a person's own
> **autobiography**, written by nothing but honestly showing up, day after
> day. It isn't authored after the fact — it's generated from a life actually
> lived. Every message in the app should earn its place next to that, or get cut.
