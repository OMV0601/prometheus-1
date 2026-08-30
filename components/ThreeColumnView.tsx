"use client";

/**
 * THREE-COLUMN VIEW — the same passage at three reading levels, side by side.
 *
 * The same concept wears the same tint in every column; hovering a highlight in
 * one raises its counterpart in the others. That is the proof, made visual, that
 * nothing was cut: FIDELITY LOCK 12/12 at the head of each column is a count, not
 * a claim, and the matching highlights let a skeptic check it in three seconds.
 */

import { useState } from "react";
import PassageView from "./PassageView";
import type { Analysis, Attempt, Band, BandOutcome } from "@/lib/types";

export interface Column {
  band: Band;
  outcome: BandOutcome;
  final: Attempt;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="label text-[0.5625rem]">{label}</span>
      <span className="num text-[0.8125rem] text-ink">{value}</span>
    </div>
  );
}

function Lock({ final, outcome }: { final: Attempt; outcome: BandOutcome }) {
  const full = final.audit.retained === final.audit.total && final.termsAllPresent;
  const color = outcome === "PASS" && full ? "var(--color-pass)" : "var(--color-fail)";
  const bg = outcome === "PASS" && full ? "var(--color-pass-soft)" : "var(--color-fail-soft)";
  return (
    <span className="num inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[0.75rem] font-semibold"
      style={{ color, background: bg }}>
      <span className="label text-[0.5625rem]" style={{ color }}>
        Fidelity lock
      </span>
      {final.audit.retained}/{final.audit.total}
    </span>
  );
}

export default function ThreeColumnView({
  columns,
  analysis,
}: {
  columns: Column[];
  analysis: Analysis;
}) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="grid gap-px bg-rule md:grid-cols-3">
      {columns.map((col) => {
        const r = col.final.readability;
        const escalated = col.outcome === "ESCALATED";
        return (
          <article key={col.band.id} className="flex flex-col bg-panel p-6">
            <header className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[0.95rem] font-semibold tracking-tight">{col.band.label}</h3>
                <Lock final={col.final} outcome={col.outcome} />
              </div>
              {escalated && (
                <p className="mt-1.5 text-[0.75rem]" style={{ color: "var(--color-fail)" }}>
                  Closest attempt shown — escalated to teacher after {col.final.n} tries.
                </p>
              )}
              <div className="mt-4 grid grid-cols-4 gap-3 border-y border-rule py-2.5">
                <Metric label="F–K" value={r.fleschKincaid.toFixed(1)} />
                <Metric label="ARI" value={r.ari.toFixed(1)} />
                <Metric label="Dale–Chall" value={r.daleChall.toFixed(1)} />
                <Metric label="Words" value={String(r.words)} />
              </div>
            </header>

            <PassageView
              text={col.final.text}
              checks={col.final.audit.checks}
              terms={analysis.protectedTerms}
              activeConcept={active}
              onHoverConcept={setActive}
              className="flex-1"
            />
          </article>
        );
      })}
    </div>
  );
}
