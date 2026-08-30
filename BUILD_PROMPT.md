# LEXA — build brief

You are building **LEXA**, a hackathon submission due in ~5 hours. Read this whole
file before writing code. It contains the product argument as well as the spec,
because you will make a hundred small judgment calls and they should all be made
in service of the argument.

---

## 1. What LEXA is, and why it exists

**The user.** Ms. Rivera, 7th grade science, Title I middle school, 8:40 PM on a
Wednesday. Her 4th period has 31 students. Six are newcomer ELLs who read English
at roughly a 3rd–4th grade level. Four have IEPs specifying "text at instructional
reading level." Per the fall MAP data, eleven of the 31 read at or below 5th grade.
The district-adopted textbook is written at about grade 9.5. Tomorrow's lesson is
photosynthesis, and Friday's unit test is common across all four 7th-grade
sections — she doesn't write it and can't change it.

**What she does tonight.** She pastes the page into ChatGPT and types "simplify
this to a 6th grade reading level."

**Why that fails, invisibly.** A language model cannot measure its own output. Ask
for grade 6 and you typically get something that measures 8.5–9 — still above
eleven of her kids. Worse, to make prose simpler the model drops the hardest idea
in the passage, which here is the light-dependent vs. light-independent reaction
distinction — exactly what Friday's test asks about. She has no way to detect
either failure. That is the problem LEXA solves.

**What LEXA does.** It produces the same passage at multiple reading levels, with
the level **measured by deterministic code** rather than guessed at by a model, and
it **refuses to ship** any version that dropped a required concept or a protected
vocabulary term.

**The promise, one line:** *Same lesson. Same test. Different reading level.*

This distinction matters and should be visible in the product: "differentiation"
usually degrades into giving struggling kids easier work, which turns a reading gap
into a science gap. LEXA makes the **reading** accessible without making the
**science** easier. Tier-3 academic vocabulary (*chloroplast*, *stomata*,
*light-dependent reaction*) is **preserved and glossed inline**; only the sentence
structure around it gets simpler. That is scaffolding, not simplifying, and the
difference is the whole pedagogical claim.

**The deepest technical claim — put this sentence in the README and the UI:**

> Hitting a readability target alone is trivial: chop every sentence in half.
> Retaining every concept alone is trivial: copy the text. Doing **both at once**
> is the actual problem, and it is why a single prompt cannot do this.

---

## 2. The contest, so you optimise for the right thing

Devpost, ~450 participants. Four criteria, **25 points each**: Educational Impact,
Creative Use of AI/ML, Technical Execution, Pitch & Demo. There is no feasibility
or business criterion — do not build a pricing page, do not write a GTM section.

The submission is a **2-minute screen recording** plus the repo. The video is worth
as much as all the code. Section 8 of this file is the shot list; **treat it as the
acceptance criteria for the build.** If a feature does not appear in those 120
seconds, it is P2.

The field will be roughly 150 AI tutors, 80 quiz generators, 50 summarizers. They
all share one shape: text in, LLM text out, trust us. **LEXA's separation is that
its AI output is graded by code we wrote.** Every design decision should make that
more visible, not less.

---

## 3. Current repo state — read before you start

Already present and working:

