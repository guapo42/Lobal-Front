# The External Lobe — Implementation Plan (Rebuild)

A plan to rebuild from [`REQUIREMENTS.md`](./REQUIREMENTS.md) with **frequent
user testing** as the organizing principle. The prior prototype optimized for
building mechanisms; this plan optimizes for *learning per week*.

---

## 0. Key Recommendations (read first)

1. **Don't write app code for two weeks.** Run discovery (§2, Phase 0) to kill or confirm the riskiest assumptions with a diary study and paper/Figma tests. The prototype spent ~7,000 LOC never learning whether capture friction was the real problem.
2. **Ship the thinnest closed loop first** — *capture → task → see it on today → start → resume* — and use it daily before adding any behavioral intervention. The prototype never closed this loop.
3. **Treat every behavioral feature as an experiment**: opt-in, feature-flagged, configurable threshold, instrumented, with a pre-registered metric and a kill criterion.
4. **Instrument from day one.** Local, consented telemetry (time-to-capture, tab switches, resumption lag, starts/abandons). You cannot run experiments on `console.log`.
5. **Keep "variations" as a method, not a codebase.** Build alternates as cheap flagged components; A/B by alternating days or users; delete the losers.
6. **Accessibility and reduced-motion are v1 requirements**, not polish. The target audience is sensory-sensitive; the prototype shipped a permanent 60 bpm animation with no off switch and 1/33 labeled components.
7. **Put the LLM behind a port with a deterministic fake.** Validate the *need* with Wizard-of-Oz before paying for Ollama/cloud integration.
8. **Carry forward the three good architectural ideas**: pure FSM reducer, schema-validated AI boundary, energy-weighted ICNU ranking — each as a tested pure module.
9. **Make thresholds settings.** Every "10 / 15 / 20 / 30 minutes" becomes a config value with a default and a UI, and overrides are logged as signal.
10. **Decide Q1–Q7** (Requirements §9) before Phase 1. Q1 (n=1 vs cohort) alone changes the testing plan.

---

## 1. Operating Model: Build → Measure → Learn, weekly

```
 Mon            Tue–Thu              Fri
 ┌──────────┐   ┌───────────────┐   ┌──────────────────────┐
 │ Pick 1   │ → │ Build smallest │ → │ Test with users      │
 │ riskiest │   │ thing that can │   │ (or self), review    │
 │ assumption│  │ falsify it     │   │ metrics, decide:     │
 └──────────┘   └───────────────┘   │ keep / tweak / kill  │
                                    └──────────────────────┘
```

- **Cadence:** one experiment per week; one user-testing session per week (self-dogfooding daily if n = 1; 3–5 participants if cohort).
- **Pre-registration:** before building, write the hypothesis, metric, success threshold, and kill criterion in `docs/experiments/EXP-###.md`.
- **Definition of Done for a feature** = shipped behind a flag + instrumented + tested with users + decision recorded. Code that's "done" but untested with users is *not done*.

---

## 2. Phases

### Phase 0 — Discovery (Weeks 1–2, no app code)

**Goal:** confirm the beachhead and kill bad assumptions before they cost code.

| Activity | Validates | Output |
|---|---|---|
| **Lost-thought diary** (7 days): every time a thought is lost or nearly lost, log *what, where, device, why*. | A1, A7 | Where capture must live; whether friction or recall is the issue |
| **Resumption log** (7 days): after each interruption, note time-to-productive. | P5 size | Baseline resumption lag |
| **Time-blindness probe:** 3× daily, guess "how long until my next commitment?" then check. | P2 size | Baseline error |
| **Paper/Figma test of time views** (radial vs. list vs. linear) with the *real* day; task: "when's your next free hour?" | A2 | Pick one view for v1 |
| **Wizard-of-Oz structuring:** hand-structure 20 raw captures into tasks; ask whether it helped. | A6 | LLM core or optional |
| **Autonomy interview** (self or 3 users): show the Activation Bridge concept; ask how a forced lock would feel. | A3, Q5 | Opt-in design constraints |

**Gate:** written answers to Q1–Q7 and a chosen beachhead (recommended: P1 + P5).

### Phase 1 — Walking Skeleton (Weeks 3–4)

**Goal:** the closed loop the prototype never had, used daily.

Scope (FR-1 … FR-7):
- Task CRUD (title, time, duration, ICNU) · one capture box (Cmd-K) with `time_to_capture_ms` · capture → task conversion · one time view (from Phase 0) · active/done with visual decay · local persistence with schema versioning · local telemetry store + export.

Engineering (see §4): ports/adapters skeleton, `safeStorage`, migrations, flag system, telemetry module, a11y baseline, reduced-motion baseline, CI.

**User test (end of week 4):** 5 days of real use. Metrics: captures/day, median time-to-capture, % captures converted, days-used. **Kill criterion:** if the builder doesn't use it ≥ 4/5 days, stop and revisit Q4.

### Phase 2 — First Behavioral Experiments (Weeks 5–8, one per week)

All opt-in, flagged, configurable, instrumented.

| Week | Experiment | Metric | Kill if |
|---|---|---|---|
| 5 | **Resumption Card** (absence threshold configurable, default 10 min) | resumption lag vs. Phase 1 baseline | no improvement or users dismiss > 80 % |
| 6 | **Energy slider + ICNU ranking** | slider usage rate; agreement with user's manual reorder | used < 30 % of days |
| 7 | **Activation Bridge** (opt-in lock, 3 micro-steps) | starts/selected; felt autonomy (1–5) | autonomy < 3 or starts don't rise |
| 8 | **Focus Lens + Visual decay tuning** | focus-session length; qualitative | — |

### Phase 3 — Time & Focus Variants (Weeks 9–12)

