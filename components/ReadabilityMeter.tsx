/**
 * THE READABILITY METER — the single most important component.
 *
 * A thin horizontal band, not a dial. Grade levels 0–14 along an axis, the target
 * zone a shaded region, and the measured value a sharp vertical tick that walks
 * from the previous attempt's position to the new one (CSS transition on `left`)
 * and snaps green + locks when it lands inside the zone.
 *
 * That walk — 9.4 → 8.6 → 8.0, locking — is the money shot of the video, so the
 * numbers are large monospace and the tick is heavy enough to read at 1080p from
 * across a room. Every number here is passed in from lib/readability.ts; this
 * component computes no grade of its own.
 */

const MIN = 0;
const MAX = 14;
const AXIS = [0, 2, 4, 6, 8, 10, 12, 14];

function pct(value: number): number {
  const clamped = Math.max(MIN, Math.min(MAX, value));
  return ((clamped - MIN) / (MAX - MIN)) * 100;
}

export interface ReadabilityMeterProps {
  target: number;
  tolerance: number;
  /** The current measured Flesch–Kincaid grade, or null before the first attempt. */
  value: number | null;
  /** True once an attempt has landed inside the band; turns the tick green + locks. */
  locked: boolean;
  /** Grades of earlier attempts, left behind as faint marks to show the walk. */
  history?: number[];
}

export default function ReadabilityMeter({
  target,
  tolerance,
  value,
  locked,
  history = [],
}: ReadabilityMeterProps) {
  const zoneLeft = pct(target - tolerance);
  const zoneWidth = pct(target + tolerance) - zoneLeft;
  const hasValue = value !== null;

  return (
    <div className="select-none">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Flesch–Kincaid grade</span>
        <span className="num text-[0.8125rem] text-muted">
          target <span className="text-ink">{target.toFixed(1)}</span> ±{tolerance}
        </span>
      </div>

      {/* The band. Extra top margin leaves clear air for the value bubble, which
          floats above the tick and would otherwise collide with the label row. */}
      <div className="relative mt-9 h-14">
        {/* baseline track */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-rule-strong)]" />

        {/* target zone */}
        <div
          className="absolute top-1/2 h-8 -translate-y-1/2 border-x"
          style={{
            left: `${zoneLeft}%`,
            width: `${zoneWidth}%`,
            background: locked ? "var(--color-pass-soft)" : "var(--color-target)",
            borderColor: locked ? "var(--color-pass)" : "var(--color-rule-strong)",
          }}
        />

        {/* faint marks for previous attempts */}
        {history.map((h, i) => (
          <div
            key={i}
            className="absolute top-1/2 h-6 w-px -translate-y-1/2 bg-[var(--color-faint)]"
            style={{ left: `${pct(h)}%` }}
            title={`attempt ${i + 1}: ${h.toFixed(1)}`}
          />
        ))}

        {/* the live measured tick */}
        {hasValue && (
          <div
            className="absolute top-0 h-full"
            style={{
              left: `${pct(value)}%`,
              transition: "left 750ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* value bubble */}
            <div
              className="num absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap px-1 text-[1.375rem] font-semibold leading-none"
              style={{ color: locked ? "var(--color-pass)" : "var(--color-fail)" }}
            >
              {value.toFixed(1)}
            </div>
            {/* the tick itself */}
            <div
              key={locked ? "locked" : "live"}
              className="absolute top-1/2 h-11 w-[3px] -translate-x-1/2 -translate-y-1/2"
              style={{
                background: locked ? "var(--color-pass)" : "var(--color-fail)",
                animation: locked ? "tick-lock 420ms ease-out" : undefined,
              }}
            />
          </div>
        )}
      </div>

      {/* axis */}
      <div className="relative mt-1 h-4">
        {AXIS.map((g) => (
          <span
            key={g}
            className="num absolute -translate-x-1/2 text-[0.6875rem] text-faint"
            style={{ left: `${pct(g)}%` }}
          >
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}