- `package.json` — Next 15.5.4, React 19, `@anthropic-ai/sdk`, Tailwind v4,
  Vitest, tsx. **`npm install` has already been run.**
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`
- `.env.local` — contains a real `ANTHROPIC_API_KEY`. **It is gitignored. Never
  commit it, never print it, never inline it into source.**
- `.env.example`
- `lib/readability.ts` — **THE MEASURER.** Pure, no network, no randomness.
  Flesch–Kincaid (the gated metric), ARI (character-based, an independent
  cross-check on the syllable heuristic), Dale–Chall (vocabulary-based), Flesch
  Reading Ease. Also `checkBand()`, which is the single yes/no in the system, and
  `gradeLabel()`.
- `lib/dale-chall-words.ts` — ~1,000-word abridged familiar list, with the
  abridgement disclosed in the file header.
- `lib/readability.test.ts` — 35 tests.

### FIRST TASK: `npx vitest run` — 31 pass, 4 fail. Fix them.

1. **`countSyllables`** — one case expects 2, gets 3. The heuristic's silent-`e`
   and `-le` rules interact badly. Fix the function, not the expectation, unless
   the expectation is genuinely wrong — and if you change an expectation, say so
   in a comment with the reasoning.
2. **ARI character count** — the test expects 18, the code returns 17. **The test
   is wrong.** "Thecatsatonthemat" is 17 letters. Fix the test's expected value
   and recompute the expected ARI (`4.71*(17/6) + 0.5*6 - 21.43`).
3. **Dale–Chall 5% threshold test** — a passage of supposedly all-familiar words
   scores 5.25, meaning something in "The dog ran to the house. The cat sat on the
   mat." is being marked unfamiliar. Diagnose it (log `difficultWords`), then
   either fix `isFamiliar`'s inflection handling or the word list.
4. One further failure not fully captured — run the suite and read it.

**All 35 must pass before you write any UI.** These tests are load-bearing for the
pitch: the claim is "the code is the judge," and a failing judge is worse than no
judge.

---

## 4. Architecture

Next.js 15 App Router, TypeScript, Tailwind v4. Deployed to Vercel. **No database,
no auth, no user accounts.** Seeded JSON and in-memory session state only.

### The panel — name these after human job titles, not functions

This is deliberate. The org chart is part of the pitch; it makes the system legible
in one screenshot. Use these names in the code, the UI, and the README.

| Agent | Model | Job |
|---|---|---|
| **The Analyst** | `claude-sonnet-5` | Reads the source **once**. Extracts the required-concept list (8–14 atomic, checkable propositions) and the protected academic vocabulary — tier-3 terms that must survive into every level. |
| **The Rewriter** | `claude-haiku-4-5-20251001` | Produces one candidate at one target band. Called repeatedly, in parallel across bands. Haiku because the loop makes up to 12 calls and the demo must finish inside ~25 seconds. |
| **The Measurer** | **not a model** — `lib/readability.ts` | The only component permitted to declare success. |
| **The Fidelity Auditor** | `claude-sonnet-5` | For each required concept, must **quote the exact span of the rewrite that carries it**. Cannot quote ⇒ concept missing ⇒ version rejected. |

**Architectural insight worth preserving: the verification *is* the visualization.**
The Auditor's quoted spans are exactly what the three-column view highlights. One
call produces both the audit verdict and the highlight data. Do not add a separate
highlighting pass.

### The loop

```
analysis = Analyst(source)          // { concepts[], protectedTerms[] }

for each band in bands (IN PARALLEL):
    for attempt in 1..4:
        draft = Rewriter(source, band, analysis, previousFailureReason)
        score = Measurer(draft)                      // pure TS
        terms = deterministic substring check         // protected vocab present?
        audit = FidelityAuditor(source, draft, analysis.concepts)

        if checkBand(score, band).passed
           and terms.allPresent
           and audit.retained == concepts.length:
              emit PASS; break
        else:
              emit FAIL with the specific reason; continue

    if no attempt passed:
        emit ESCALATED   // see below
```

**The failure state is designed, not accidental.** If four attempts miss, LEXA
shows **`ESCALATED TO TEACHER`** with the closest attempt and the exact reason it
was rejected. Make this look deliberate and considered on screen — it is the
restraint story, and visible refusal to overclaim is a scored behaviour.

**The retry prompt must carry the specific failure forward.** "Attempt 2 measured
8.6, target 8.0 ± 0.5, too hard — shorten sentences further but do not remove the
concept 'stomata regulate gas exchange'." A retry that doesn't know why the last
one failed is just resampling, and the evidence numbers will show it.

### Files to create

```
lib/anthropic.ts        client, model constants, one retry-with-backoff helper
lib/prompts.ts          all four agent prompts, in one readable file
lib/pipeline.ts         the loop above; emits typed events
lib/types.ts            shared types (Attempt, BandResult, RunEvent, Analysis…)
lib/bands.ts            band definitions + derivation from the class roster
lib/demo-data.ts        seeded photosynthesis passage, roster, cached run

