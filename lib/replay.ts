/**
 * CACHED-RUN REPLAY
 * =================
 *
 * When there is no API key, or a live call fails, we replay a previously captured
 * run with realistic per-event timing so the demo looks live on a dead connection.
 * We never pretend it is live: the meta event carries cached:true, and the UI shows
 * a CACHED RUN badge.
 *
 * The replay interleaves the bands the way the live parallel run does — attempt 1
 * of every band, then attempt 2 of every band — so the meter ticks move together,
 * exactly as they would on stage.
 */

import type { RunEvent, RunResult } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Replay a captured run through `emit`, pacing it like a live run. */
export async function replayRun(
  run: RunResult,
  emit: (event: RunEvent) => void,
  { speed = 1 }: { speed?: number } = {},
): Promise<void> {
  const t0 = Date.now();
  const pause = (ms: number) => sleep(ms / speed);

  emit({ type: "meta", bands: run.bands.map((b) => b.band), cached: true, source: run.source });
  await pause(500);

  emit({ type: "analysis", analysis: run.analysis });
  await pause(700);

  const maxAttempts = Math.max(...run.bands.map((b) => b.attempts.length));
  for (let i = 0; i < maxAttempts; i++) {
    for (const band of run.bands) {
      const attempt = band.attempts[i];
      if (!attempt) continue;
      emit({ type: "attempt-start", bandId: band.band.id, n: attempt.n });
    }
    await pause(450);
    for (const band of run.bands) {
      const attempt = band.attempts[i];
      if (!attempt) continue;
      emit({ type: "attempt", bandId: band.band.id, attempt });
      await pause(250);
      // Close a band as soon as its last attempt has been shown.
      if (i === band.attempts.length - 1) {
        emit({ type: "band-done", bandId: band.band.id, result: band });
      }
    }
    await pause(500);
  }

  emit({ type: "done", elapsedMs: Date.now() - t0 });
}
