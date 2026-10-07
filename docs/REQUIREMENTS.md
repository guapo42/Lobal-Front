# The External Lobe — Requirements Document

**Status:** Learnings extracted from a brainstorm prototype (Apr–Jun 2026). The
prototype is being retired. **Nothing in it was user-tested.** Every requirement
below is therefore a *hypothesis* unless marked otherwise, and the primary job
of the rebuild is to validate them cheaply before investing.

Related: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Prior prototype
code lives on branches `claude/external-lobe-frontend-5JdcO` and
`claude/triple-engine-ecosystem` (reference only; do not build on it).

---

## 0. Executive Summary

**The thesis:** a productivity tool for professionals with ADHD-type executive
dysfunction should optimize for *state of mind*, not *to-do lists*. It should
(1) capture thoughts with near-zero friction, (2) make time physically visible,
(3) lower the activation energy to start, (4) protect focus, and (5) restore
context after interruption.

**What the brainstorm taught us (the hard way):**

| Learning | Evidence |
|---|---|
| We built mechanisms, not a product. ~7,000 LOC, 33 components, 9 UI variations, a 3-engine LLM architecture — and **no way for a user to create a real task.** `addTask` and the capture→task pipeline were never wired to the UI; the dial only ever showed demo data. | `git grep addTask(` / `executePipeline(` → zero UI callers |
| Behavioral interventions were parameterized by guesses. 17 hard-coded timing thresholds (10, 15, 20, 25, 30 min…) with no basis beyond intuition. | grep of `* 60_000` |
| We ignored the people the app is for. 1 of 33 components had an ARIA label; zero reduced-motion support despite shipping a permanent 60 bpm "breathing" animation to a sensory-sensitive audience. | grep `aria-label`, `reduced-motion` |
| Exploring variations was the best idea in the brainstorm — the `/explore` dashboard that A/B'd 3 capture × 3 time × 3 knowledge UIs. **Keep the method, not the code.** | — |
| The LLM layer is a large dependency (local Ollama install) built before proving users want auto-structuring at all. | — |
| Good bones emerged late: a pure FSM, a schema "hallucination filter," ICNU scoring, local-first stores, and a test suite (90 tests) — all added only during the review phase. | — |

**The ask for the rebuild:** validate the riskiest assumptions with real usage
in weeks, not months; ship the thinnest closed loop first; make every
behavioral threshold measurable and tunable; design for accessibility and
autonomy from day one.

---

## 1. Target User & Context