app/api/level/route.ts     streaming (SSE) — emits an event per attempt
app/api/baseline/route.ts  single-shot rewrite, scored by the SAME Measurer
app/api/analyze/route.ts   (optional) Analyst alone, if you want it separate

app/layout.tsx
app/page.tsx            input → run → results
app/evidence/page.tsx   the ablation table
app/print/page.tsx      printable handout
app/globals.css

components/…            see section 6

data/evidence.json      written by scripts/evaluate.ts
data/demo-run.json      cached run for offline mode

scripts/evaluate.ts     runs the corpus, writes data/evidence.json
```

### Reliability — non-negotiable

- **Offline mode.** If `ANTHROPIC_API_KEY` is absent, or any API call fails, replay
  `data/demo-run.json` with realistic per-event timing so it looks live. The demo
  must survive a dead wifi connection on stage. Surface this honestly with a small
  `CACHED RUN` badge — do not pretend it is live.
- Run bands in parallel. Stream events as they happen; never make the user watch a
  blank screen for 20 seconds.
- Set `export const maxDuration = 60` in the streaming route for Vercel.

---

## 5. Model API usage

Use `@anthropic-ai/sdk`. Model IDs exactly: `claude-sonnet-5`,
`claude-haiku-4-5-20251001`.

- Read the key from `process.env.ANTHROPIC_API_KEY`. Server-side only — it must
  never reach the client bundle.
- Force structured output with a **tool definition** (`tools` + `tool_choice`), not
  by asking for JSON in prose. The Analyst and the Auditor both return structured
  data and both must be parsed reliably; prose JSON will fail during the demo.
- Image input: the upload path sends the image as a `base64` image content block
  to `claude-sonnet-5` for transcription. Claude reads images natively — **do not
  add a PDF parser or an OCR library.**
- Wrap every call in one retry with backoff. On second failure, degrade to the
  cached run rather than showing an error screen.

---

## 6. Frontend — this needs to be exceptional

The user has explicitly asked for a standout frontend and dislikes generic AI-app
UI. Judges have seen two hundred purple-gradient chat interfaces this month.

### Register

**Editorial / print**, not SaaS dashboard. The subject matter is a printed
textbook page, so the interface should feel like a well-set document and a
laboratory instrument at the same time.

- **Type:** a serif for passage text (Source Serif 4, Newsreader, or Charter),
  a clean grotesque for UI chrome, and a **monospace for every single number**.
  Numbers in monospace is the whole visual thesis: measured, not vibed.
- **Ground:** warm off-white paper (`#FAF9F6`-ish), ink-black text, **one** accent
  colour used only for state. Suggested: a signal red for FAIL / rejected, a deep
  green for PASS. Nothing else gets colour except concept highlights.
- **Density:** confident and information-dense. Thin rules, generous margins,
  small caps or letterspaced uppercase micro-labels for section headers.

### Forbidden

No gradient hero. No glassmorphism. No floating orbs, blobs, or aurora. No emoji
anywhere in the UI. No rounded-3xl cards with drop shadows. No purple. No "✨".
No animated sparkle icons. No chat bubbles.

### The readability meter — the single most important component

A **thin horizontal band**, not a dial, gauge, or progress ring. Grade levels 0–14
along an axis, the target zone shown as a shaded region, the measured value as a
sharp vertical tick that **animates from the previous attempt's position to the new
one**. When the tick lands inside the shaded zone it snaps to green and locks.

