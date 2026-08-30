/**
 * BAND COLUMN — one band's live panel: the readability meter walking toward the
 * band, the running status, and the attempt log beneath it. Three of these sit
 * side by side during a run.
 */

import ReadabilityMeter from "./ReadabilityMeter";
import AttemptLog from "./AttemptLog";
import type { LiveBand } from "./live";

function StatusChip({ band }: { band: LiveBand }) {
  if (band.outcome === "PASS") {
    return (
      <span
        className="label rounded-sm px-2 py-0.5"
        style={{ color: "var(--color-pass)", background: "var(--color-pass-soft)" }}
      >
        In band
      </span>
    );
  }
  if (band.outcome === "ESCALATED") {
    return (
      <span
        className="label rounded-sm px-2 py-0.5"
        style={{ color: "var(--color-fail)", background: "var(--color-fail-soft)" }}
      >
        Escalated to teacher
      </span>
    );
  }
  if (band.pending !== null) {
    return (
      <span className="label" style={{ color: "var(--color-muted)" }}>
        Attempt <span className="num text-ink">{band.pending}</span>
        <span className="ml-1 inline-flex w-4 justify-start">
          <Dots />
        </span>
      </span>
    );
  }
  return <span className="label">Queued</span>;
}

function Dots() {
  return (
    <span aria-hidden className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-[var(--color-faint)]"
          style={{ animation: `pulse 1.1s ${i * 0.18}s infinite` }}
        />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}`}</style>
    </span>
  );
}

export default function BandColumn({ band }: { band: LiveBand }) {
  const history = band.attempts.slice(0, -1).map((a) => a.readability.fleschKincaid);
  return (
    <section className="border border-rule bg-panel p-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-ink">
          {band.band.label}
        </h3>
        <StatusChip band={band} />
      </header>

      <ReadabilityMeter
        target={band.band.target}
        tolerance={band.band.tolerance}
        value={band.currentValue}
        locked={band.locked}
        history={history}
      />

      <AttemptLog attempts={band.attempts} />
    </section>
  );
}
