# LEXA

**Same lesson. Same test. Different reading level.**

It's 8:40 PM on a Wednesday. You have 31 seventh graders in 4th period. Six are
newcomer English learners who read at about a 3rd-grade level. Four have IEPs that
say, in writing, *text at instructional reading level*. Eleven of the 31 read at or
below 5th grade. The district textbook is written at 9.5. Tomorrow is
photosynthesis, and Friday's test is common across all four sections — you didn't
write it and you can't change it.

So you paste the page into ChatGPT and type *"simplify this to a 6th grade reading
level."*

That fails, invisibly, in two ways you have no way to see. A language model cannot
measure its own reading level — ask for grade 6 and you typically get something
that measures 8.5–9, still above eleven of your kids. And to make prose "simpler,"
the model quietly drops the hardest idea in the passage — here, the light-dependent
vs. light-independent reaction distinction — which is exactly what Friday's test
asks about.

**LEXA produces the same passage at multiple reading levels, with the level
measured by deterministic code instead of guessed at by a model, and it refuses to
ship any version that dropped a required concept or a protected term.**

> Hitting a readability target alone is trivial: chop every sentence in half.
> Retaining every concept alone is trivial: copy the text. Doing **both at once**
> is the actual problem, and it is why a single prompt cannot do this.

The reading gets accessible without the science getting easier. Tier-3 vocabulary
(*chloroplast*, *stomata*, *light-dependent reaction*) is preserved and glossed
inline; only the sentences around it get simpler. That is scaffolding, not
simplifying — and the difference is the whole pedagogical claim.

---

## The panel

LEXA is a small org chart. Three of the four roles are language models; the one
that is allowed to declare success is not.

| Role | Model | Job |
|---|---|---|
| **The Analyst** | `claude-sonnet-5` | Reads the source once. Extracts 8–12 atomic, checkable concepts and the protected tier-3 vocabulary. |
| **The Rewriter** | `claude-haiku-4-5` | Produces one candidate at one target band. Called repeatedly, in parallel across bands. Haiku because the loop makes up to 12 calls and the demo must finish fast. |
| **The Measurer** | **not a model** — [`lib/readability.ts`](lib/readability.ts) | The only component permitted to declare success. Pure arithmetic, no network, no randomness. |
| **The Fidelity Auditor** | `claude-sonnet-5` | For each concept, must quote the exact span of the rewrite that carries it. Can't quote ⇒ concept missing ⇒ version rejected. |

The Auditor's quoted spans are exactly what the three-column view highlights: **the
verification *is* the visualization.** One call produces both the audit verdict and
the highlight data.

### The loop

```
analysis = Analyst(source)                 // concepts[], protectedTerms[]

for each band in parallel:
    for attempt in 1..4:
        draft = Rewriter(source, band, analysis, whyLastOneFailed)
        score = Measurer(draft)             // pure TS — Flesch–Kincaid gate
        terms = substring check             // every protected term present?
        audit = FidelityAuditor(draft)      // every concept still quotable?
        if inBand(score) and terms.allPresent and audit.retained == all:
            PASS; break
        else:
            record the specific reason, carry it into the next attempt
    if nothing passed: ESCALATE TO TEACHER  // designed, not a crash
```

The retry carries the failure forward with a number, not a vibe: *"Attempt 2
measured grade 8.6; your sentences average 14 words — make them average about 7."*
That instruction is derived by inverting the Flesch–Kincaid formula at the draft's
own measured syllable density, so the Rewriter gets an exact target instead of
"try harder." A retry that doesn't know why the last one failed is just resampling.

When four attempts miss, the band shows **ESCALATED TO TEACHER** with the closest
attempt and the exact reason. For a passage like photosynthesis, grade 4 is often
unreachable *without cutting a concept* — because "photosynthesis" is a five-syllable
word that can't be made monosyllabic — so LEXA refuses to fake it. Visible refusal
to overclaim is the point, not a bug.

---

## Run it

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local   # optional — see below

npm run test           # 35 tests on the Measurer, the load-bearing component
npm run dev            # http://localhost:3000