- Alternate time views behind flags; A/B by alternating days.
- Body Double nudge, Anti-Paralysis overlay, Focus Ember — each a one-week experiment with the same template.
- Voice capture if A7 shows phone/hands-busy capture matters (PWA on mobile).

### Phase 4 — Assisted Structuring (only if A6 confirmed)

- LLM adapter (local-first, cloud with PII scrub) behind the port; schema validator + type guards as the hard gate; heuristic parser remains the fallback and the test fake.
- Experiment: LLM-parsed vs. heuristic-parsed captures — edit distance to the user's final task; acceptance rate.

### Phase 5 — Second Brain (only with evidence)

- Start with plain search over captures/tasks. Only build a graph if users ask for associative links *and* keep adding content.

---

## 3. User-Testing Protocol

**If n = 1 (dogfood):**
- Daily use is the test. Keep a 2-minute end-of-day log: what helped, what annoyed, what you turned off.
- Weekly metrics review from the telemetry export. Alternate-day A/B for variants (odd days A, even days B).
- Beware: you built it; novelty and sunk cost bias you. Pre-registered kill criteria are the defense.

**If cohort (3–5 participants, recurring):**
- Recruit people who self-identify with P1–P5; consent to local telemetry export.
- **Session script (45 min, weekly):** 5 min warm-up → 20 min task-based use of this week's feature (think-aloud) → 10 min metric walkthrough from their export → 10 min "what would you turn off?"
- Rotate variants across participants; never ship a coercive feature on by default.

**Always measure:** the §8 metrics in Requirements, plus *days used per week* — the only metric that ultimately matters.

---

## 4. Engineering Practices

**Architecture**
- **Ports & adapters.** Pure domain (tasks, captures, FSM, ICNU, validation) has no React/DOM/time imports. Adapters: storage, clock, telemetry, LLM, speech. Every adapter has a deterministic fake used in tests.
- **Inject time and randomness.** No `Date.now()` in domain code; pass a `Clock`.
- **One store per concern** (tasks/captures · cognitive state/FSM · settings/flags · telemetry). The prototype's four overlapping stores caused confusion.
- **Persisted state is versioned** with explicit migrations; a test asserts every schema change has one.
- **Feature flags + settings** are the same system: flags expose experiments; settings expose thresholds; both persisted; overrides are telemetry events.

**Quality**
- **TDD for domain code** (near-100 % branch coverage: ICNU, FSM, validator, scrubber, geometry, migrations). Component tests for interactions and a11y; a few Playwright flows for the closed loop.
- **CI on every push:** typecheck · lint · unit · component · build · `axe` a11y check. No `as unknown as`, no `any`, no `window.__globals` (all were present in the prototype).
- **Performance budgets:** interaction < 100 ms; any `requestAnimationFrame` loop must halt when settled/hidden/off-screen (prototype burned CPU continuously).

**Accessibility & motion (v1, not later)**
- WCAG 2.2 AA; keyboard-complete; ARIA on interactive SVG; urgency conveyed by color **and** text/weight.
- `prefers-reduced-motion` respected globally; looping animations off by default with a settings toggle.

**Privacy & telemetry**
- Telemetry is local, consented, exportable, inspectable. Event schema versioned. Nothing leaves the device without an explicit action.
- PII scrubber (with the spaced-card regex fixed) runs before any cloud call; local LLM preferred.

**Repository hygiene**
- Keep the page/container components thin; presentational components dumb; demo/fixture data in one module.
- `docs/experiments/` holds one file per experiment (hypothesis → metric → result → decision). This becomes the product's memory.

---

## 5. Milestone Checklist

- [ ] **M0 Decisions:** Q1–Q7 answered in `docs/DECISIONS.md`; beachhead chosen.
- [ ] **M0 Discovery:** diary + logs complete; time-view chosen; A1/A2/A3/A6/A7 each marked confirmed/killed.
- [ ] **M1 Skeleton:** closed loop live; telemetry exporting; a11y + reduced-motion baseline; CI green; 5-day use test passed.
- [ ] **M2 Experiments ×4:** each with a pre-registered doc and a recorded decision.
- [ ] **M3 Variants:** at least one A/B completed and a loser deleted.
- [ ] **M4 (conditional):** LLM adapter only if A6 confirmed.
- [ ] **M5 (conditional):** search before graph.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Building before validating (again) | Phase 0 is mandatory; no app code until Q1–Q7 are written down |
| Builder bias (n = 1) | Pre-registered metrics + kill criteria; alternate-day A/B |
| Coercive features cause abandonment | Opt-in, one-click escape, autonomy question in every test |
| Sensory overload from animation | Reduced-motion default; loops off by default |
| LLM dependency drag | Port + fake; Phase 4 conditional on A6 |
| Threshold guesses | All configurable; overrides logged |
| State-shape churn breaks persisted data | Versioned migrations with tests |
| Scope creep toward "second brain" | Phase 5 conditional on evidence; search first |

---

## 7. Technical Carry-Overs From the Prototype

Worth reusing as *reference* (re-implement test-first, don't copy):
- ICNU energy-weight matrix and `focusScore` formula (Requirements §6; exact values in the old `SPECIFICATION.md` on branch `claude/external-lobe-frontend-5JdcO`).
- FSM transition table (7 states) — simplify to what v1 needs (IDLE / CAPTURE / INITIATION / FOCUS / BREAK).
- Schema validator + Known-Tools registry + runtime type guards at the AI boundary.
- PII scrubber patterns.
- SVG dial geometry helpers.

Known defects to not repeat: unsafe casts at the LLM boundary, `window` globals for cross-component callbacks, unguarded `localStorage`, never-settling rAF loops, demo data duplicated in four files, a 450-line page component, console-only metrics, no a11y, no reduced motion, no migrations, and — above all — a dial that never showed a real task.
