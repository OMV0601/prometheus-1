/**
 * GENERATE THE CACHED RUN — scripts/generate-demo.ts
 * ==================================================
 *
 * Runs the real pipeline once against the seeded photosynthesis passage and writes
 * data/demo-run.json plus data/demo-baseline.json. These are what the app replays,
 * with realistic timing, when there is no API key or a live call fails — so the
 * stage demo survives dead wifi. The cached numbers are real, captured numbers.
 *
 * Run:  npm run generate-demo
 */

import { loadEnv } from "../lib/load-env";
loadEnv();

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasApiKey } from "../lib/anthropic";
import { deriveBands } from "../lib/bands";
import { ROSTER, SEED_PASSAGE } from "../lib/demo-data";
import { analyze, generateQuestions, runBand, runBaseline } from "../lib/pipeline";
import type { BandResult, BaselineResult, RunResult } from "../lib/types";

async function main() {
  if (!hasApiKey()) {
    console.error("ANTHROPIC_API_KEY is required to generate the cached run.");
    process.exit(1);
  }

  const started = Date.now();
  const bands = deriveBands(ROSTER);

  console.log("Analyst reading source…");
  const analysis = await analyze(SEED_PASSAGE);
  console.log(`  ${analysis.concepts.length} concepts, ${analysis.protectedTerms.length} terms`);

  const results: BandResult[] = [];
  const baselines: Record<string, BaselineResult> = {};

  for (const band of bands) {
    console.log(`Band ${band.label}…`);
    const result = await runBand(SEED_PASSAGE, band, analysis, () => {});
    results.push(result);
    console.log(
      `  ${result.outcome} in ${result.attempts.length} attempt(s) → FK ${result.final.readability.fleschKincaid.toFixed(
        1,
      )}`,
    );
    baselines[band.id] = await runBaseline(SEED_PASSAGE, band, analysis);
  }

  console.log("Writing comprehension questions…");
  const questions = await generateQuestions(analysis.concepts);

  const run: RunResult = {
    source: SEED_PASSAGE,
    analysis,
    bands: results,
    questions,
    cached: true,
    elapsedMs: Date.now() - started,
  };

  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "demo-run.json"), JSON.stringify(run, null, 2));
  writeFileSync(join(dir, "demo-baseline.json"), JSON.stringify(baselines, null, 2));

  console.log("\nwrote data/demo-run.json and data/demo-baseline.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
