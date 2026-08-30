/**
 * BANDS
 * =====
 *
 * A band is a reading-level target with a tolerance. LEXA produces one rewrite
 * per band. The three default bands are not invented — they are *derived from the
 * class roster* (see deriveBands), so every number on screen is about real (if
 * synthetic) kids rather than a designer's round number.
 *
 * The tolerance is deliberately tight (±0.5 of a grade). That is not decoration:
 * a loose tolerance would let a first attempt pass, and the whole demo is the
 * measure-and-retry loop. A band you clear on attempt one has nothing to show.
 */

import type { Band, Student } from "./types";

/** The tolerance, in grade levels, applied either side of every target. */
export const TOLERANCE = 0.5;

/**
 * Split the roster into three contiguous reading-level groups and take the median
 * of each as a band target. This is intentionally simple — tertiles, not k-means —
 * because the point is legibility: a skeptic can sort the roster by hand and get
 * the same three numbers.
 */
export function deriveBands(roster: Student[]): Band[] {
  const levels = roster.map((s) => s.readingLevel).sort((a, b) => a - b);
  const n = levels.length;
  const third = Math.floor(n / 3);

  const groups = [
    levels.slice(0, third),
    levels.slice(third, n - third),
    levels.slice(n - third),
  ];

  const labels = ["Foundational", "Developing", "Proficient"];
  const ids = ["low", "mid", "high"];

  return groups.map((group, i) => {
    const target = roundHalf(median(group));
    return {
      id: ids[i],
      label: `${labels[i]} · Grade ${formatGrade(target)}`,
      target,
      tolerance: TOLERANCE,
    };
  });
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Round to the nearest half grade — the granularity teachers actually think in. */
function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function formatGrade(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
