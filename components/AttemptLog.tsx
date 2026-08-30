/**
 * THE ATTEMPT LOG — show the failures.
 *
 * Everyone else hides their retries. Showing them, struck through, with the exact
 * reason each was rejected and the passing attempt in green beneath, is the whole
 * integrity signal. Numbers are monospace because they came from the Measurer.
 */

import type { Attempt } from "@/lib/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export default function AttemptLog({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) return null;
  return (
    <ol className="mt-4 space-y-1.5">
      {attempts.map((a) => (
        <li
          key={a.n}
          className="num flex items-baseline gap-3 text-[0.8125rem] leading-relaxed"
          style={{ color: a.passed ? "var(--color-pass)" : "var(--color-muted)" }}
        >
          <span className="text-faint">{pad(a.n)}</span>
          <span
            className="w-10 shrink-0 font-semibold"
            style={{ color: a.passed ? "var(--color-pass)" : "var(--color-fail)" }}
          >
            {a.readability.fleschKincaid.toFixed(1)}
          </span>
          <span
            className="tracking-wide"
            style={{ textDecoration: a.passed ? "none" : "line-through" }}
          >
            {a.reason}
          </span>
          <span className="ml-auto shrink-0 text-[0.6875rem] uppercase tracking-widest">
            {a.passed ? "pass" : "rejected"}
          </span>
        </li>
      ))}
    </ol>
  );
}
