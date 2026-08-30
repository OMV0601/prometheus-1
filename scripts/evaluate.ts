/**
 * THE ABLATION — scripts/evaluate.ts
 * ==================================
 *
 * The single most differentiating artifact in the submission. For each passage in
 * the corpus it runs BOTH the naive one-shot and the LEXA loop, at the same target,
 * scored by the SAME Measurer, and writes the honest numbers to data/evidence.json.
 *
 * Nothing here is hardcoded. Whatever the one-shot scores is what gets reported —
 * a real number we didn't like is worth more than a flattering invented one.
 *
 * Run:  npm run evaluate
 */

import { loadEnv } from "../lib/load-env";
loadEnv();

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasApiKey } from "../lib/anthropic";
import { TOLERANCE } from "../lib/bands";
import { CORPUS } from "../lib/corpus";
import { analyze, runBaseline, runBand } from "../lib/pipeline";
import type { Band, Evidence, EvidenceRow } from "../lib/types";

async function main() {
  if (!hasApiKey()) {
    console.error("ANTHROPIC_API_KEY is required to run the evaluation.");
    process.exit(1);
  }

  const rows: EvidenceRow[] = [];

  for (const p of CORPUS) {
    const band: Band = {
      id: `t${p.target}`,
      label: `Grade ${p.target}`,
      target: p.target,
      tolerance: TOLERANCE,
    };
    process.stdout.write(`· ${p.id.padEnd(24)} target ${p.target}  `);

    const analysis = await analyze(p.text);
    const baseline = await runBaseline(p.text, band, analysis);
    const loop = await runBand(p.text, band, analysis, () => {});

    rows.push({
      id: p.id,
      subject: p.subject,
      title: p.title,
      target: p.target,
      oneShot: {
        grade: baseline.readability.fleschKincaid,
        inBand: baseline.gate.passed,
        retained: baseline.audit.retained,
        total: baseline.audit.total,
      },
      loop: {
        grade: loop.final.readability.fleschKincaid,
        inBand: loop.final.gate.passed,
        attempts: loop.attempts.length,
        retained: loop.final.audit.retained,
        total: loop.final.audit.total,
        outcome: loop.outcome,
      },
    });

    console.log(
      `one-shot ${baseline.readability.fleschKincaid.toFixed(1)} ${
        baseline.gate.passed ? "IN" : "OUT"
      } | loop ${loop.final.readability.fleschKincaid.toFixed(1)} ${
        loop.final.gate.passed ? "IN" : "OUT"
      } (${loop.attempts.length} tries)`,
    );
  }

  const evidence: Evidence = {
    generatedAt: new Date().toISOString(),
    tolerance: TOLERANCE,
    passages: rows.length,
    oneShot: {
      inBandRate: mean(rows.map((r) => (r.oneShot.inBand ? 1 : 0))),
      mae: mean(rows.map((r) => Math.abs(r.oneShot.grade - r.target))),
      retentionRate:
        sum(rows.map((r) => r.oneShot.retained)) / sum(rows.map((r) => r.oneShot.total)),
    },
    loop: {
      inBandRate: mean(rows.map((r) => (r.loop.inBand ? 1 : 0))),
      mae: mean(rows.map((r) => Math.abs(r.loop.grade - r.target))),
      retentionRate: sum(rows.map((r) => r.loop.retained)) / sum(rows.map((r) => r.loop.total)),
      meanAttempts: mean(rows.map((r) => r.loop.attempts)),
    },
    rows,
  };

  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "evidence.json"), JSON.stringify(evidence, null, 2));

  console.log("\n— summary —");
  console.log(
    `one-shot: ${(evidence.oneShot.inBandRate * 100).toFixed(0)}% in band, MAE ${evidence.oneShot.mae.toFixed(
      2,
    )}, ${(evidence.oneShot.retentionRate * 100).toFixed(0)}% concepts retained`,
  );
  console.log(
    `loop:     ${(evidence.loop.inBandRate * 100).toFixed(0)}% in band, MAE ${evidence.loop.mae.toFixed(
      2,
    )}, ${(evidence.loop.retentionRate * 100).toFixed(0)}% concepts retained, ${evidence.loop.meanAttempts?.toFixed(
      1,
    )} mean attempts`,
  );
  console.log("\nwrote data/evidence.json");
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