That animation — the tick walking 9.4 → 8.6 → 8.0 and locking — is the money shot
of the entire video. Build it first among the UI pieces, and make it legible at
1080p from across a room.

### The three-column view

- Three columns, side by side, same passage at three levels.
- **The same concept gets the same subtle tinted underline in all three columns.**
  Hovering a highlight in one column highlights its counterpart in the other two.
  This is what proves visually that nothing was cut, without reading a word.
- Protected terms rendered distinctly (small caps, or a dotted underline) with the
  inline gloss visible.
- `FIDELITY LOCK 12/12` in monospace at the head of each column.

### The attempt log

Show the failures. `Attempt 1 · 9.4 · TOO HARD · rejected` in monospace, struck
through or dimmed, with the passing attempt in green beneath. Everyone else hides
their retries; showing them is the integrity signal.

### The Baseline toggle

A hard split-screen: **"One prompt"** vs **"LEXA"**, on the same source passage,
both scored by the same Measurer. The one-shot side shows its measured grade
sitting outside the band and its dropped concepts struck through in red. Label it
plainly: *"This is what a single prompt produces. Same model. No measurement."*

### Motion

Restrained and functional. The tick moving. Attempts appearing in sequence.
Highlights fading in as the Auditor returns them. Nothing decorative, no page
transitions, no parallax.

### Responsiveness

Desktop-first — it is being screen-recorded on a laptop. Make sure it looks correct
at 1440×900 and 1920×1080. Mobile can degrade to stacked columns.

---

## 7. Feature priority

### P0 — appears on camera, must ship
1. Paste-text input **and** image upload (drag-drop a photo of a textbook page).
2. The Analyst's concept + protected-vocabulary extraction.
3. The measure-and-retry loop, 3 bands in parallel, streamed.
4. `lib/readability.ts` with all tests passing.
5. The Fidelity Lock gating output.
6. Attempt log that shows the failed attempts and the reason for each.
7. Three-column view with cross-column concept highlighting.
8. **Baseline toggle.**
9. `/evidence` page with the ablation table.
10. Offline cached-run mode.

### P1 — if the clock allows
11. Class roster (31 seeded students with reading levels) → target bands derived
    from the actual distribution, so the numbers on screen are about real kids.
12. `/print` handout with the **same five comprehension questions** on every level.
13. Inline glossing of protected terms.

### P2 — only if everything above is done and polished
14. `.txt` / `.docx` upload. **Do not build a PDF parser.**

---

## 8. The 2-minute video is the acceptance criteria

Build so that this recording is possible in one take.

| Time | Shot |
|---|---|
| 0:00–0:12 | Hero. Voiceover: *"It's 8:40 PM. 31 seventh graders. Eleven read at a fifth-grade level. The textbook is written at ninth. Friday's test is the same for all of them."* |
| 0:12–0:24 | **Baseline failing.** One-shot "simplify to grade 6" → the Measurer scores it **8.9**, and **4 of 12 concepts gone.** *"This is what she does today. She has no way to know either of those things."* |
| 0:24–0:33 | Photo of a real textbook page dropped in. Bands set from the roster. |
| 0:33–0:56 | **The loop, live.** `9.4 ✗ → 8.6 ✗ → 8.0 ✓`, tick walking into the band. *"The Rewriter is an AI. The Measurer is not — it's forty lines of arithmetic, and it's the only thing allowed to say we succeeded."* |
| 0:56–1:16 | **Three columns.** Matching highlights across all three. `FIDELITY LOCK 12/12`. "chloroplast" present at every level. *"Same lesson. Same test. Different reading level."* |
| 1:16–1:28 | Print view — one handout, three levels, same five questions. |
| 1:28–1:45 | **`/evidence`.** *"Across 30 rewrites: one prompt landed in band 34% of the time. The loop: 100%, ±0.4 grade levels, 97% concept retention."* |
| 1:45–1:53 | The Lock refusing a draft that dropped a concept, and retrying. |
| 1:53–2:00 | Close: *"LEXA rewrites the page until the math says the kid can read it — and proves it didn't cut anything."* |

