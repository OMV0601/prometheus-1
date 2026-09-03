/**
 * THE AUTO DEMO SCRIPT
 * ====================
 *
 * A two-minute hands-free walkthrough. It exists because the demo is recorded:
 * the two narration tracks are captured separately and cut against this footage
 * afterwards, so the visuals must land on the same timestamp on every take.
 * Nothing here reacts to how fast the machine feels; every beat fires off one
 * clock started at t=0.
 *
 * The two acts map to the two speakers. Act one is the problem and the loop
 * working; act two is the proof. Retune by editing the `at` values below and
 * nothing else: `RUN_WINDOW_MS` and the replay speed derive from them.
 */

export interface Beat {
  /** Milliseconds from the start of the walkthrough. */
  at: number;
  /** What the director does at this moment. */
  action: DemoAction;
  /** Shown in the rehearsal HUD only. Never rendered in a clean take. */
  cue: string;
}

export type DemoAction =
  | { kind: "spotlight"; target: string | null }
  | { kind: "run" }
  | { kind: "scroll"; target: string }
  | { kind: "concept"; index: number | null }
  | { kind: "baseline"; open: boolean }
  | { kind: "end" };

/** Total length of the walkthrough. */
export const DEMO_TOTAL_MS = 120_000;

/** Where the speaker handoff falls. Act two starts here. */
export const DEMO_HANDOFF_MS = 60_000;

/**
 * The natural wall-clock length of the cached replay at speed 1, measured from
 * lib/replay.ts: 500ms meta + 700ms analysis, then per attempt round a 450ms
 * gap, 250ms per band shown, and a 500ms settle. For the captured photosynthesis
 * run (3 bands, attempt counts 3/2/1) that is 5,550ms.
 */
export const REPLAY_NATURAL_MS = 5_550;

/** The run starts here and must still be moving until the handoff. */
export const RUN_STARTS_AT = 16_000;
export const RUN_ENDS_AT = 58_000;
export const RUN_WINDOW_MS = RUN_ENDS_AT - RUN_STARTS_AT;

/**
 * Stretch factor handed to the server. Smaller is slower. Deriving it here means
 * moving RUN_ENDS_AT retimes the replay automatically instead of silently
 * desynchronising the script from the stream.
 */
export const REPLAY_SPEED = REPLAY_NATURAL_MS / RUN_WINDOW_MS;

/**
 * Which concepts to raise in act two, by index into `analysis.concepts`. Six of
 * the twelve, spaced far enough apart in the prose that the highlight visibly
 * jumps around the passage rather than crawling down it.
 */
export const CONCEPT_TOUR = [0, 3, 6, 9, 2, 7];

export const SCRIPT: Beat[] = [
  // ---- Act one: the room, then the loop. ------------------------------------
  { at: 0, action: { kind: "spotlight", target: null }, cue: "Act 1 · open on the idle page" },
  { at: 1_500, action: { kind: "spotlight", target: "roster" }, cue: "31 students, 11 below grade 5" },
  { at: 9_000, action: { kind: "spotlight", target: "bands" }, cue: "three bands, derived from the roster" },
  { at: 13_000, action: { kind: "spotlight", target: "passage" }, cue: "the textbook page, written at 9.5" },
  { at: RUN_STARTS_AT, action: { kind: "run" }, cue: "▶ click Level this passage" },
  { at: 17_000, action: { kind: "spotlight", target: null }, cue: "the panel takes over" },

  // The run occupies 16s–58s. The stream paces itself; nothing to do but let the
  // meters move while the first speaker talks over them.

  // ---- Act two: the proof. -------------------------------------------------
  { at: DEMO_HANDOFF_MS, action: { kind: "scroll", target: "columns" }, cue: "Act 2 · HANDOFF · three levels side by side" },
  { at: 68_000, action: { kind: "concept", index: 0 }, cue: "concept lifts in all three columns" },
  { at: 73_000, action: { kind: "concept", index: 1 }, cue: "concept 2" },
  { at: 78_000, action: { kind: "concept", index: 2 }, cue: "concept 3" },
  { at: 83_000, action: { kind: "concept", index: 3 }, cue: "concept 4" },
  { at: 88_000, action: { kind: "concept", index: 4 }, cue: "concept 5" },
  { at: 93_000, action: { kind: "concept", index: 5 }, cue: "concept 6" },
  { at: 97_500, action: { kind: "concept", index: null }, cue: "release the highlight" },

  { at: 98_000, action: { kind: "scroll", target: "comparison" }, cue: "the hostile question" },
  { at: 100_000, action: { kind: "baseline", open: true }, cue: "▶ expand the baseline" },
  { at: 104_000, action: { kind: "spotlight", target: "oneshot" }, cue: "one prompt: 5.2, kept 8 of 12" },
  { at: 110_000, action: { kind: "spotlight", target: "lexa" }, cue: "LEXA: 4.0, kept 12 of 12" },
  { at: 115_000, action: { kind: "spotlight", target: null }, cue: "settle" },
  { at: 116_000, action: { kind: "scroll", target: "footer" }, cue: "every number came from the code" },
  { at: DEMO_TOTAL_MS, action: { kind: "end" }, cue: "end" },
];

/** mm:ss for the rehearsal HUD. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** The cue that should be showing at time `ms`, for the rehearsal HUD. */
export function cueAt(ms: number): string {
  let current = SCRIPT[0]?.cue ?? "";
  for (const beat of SCRIPT) {
    if (beat.at > ms) break;
    current = beat.cue;
  }
  return current;
}
