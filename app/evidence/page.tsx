/**
 * /evidence — the ablation table.
 *
 * Almost no hackathon project reports an evaluation number, and none report a
 * baseline. This page renders data/evidence.json: one prompt vs. the LEXA loop,
 * across the whole corpus, scored by the same Measurer. The numbers are read from
 * disk, never hardcoded here.
 */

import Link from "next/link";
import { loadEvidence } from "@/lib/evidence";
import type { EvidenceRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pass" | "fail";
}) {
  const color =
    tone === "pass" ? "var(--color-pass)" : tone === "fail" ? "var(--color-fail)" : "var(--color-ink)";
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <span className="num text-3xl font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Cell({ inBand, children }: { inBand: boolean; children: React.ReactNode }) {
  return (
    <td
      className="num px-3 py-2.5 text-right"
      style={{ color: inBand ? "var(--color-pass)" : "var(--color-fail)" }}
    >
      {children}
    </td>
  );
}

export default function EvidencePage() {
  const evidence = loadEvidence();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 pb-24">
      <header className="flex items-center justify-between border-b border-rule py-5">
        <Link href="/" className="text-[1.35rem] font-semibold tracking-[0.02em]">
          LEXA
        </Link>
        <Link href="/" className="label hover:text-ink">
          ← Back to the tool
        </Link>
      </header>

      <div className="py-10">
        <span className="label">The ablation</span>
        <h1 className="mt-1 max-w-2xl text-[2rem] font-semibold leading-tight tracking-[-0.01em]">
          One prompt vs. the loop, across {evidence?.passages ?? "the"} passages — same targets,
          same Measurer.
        </h1>
      </div>

      {!evidence ? (
        <div className="border border-rule bg-panel p-8">
          <p className="text-[0.95rem] text-muted">
            No evidence generated yet. Run <span className="num text-ink">npm run evaluate</span> to
            score the corpus and write <span className="num text-ink">data/evidence.json</span>.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-px border border-rule bg-rule md:grid-cols-2">
            <div className="bg-panel p-8">
              <h2 className="mb-6 text-[1.05rem] font-semibold tracking-tight">One prompt</h2>
              <div className="grid grid-cols-3 gap-6">
                <Stat label="In band" value={pct(evidence.oneShot.inBandRate)} tone="fail" />
                <Stat label="Mean error" value={`±${evidence.oneShot.mae.toFixed(2)}`} />
                <Stat label="Concepts kept" value={pct(evidence.oneShot.retentionRate)} />
              </div>
            </div>
            <div className="bg-panel p-8">
              <h2 className="mb-6 text-[1.05rem] font-semibold tracking-tight">The LEXA loop</h2>
              <div className="grid grid-cols-3 gap-6">
                <Stat label="In band" value={pct(evidence.loop.inBandRate)} tone="pass" />
                <Stat label="Mean error" value={`±${evidence.loop.mae.toFixed(2)}`} tone="pass" />
                <Stat label="Concepts kept" value={pct(evidence.loop.retentionRate)} tone="pass" />
              </div>
              <p className="num mt-6 text-[0.8125rem] text-muted">
                {evidence.loop.meanAttempts?.toFixed(1)} mean attempts to convergence · ±
                {evidence.tolerance} tolerance
              </p>
            </div>
          </section>

          <section className="mt-10 overflow-x-auto border border-rule bg-panel">
            <table className="w-full border-collapse text-[0.875rem]">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="px-3 py-3 text-left font-semibold">Passage</th>
                  <th className="label px-3 py-3 text-right">Target</th>
                  <th className="label px-3 py-3 text-right">1-shot grade</th>
                  <th className="label px-3 py-3 text-right">1-shot kept</th>
                  <th className="label px-3 py-3 text-right">Loop grade</th>
                  <th className="label px-3 py-3 text-right">Loop kept</th>
                  <th className="label px-3 py-3 text-right">Tries</th>
                </tr>
              </thead>
              <tbody>
                {evidence.rows.map((r: EvidenceRow) => (
                  <tr key={r.id} className="border-b border-rule last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{r.title}</span>
                      <span className="label ml-2">{r.subject}</span>
                    </td>
                    <td className="num px-3 py-2.5 text-right text-muted">{r.target.toFixed(1)}</td>
                    <Cell inBand={r.oneShot.inBand}>{r.oneShot.grade.toFixed(1)}</Cell>
                    <td className="num px-3 py-2.5 text-right text-muted">
                      {r.oneShot.retained}/{r.oneShot.total}
                    </td>
                    <Cell inBand={r.loop.inBand}>{r.loop.grade.toFixed(1)}</Cell>
                    <td className="num px-3 py-2.5 text-right text-muted">
                      {r.loop.retained}/{r.loop.total}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-muted">{r.loop.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="num mt-4 text-[0.75rem] text-faint">
            Generated {new Date(evidence.generatedAt).toLocaleString()}. Every grade from
            lib/readability.ts. Numbers are whatever the run produced — not hand-picked.
          </p>
        </>
      )}
    </main>
  );
}
