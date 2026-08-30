"use client";

/**
 * THE BASELINE TOGGLE — a hard split-screen: "One prompt" vs "LEXA", same source,
 * same target band, both scored by the same Measurer. The one-shot side shows its
 * measured grade sitting outside the band and its dropped concepts struck through.
 * This panel is the visual answer to "can't they just use ChatGPT?"
 */

import { useState } from "react";
import type { Analysis, Attempt, Band, BandOutcome, BaselineResult } from "@/lib/types";

function GradeBadge({
  grade,
  target,
  tolerance,
  passed,
}: {
  grade: number;
  target: number;
  tolerance: number;
  passed: boolean;
}) {
  const color = passed ? "var(--color-pass)" : "var(--color-fail)";
  const bg = passed ? "var(--color-pass-soft)" : "var(--color-fail-soft)";
  return (
    <div className="flex items-baseline gap-2">
      <span className="num text-3xl font-semibold" style={{ color }}>
        {grade.toFixed(1)}
      </span>
      <span
        className="num rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider"
        style={{ color, background: bg }}
      >
        {passed ? "in band" : grade > target ? "too hard" : "too easy"}
      </span>
      <span className="num ml-auto text-[0.75rem] text-muted">
        target {target.toFixed(1)} ±{tolerance}
      </span>
    </div>
  );
}

export default function BaselinePanel({
  source,
  band,
  lexaFinal,
  lexaOutcome,
  analysis,
  cached,
}: {
  source: string;
  band: Band;
  lexaFinal: Attempt;
  lexaOutcome: BandOutcome;
  analysis: Analysis;
  cached: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setOpen(true);
    if (result || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, bandId: band.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as BaselineResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={reveal}
        className="w-full border border-dashed border-rule-strong bg-panel px-6 py-5 text-left transition-colors hover:bg-[#fcfbf8]"
      >
        <span className="label block">The hostile question</span>
        <span className="mt-1 block text-[1.0625rem] font-medium tracking-tight">
          “Can’t she just paste it into ChatGPT?” — show me what one prompt produces.
        </span>
      </button>
    );
  }

  const lexaR = lexaFinal.readability;

  return (
    <div className="border border-rule bg-panel">
      <div className="border-b border-rule px-6 py-3">
        <span className="label">One prompt vs. LEXA — same passage, same Measurer</span>
        {cached && <CachedNote />}
      </div>
      <div className="grid gap-px bg-rule md:grid-cols-2">
        {/* One-shot */}
        <div className="bg-panel p-6">
          <h3 className="mb-1 text-[0.95rem] font-semibold tracking-tight">One prompt</h3>
          <p className="mb-4 text-[0.8125rem] text-muted">
            “Rewrite this at a {Math.round(band.target)}th grade reading level.” Same model. No
            measurement.
          </p>

          {loading && <Skeleton />}
          {error && (
            <p className="num text-[0.8125rem]" style={{ color: "var(--color-fail)" }}>
              {error}
            </p>
          )}
          {result && (
            <>
              <GradeBadge
                grade={result.readability.fleschKincaid}
                target={result.target.target}
                tolerance={result.target.tolerance}
                passed={result.gate.passed}
              />
              <div className="mt-4">
                <span className="label">Concepts dropped</span>
                {result.droppedConcepts.length === 0 ? (
                  <p className="num mt-1 text-[0.8125rem] text-muted">none</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {result.droppedConcepts.map((c) => (
                      <li
                        key={c.id}
                        className="text-[0.8125rem] line-through"
                        style={{ color: "var(--color-fail)" }}
                      >
                        {c.text}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="num mt-3 text-[0.75rem] text-muted">
                  {result.audit.retained}/{result.audit.total} concepts retained
                </p>
              </div>
            </>
          )}
        </div>

        {/* LEXA */}
        <div className="bg-panel p-6">
          <h3 className="mb-1 text-[0.95rem] font-semibold tracking-tight">LEXA</h3>
          <p className="mb-4 text-[0.8125rem] text-muted">
            Measured, retried until in band, audited for every concept.
          </p>

          {lexaOutcome === "PASS" ? (
            <>
              <GradeBadge
                grade={lexaR.fleschKincaid}
                target={band.target}
                tolerance={band.tolerance}
                passed={lexaFinal.gate.passed}
              />
              <div className="mt-4">
                <span className="label">Concepts dropped</span>
                <p className="num mt-1 text-[0.8125rem]" style={{ color: "var(--color-pass)" }}>
                  none — {lexaFinal.audit.retained}/{lexaFinal.audit.total} retained
                </p>
                <p className="num mt-3 text-[0.75rem] text-muted">
                  converged in {lexaFinal.n} attempt{lexaFinal.n === 1 ? "" : "s"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="num text-3xl font-semibold text-ink">
                  {lexaR.fleschKincaid.toFixed(1)}
                </span>
                <span className="num rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink"
                  style={{ background: "var(--color-rule)" }}>
                  escalated
                </span>
                <span className="num ml-auto text-[0.75rem] text-muted">
                  target {band.target.toFixed(1)} ±{band.tolerance}
                </span>
              </div>
              <div className="mt-4">
                <span className="label">Concepts dropped</span>
                <p className="num mt-1 text-[0.8125rem]" style={{ color: "var(--color-pass)" }}>
                  none — {lexaFinal.audit.retained}/{lexaFinal.audit.total} kept
                </p>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
                  LEXA could not reach grade {Math.round(band.target)} without cutting a concept, so
                  it refused to ship — and escalated to the teacher with the closest honest attempt.
                  That refusal is the point.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="border-t border-rule px-6 py-3 text-[0.8125rem] text-muted">
        This is what a single prompt produces. Same model. No measurement.
      </p>
    </div>
  );
}

function CachedNote() {
  return (
    <span className="num ml-2 text-[0.6875rem] uppercase tracking-widest text-muted">
      · cached
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-24 animate-pulse bg-rule" />
      <div className="h-4 w-3/4 animate-pulse bg-rule" />
      <div className="h-4 w-2/3 animate-pulse bg-rule" />
    </div>
  );
}
