/** Client-side live state for one band as its attempts stream in. */

import type { Attempt, Band, BandOutcome } from "@/lib/types";

export interface LiveBand {
  band: Band;
  attempts: Attempt[];
  /** Current meter position — the Flesch–Kincaid grade of the latest attempt. */
  currentValue: number | null;
  /** True once an attempt landed in band; the tick turns green and locks. */
  locked: boolean;
  /** The attempt number currently being computed, or null when idle. */
  pending: number | null;
  outcome?: BandOutcome;
  final?: Attempt;
}

export function initLiveBand(band: Band): LiveBand {
  return { band, attempts: [], currentValue: null, locked: false, pending: null };
}