---

## 9. `scripts/evaluate.ts` — the ablation

This produces the single most differentiating artifact in the submission. Almost no
hackathon project reports an evaluation number at all, and none report a baseline.

- A fixed corpus of ~10 passages across subjects, committed in the repo.
- For each: run **one-shot** ("rewrite this at grade N") and **the LEXA loop**, at
  the same target bands, scored by the same Measurer.
- Report, honestly, whatever comes out: in-band rate, mean absolute error vs.
  target, concept retention rate, mean attempts to convergence, wall-clock time.
- Write `data/evidence.json`. `/evidence` renders it as a table.
- **Do not hardcode the numbers.** If the one-shot baseline turns out to be better
  than expected, report that — a real number you didn't like is worth more than a
  flattering invented one, and a judge who catches a fabricated benchmark is the
  end of the submission.

---

## 10. README and writeup material

Write a real `README.md`. It is a scored artifact.

- Open with the 8:40 PM scene, second person. **Not a market size.**
- A **data-sources table**: the abridged Dale–Chall list and its origin, the sample
  passages and their provenance, and an explicit statement that **the class roster
  is synthetic**. Volunteering what is fake converts your weakest point into an
  integrity signal.
- The architecture diagram / panel table.
- The evidence table with the baseline comparison.
- A genuine **challenges log** — the actual bugs you hit, named, with their fixes.
  Not generic. Specific bugs read as credibility.
- The known limitations, stated plainly: readability formulas are crude proxies;
  the word list is abridged; the Auditor is itself a model; the roster is synthetic.

---

## 11. Hostile questions the product must answer visually

- *"Can't they just use ChatGPT?"* → the Baseline toggle **is** the answer.
- *"Aren't readability formulas crude?"* → yes, and a crude measurement beats no
  measurement. FK is already the standard districts and IEP teams are held to. Show
  three formulas that disagree rather than hiding behind one.
- *"How do you know it didn't drop content?"* → the Auditor quotes the span. `12/12`
  is a count, not a claim, and the highlights let you check it in three seconds.
- *"Why not Newsela?"* → Newsela levels Newsela's library. Her problem is the page
  in the district's adopted textbook, and that page will never be in anyone's
  library. **Library vs. document.**

---

## 12. Working rules

- **Fix the 4 failing tests first.** Nothing else starts until `npx vitest run` is
  green.
- Commit as you go, in working increments. Do not leave the repo broken.
- `npm run build` must pass before you deploy — Next 15 type errors surface at
  build, not in dev.
- Never commit `.env.local`. Never print the key.
- Prefer finishing P0 well over starting P1. A polished, complete P0 beats a
  half-built P1 in every criterion.
- Every number displayed anywhere must come from `lib/readability.ts`. If a model
  ever reports a grade level, that is a bug — the entire product claim depends on
  the model never being the source of a number.
- Do not add a landing page with feature cards, testimonials, or pricing. The app
  opens on the tool.

---

## 13. Deployment

Vercel. `vercel --prod`, or push to GitHub and import. Set `ANTHROPIC_API_KEY` in
the Vercel project's environment variables. Verify the live URL runs the full loop
before recording, and verify the offline fallback by testing with the key removed
locally.

---

## Definition of done

1. `npx vitest run` — all green.
2. `npm run build` — clean.
3. Paste the seeded photosynthesis passage: at least one band **visibly fails an
   attempt** before converging. If it never fails, tighten the tolerance — the
   failure is the demo.
4. Baseline toggle: the one-shot output measurably misses the band and drops at
   least one concept.
5. `npm run evaluate` writes real numbers; `/evidence` renders them.
6. Remove the key from `.env.local`, reload: the cached run replays end to end.
7. Deployed, live URL works, README written.