npm run generate-demo  # capture a real run into data/demo-run.json (offline mode)
npm run evaluate       # score the corpus → data/evidence.json → /evidence
```

**Offline mode.** With no `ANTHROPIC_API_KEY`, or if any live call fails, LEXA
replays `data/demo-run.json` with realistic per-event timing and shows a `CACHED
RUN` badge. The demo survives dead wifi, and it never pretends cache is live.

---

## The evidence

Almost no hackathon project reports an evaluation number, and none report a
baseline. [`scripts/evaluate.ts`](scripts/evaluate.ts) runs a fixed corpus of ten
passages through **both** the naive one-shot and the LEXA loop, at the same targets,
scored by the same Measurer, and writes [`data/evidence.json`](data/evidence.json),
which `/evidence` renders. The numbers below are whatever the run produced — nothing
is hardcoded, and a real number we didn't like is worth more than a flattering
invented one.

<!-- EVIDENCE -->
_Run `npm run evaluate` to populate this section; the live table is at `/evidence`._
<!-- /EVIDENCE -->

The number that matters most is concept retention: the one-shot silently drops
concepts to chase the reading level; the loop does not, because a dropped concept
fails the Fidelity Auditor and forces a retry.

---

## Data sources — what is real and what is not

Volunteering the fake parts is an integrity signal, so here they are.

| Data | Source | Honesty note |
|---|---|---|
| Dale–Chall familiar list | [`lib/dale-chall-words.ts`](lib/dale-chall-words.ts) | **Abridged** — ~1,000 high-frequency words assembled for this project, not the full licensed Chall & Dale (1995) list of ~3,000. A shorter list marks more words unfamiliar, so our Dale–Chall figures run slightly conservative (harder). This is why Dale–Chall is *reported*, not *gated on*. |
| Sample passages | [`lib/corpus.ts`](lib/corpus.ts), [`lib/demo-data.ts`](lib/demo-data.ts) | Original compositions written for this project. Not copied from any textbook. |
| Class roster | [`lib/demo-data.ts`](lib/demo-data.ts) | **Entirely synthetic.** No real student data is used anywhere in LEXA. The three target bands are the tertile medians of this invented distribution. |
| Grade formulas | [`lib/readability.ts`](lib/readability.ts) | Flesch–Kincaid (Kincaid et al., 1975), ARI (Smith & Senter, 1967), Dale–Chall (Chall & Dale, 1995), Flesch Reading Ease (Flesch, 1948). |

---

## Challenges log — the actual bugs

- **The Measurer shipped with four red tests.** The syllable counter double-counted
  a trailing syllabic `-le`: the silent-`e` rule deliberately keeps the "e" in
  "table"/"needles" so the vowel-group counter already scores it, and a leftover
  `+1` pushed both to 3 syllables. Removed the addition. One ARI test asserted 18
  characters for "Thecatsatonthemat" — it's 17; the *test* was wrong, so we fixed
  the expectation and recomputed ARI to −5.09. And a "fully familiar" Dale–Chall
  test tripped the >5% correction because the word **"on"** was missing from the
  abridged list. Added it.
- **Every band escalated on the first real run.** The Analyst over-extracted (15
  concepts, 13 protected terms). Each polysyllabic protected term that must appear
  verbatim raises the floor on how low Flesch–Kincaid can go, so no band could hit
  its target — the loop was mathematically impossible before the Rewriter even ran.
  Fixed by tightening the Analyst to the 5–8 essential tier-3 terms and capping in
  code.
- **Then the loop lost the ablation.** With a fixed sentence-length budget, several
  corpus passages oscillated or diverged (one hit grade 10.4 targeting 7). The fix:
  make the budget adaptive — invert Flesch–Kincaid at each attempt's *own* measured
  syllable density to hand the Rewriter an exact words-per-sentence target on every
  retry. Convergence went from resampling to a walk.

---

## Known limitations, stated plainly

- **Readability formulas are crude proxies.** Flesch–Kincaid rewards short
  sentences and short words; it does not understand meaning. A crude measurement
  still beats no measurement, and FK is the standard districts and IEP teams are
  already held to. LEXA reports three formulas that disagree rather than hiding
  behind one.
- **The word list is abridged** (see the data table).
- **The Auditor is itself a model.** We mitigate this: a claimed span that is not
  actually a substring of the rewrite is treated as a failed quote (concept marked
  dropped), so an Auditor hallucination becomes a conservative rejection, not a
  false pass. But the Auditor is not infallible.
- **The roster is synthetic.**

---

## Architecture

Next.js 15 (App Router), React 19, TypeScript, Tailwind v4. No database, no auth,
no accounts — seeded JSON and in-memory state only. The streaming route
(`app/api/level`) emits one Server-Sent Event per attempt so the meter ticks move
live. The Anthropic key is read server-side only and never reaches the client
bundle.