**Primary persona (hypothesis):** a high-functioning professional (often a
technical/knowledge worker) with ADHD or executive-function challenges who:
- has high-value thoughts that evaporate if not captured within seconds;
- experiences *time blindness* (can't feel how far away a deadline is);
- hits a "Wall of Awful" starting tasks they know how to do;
- loses an hour to a tab switch; and
- takes a long time to reload context after any interruption.

**Open question Q1 — who is the user, really?**
If this is **n = 1 (you)**, the plan is dogfooding + self-measurement. If it's a
**cohort**, you need recruiting, consent, and a different testing cadence. This
single answer changes the plan more than any other. *(See §9.)*

---

## 2. Problem Statements (hypotheses with validation plan)

Each problem is stated as the brainstorm framed it, followed by what we'd need
to see to believe it's worth solving in software.

### P1 — Capture friction / object permanence
*"If I can't record it in < 3 s, it's gone."*
- **Proposed:** one-keystroke overlay, voice-to-text, command-line prefixes, click-anywhere canvas.
- **Risky assumptions:** that friction, not forgetting-to-capture, is the bottleneck; that voice is faster than typing in practice; that a *desktop web* overlay is where the thought strikes (vs. phone, shower, meeting).
- **Validate:** 1-week diary: log every lost thought and *where you were*. Measure time-to-capture with the simplest possible text box.

### P2 — Time blindness
*"I can't perceive upcoming deadlines or free time."*
- **Proposed:** 24-h radial dial with hatched past, urgency-colored wedges, breathing "now" marker; alternatives: linear flow, stacked blocks.
- **Risky assumptions:** that a radial clock is more legible than a calendar; that color-coded urgency changes behavior; that the breathing animation anchors rather than distracts.
- **Validate:** show each variant with *the user's real day*; ask "when is your next free hour?" and time the answer; ask what the animation feels like after 10 minutes.

### P3 — Task initiation ("Wall of Awful")
*"I know what to do and still can't start."*
- **Proposed:** Activation Bridge — lock the UI to 3 micro-steps (< 2 min each) before unlocking the task; Anti-Paralysis overlay after 20 min stuck; Micro-Action lists (LLM or template).
- **Risky assumptions:** that *locking* the UI feels supportive rather than patronizing; that 3 is the right number; that 20 min is the right trigger; that generic micro-steps ("open the file") help more than they annoy.
- **Validate:** opt-in bridge for 1 week; count starts-with vs. starts-without; interview on felt autonomy.

### P4 — Sustaining focus
*"A tab switch becomes an hour on something else."*
- **Proposed:** Body Double nudge on tab return; Focus Lens (Z key dims everything); Focus Ember (streak of focus minutes); Detail Scents (blurred, click-to-reveal context to prevent link-hopping).
- **Risky assumptions:** that gentle nudges change behavior at all; that gamified minutes motivate rather than shame; that blur-to-reveal is a feature and not a bug.
- **Validate:** instrument tab-switch count/duration with and without nudges; A/B over alternating days.

### P5 — Resumption lag
*"After an interruption, I spend 10 minutes figuring out where I was."*
- **Proposed:** Resumption Card after 10-min absence (last text, active task, open loops); 15-min "mental snapshot" breadcrumbs; Undo Timeline for rabbit-hole recovery.
- **Risky assumptions:** that the saved context is the *right* context; that the user wants a modal on return; that 10 min is the threshold.
- **Validate:** measure time-from-return-to-first-productive-action with/without the card.

### P6 — Associative recall ("second brain")
*"I find things by association, not hierarchy."*
- **Proposed:** force-directed knowledge graph with recency/frequency sizing; alternatives: split-screen editor+graph, infinite canvas, terminal query.
- **Risky assumptions:** that users will *put things in* the graph (every PKM tool's graveyard); that a visual graph beats search.
- **Validate:** defer. This is the largest surface with the weakest evidence. Test the *need* with plain search first.

---

## 3. Functional Requirements (prioritized for v1)

**MUST (closed loop — the prototype never had this)**
- FR-1 Create a task with title, optional start time, duration, and ICNU scores. Edit and delete it.
- FR-2 Capture a free-text thought in one action; stamp `captured_at` and `time_to_capture_ms`.
- FR-3 Convert a capture into a task (manually; LLM optional later).
- FR-4 See today's tasks on **one** time visualization with past/now/future clearly distinguished.
- FR-5 Mark a task active / done; see "done" tasks fade rather than vanish.
- FR-6 Persist everything locally; survive reload; work offline.
- FR-7 Record friction/usage metrics locally (see NFR-7).

**SHOULD (first behavioral experiments — all opt-in, all tunable)**
- FR-8 Energy/dopamine self-report (1–5) that re-ranks tasks via ICNU weights.
- FR-9 Activation Bridge (micro-steps before focus) as a toggle.
- FR-10 Resumption Card on return after a configurable absence.
- FR-11 Focus Lens (dim non-focus UI) via keyboard.

**COULD (after SHOULD items show signal)**
- FR-12 Body Double nudge; Focus Ember; Anti-Paralysis overlay.
- FR-13 Voice capture (Web Speech) with graceful absence.
- FR-14 Alternate time visualizations behind a flag for A/B.
- FR-15 LLM-assisted intent parsing and micro-action generation behind an adapter with deterministic fallback.

**WON'T (v1)**
- Knowledge graph / second brain surfaces (P6) — validate need first.
- Cloud sync, accounts, multi-device.
- Native iOS (haptics, Action Button, Live Activities) — see Q2.
- Morning "Airlock" lockout — too coercive to ship untested; prototype as opt-in experiment only.

---

## 4. Non-Functional Requirements

| ID | Requirement | Rationale from brainstorm |
|---|---|---|
| NFR-1 | Interaction latency < 100 ms; capture end-to-end < 3 s | Core thesis; measured in prototype via console only |
| NFR-2 | Local-first; no feature blocks on network or LLM | Correct call; keep |
| NFR-3 | **Accessibility:** WCAG 2.2 AA; keyboard-complete; ARIA on all interactive SVG; never color-only for urgency | Prototype: 1/33 components labeled |
| NFR-4 | **Honor `prefers-reduced-motion`**; all looping animations have an off switch | 60 bpm breathing shipped with no opt-out |
| NFR-5 | Every behavioral threshold (absence, stuck, snapshot, decay) is **configuration, not a constant**, with sane defaults and a settings UI | 17 hard-coded guesses |
| NFR-6 | Coercive features (UI lock, lockout, nudges) are opt-in with an always-visible escape | Autonomy; see Q5 |
| NFR-7 | Local telemetry of friction & behavior metrics (time-to-capture, tab-switch count, resumption lag, starts/abandons), exportable, never sent anywhere without consent | Needed to run every experiment in §2 |
| NFR-8 | Privacy: data stays on device by default; PII scrubbing before any cloud LLM call | Scrubber existed; keep the idea |
| NFR-9 | Storage robustness: all persistence through a guarded wrapper (quota, disabled storage, corrupt data, SSR); schema versioning + migrations for persisted state | Prototype crashed paths were unguarded; shape changed 4× with no migration |
| NFR-10 | Graceful degradation when browser APIs are absent (Speech, AudioContext, IntersectionObserver) | — |

---

## 5. Design Principles That Survived

1. **Zero-friction input** — but measure it; don't assume.
2. **State-of-mind over to-do** — energy-aware ranking is the most original idea; keep it, validate the weights.
3. **Deterministic gate for AI** — the LLM suggests, code commits, every output schema-validated. (This is the one architectural idea worth carrying forward intact.)
4. **Calm, peripheral cues** — urgency as color/weight, not alarms. Add: *and always optional.*
5. **Variations as a method** — build cheap alternates behind flags; let usage decide.
6. **New:** **Autonomy first** — the app proposes, never forces. Every intervention is reversible in one action.

---

## 6. Mechanism Catalogue & Verdicts

| Mechanism | Area | Verdict | Why |
|---|---|---|---|
| Text capture box w/ timestamp + friction metric | P1 | **Keep (v1)** | Smallest valuable thing |
| Cmd-K modal | P1 | Keep (v1) | Cheap, familiar |
| Command-line `/task` prefixes | P1 | Test later | Power-user; unclear demand |
| Gesture canvas | P1 | Drop | Novelty; no evidence |
| Voice capture | P1 | Test later | Browser support uneven; validate speed claim |
| Morning Airlock lockout | P1 | **Experiment only, opt-in** | High backfire risk |
| Radial 24-h dial | P2 | Keep (v1, simplified) | Most distinctive; needs legibility test |
| Linear flow / stacked blocks | P2 | Flagged alternates | A/B fodder |
| Breathing "now" @ 60 bpm | P2 | Keep **off by default** | Sensory risk |
| Urgency color scale | P2 | Keep + pair with text/weight | Color-only is inaccessible |
| ICNU scores + energy weights | P3/P2 | **Keep; treat weights as tunable hypotheses** | Core differentiator |
| Energy slider (self-report) | P3 | Keep; measure whether it gets used | Self-report may itself be friction |
| Activation Bridge (UI lock + 3 micro-steps) | P3 | Keep as opt-in experiment | Strongest behavioral bet; test autonomy |
| Anti-Paralysis overlay (20 min) | P3 | Test later | Depends on bridge signal |
| Micro-action list (template) | P3 | Keep (template first) | LLM version later |
| Body Double nudge | P4 | Test later | Cheap once telemetry exists |
| Focus Lens (Z) | P4 | Keep (v1) | Cheap, reversible |
| Focus Ember streak | P4 | Test later | Gamification can shame |
| Detail Scents (blurred context) | P4 | Drop for now | Depends on P6 |
| Resumption Card | P5 | Keep (v1, configurable) | Direct hit on a real pain |
| Mental snapshots (15 min) | P5 | Test later | Needs real content, not "Working on: X" |
| Undo timeline | P5 | Drop for now | Never connected to real edits |
| Visual decay of done tasks | P5 | Keep (v1) | Cheap "wins" record |
| Knowledge graph + variants | P6 | **Defer** | Biggest surface, least evidence |
| FSM (7 cognitive states) | infra | Keep (simplify to what v1 needs) | Pure, testable |
| Schema validator / type guards | infra | Keep | The AI gate |
| PII scrubber | infra | Keep (fix spaced-card regex) | Needed before any cloud LLM |
| LLM client (Ollama/cloud) | infra | Behind an adapter; v1 uses the fake | Don't pay the dependency before the need is proven |
| Perf logging to console | infra | Replace with real local telemetry | Can't run experiments on console.log |

---

## 7. Risky Assumptions Register

| # | Assumption | Impact if wrong | Cheapest test |
|---|---|---|---|
| A1 | Capture friction is the bottleneck (not remembering to open the app) | Whole P1 surface is moot | 1-week lost-thought diary |
| A2 | A radial clock beats a list/calendar for time blindness | P2 centerpiece is wrong | 5-user legibility task with real schedule |
| A3 | Users will tolerate/benefit from UI locking | Bridge feels coercive; churn | Opt-in week; autonomy interview |
| A4 | Self-reported energy is low-friction and honest | Ranking is noise | Usage rate of the slider; compare to time-of-day heuristic |
| A5 | The ICNU weight matrix is roughly right | Wrong task surfaces first | Let users reorder; log disagreements |
| A6 | Auto-structuring (LLM) is wanted | Big dependency for nothing | Wizard-of-Oz: hand-structure 20 captures; ask if it helped |
| A7 | Desktop web is where capture happens | Need mobile first | Diary: where were you when the thought struck? |
| A8 | Timing thresholds (10/15/20/30 min) are sensible | Nudges fire at wrong moments | Make configurable; log overrides |
| A9 | Animation anchors attention | It distracts/overwhelms | Reduced-motion default + ask |
| A10 | People will populate a knowledge graph | Dead feature | Defer; test with search first |

---

## 8. Success Metrics (define before building)

- **Capture:** median `time_to_capture_ms`; captures/day; % captures later converted to tasks.
- **Time:** time-to-answer "next free hour"; self-reported deadline surprise (weekly 1–5).
- **Initiation:** tasks started / tasks selected; median time in "initiation" before focus.
- **Focus:** tab-switches per focus hour; focus-session median length.
- **Resumption:** time from return to first edit/action.
- **Retention (the real one):** days-used per week after 4 weeks. If it's < 4 for the builder, nothing else matters.

---

## 9. Key Questions (decide before Phase 1)

1. **Q1 — Who is the user?** n = 1 dogfood vs. recruited cohort. Determines testing plan, consent, and telemetry design.
2. **Q2 — Platform.** Web/PWA first (fast, testable) or native iOS (haptics, Action Button, Live Activity were in the vision but nothing was built). *Recommendation: PWA, mobile-capable, now; native later only if A7 says capture happens on phone.*
3. **Q3 — Is the LLM core or optional?** *Recommendation: optional in v1 behind an adapter; validate A6 with Wizard-of-Oz first.*
4. **Q4 — Beachhead problem.** Which of P1–P5 do we commit to winning first? *Recommendation: P1 + P5 (capture → resume) — smallest closed loop, highest claimed pain.*
5. **Q5 — How much coercion is acceptable?** UI locks, lockouts, nudges. *Recommendation: default to autonomy; every intervention opt-in with one-click escape; measure, don't assume.*
6. **Q6 — Privacy posture.** Local-only forever, or eventual sync? Affects data model and telemetry consent now.
7. **Q7 — What does "it worked" mean?** Pick 2–3 metrics from §8 as the north star before writing code.

---

## 10. Out of Scope (v1)

Accounts/sync, multi-user, native mobile, knowledge graph, calendar integration,
notifications outside the app, any cloud LLM without explicit opt-in.
