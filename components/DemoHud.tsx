"use client";

/**
 * THE REHEARSAL HUD
 * =================
 *
 * Timing aids for the auto demo: elapsed clock, a progress bar, the act you are
 * in, and the current cue. Deliberately OFF by default, because this walkthrough
 * is screen-recorded and anything drawn here is burned into the final video for
 * good. Turn it on to rehearse and to find the exact timestamps to cut narration
 * against; turn it off for the take.
 *
 * The one exception is the abort hint, which is worth having on screen while you
 * are still learning the controls, and vanishes a few seconds in.
 */

import { DEMO_HANDOFF_MS, DEMO_TOTAL_MS, cueAt, formatClock } from "./autoDemo";

export default function DemoHud({ elapsed }: { elapsed: number }) {
  const pct = Math.min(100, (elapsed / DEMO_TOTAL_MS) * 100);
  const handoffPct = (DEMO_HANDOFF_MS / DEMO_TOTAL_MS) * 100;
  const act = elapsed < DEMO_HANDOFF_MS ? 1 : 2;
  const untilHandoff = DEMO_HANDOFF_MS - elapsed;
  const handoffSoon = untilHandoff > 0 && untilHandoff <= 5_000;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="h-[3px] w-full bg-rule">
        <div
          className="h-full transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%`, background: "var(--color-ink)" }}
        />
        {/* Where the second speaker takes over. */}
        <div
          className="relative -mt-[3px] h-[3px] w-px"
          style={{ marginLeft: `${handoffPct}%`, background: "var(--color-fail)" }}
        />
      </div>

      <div className="flex items-center gap-3 px-6 py-2">
        <span className="num text-[0.8125rem] font-semibold tabular-nums">
          {formatClock(elapsed)}
        </span>
        <span
          className="num rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-widest"
          style={{
            color: handoffSoon ? "var(--color-fail)" : "var(--color-muted)",
            background: handoffSoon ? "var(--color-fail-soft)" : "transparent",
          }}
        >
          {handoffSoon ? `handoff in ${Math.ceil(untilHandoff / 1000)}` : `act ${act}`}
        </span>
        <span className="label truncate" style={{ letterSpacing: "0.08em" }}>
          {cueAt(elapsed)}
        </span>
      </div>
    </div>
  );
}
