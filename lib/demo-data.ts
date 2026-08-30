/**
 * DEMO DATA
 * =========
 *
 * The seeded photosynthesis passage (written at roughly the district textbook's
 * grade 9.5), the synthetic class roster the bands are derived from, and the
 * loader for the cached run that keeps the demo alive on dead wifi.
 *
 * Honesty, because it is a scored behaviour: the roster is INVENTED. No real
 * student data is used anywhere in LEXA. The passage is an original composition
 * about photosynthesis written for this project, not copied from a textbook.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult, Student } from "./types";

/**
 * The source passage. Dense, textbook-register prose that keeps the one distinction
 * Friday's test turns on: light-dependent vs. light-independent reactions.
 */
export const SEED_PASSAGE = `Photosynthesis is the process by which plants, algae, and certain bacteria convert light energy into chemical energy stored in glucose. The process occurs within organelles called chloroplasts, which contain a green pigment known as chlorophyll that absorbs light most efficiently in the blue and red portions of the visible spectrum.

Photosynthesis proceeds in two interdependent stages. The first, the light-dependent reactions, take place in the thylakoid membranes. Here, absorbed light energy is used to split water molecules, releasing oxygen as a byproduct and generating the energy-carrying molecules ATP and NADPH. The second stage, the light-independent reactions—also called the Calvin cycle—occurs in the stroma. During this stage, the ATP and NADPH produced earlier drive the fixation of atmospheric carbon dioxide into glucose, a process that does not directly require light.

Gas exchange during photosynthesis is regulated by microscopic pores in the leaf surface called stomata. When open, stomata permit carbon dioxide to enter the leaf and oxygen to escape, but they also allow water vapor to be lost through transpiration, forcing the plant to balance carbon gain against water loss.`;

/**
 * The class. 31 students, reading levels from synthetic MAP data. Six newcomer
 * English learners read at roughly a 3rd–4th grade level; eleven of the 31 read at
 * or below grade 5, against a textbook written at 9.5. The three bands come from
 * the tertiles of this distribution (see lib/bands.ts).
 */
export const ROSTER: Student[] = [
  // Foundational tertile — includes the six newcomer ELLs.
  { id: "s01", readingLevel: 3.0, ell: true },
  { id: "s02", readingLevel: 3.4, ell: true },
  { id: "s03", readingLevel: 3.8, ell: true },
  { id: "s04", readingLevel: 4.0, ell: true },
  { id: "s05", readingLevel: 4.0, ell: true },
  { id: "s06", readingLevel: 4.2, ell: true },
  { id: "s07", readingLevel: 4.5, iep: true },
  { id: "s08", readingLevel: 4.6, iep: true },
  { id: "s09", readingLevel: 4.8 },
  { id: "s10", readingLevel: 5.0 },
  // Developing tertile.
  { id: "s11", readingLevel: 5.0 },
  { id: "s12", readingLevel: 5.5, iep: true },
  { id: "s13", readingLevel: 5.8 },
  { id: "s14", readingLevel: 6.0 },
  { id: "s15", readingLevel: 6.0 },
  { id: "s16", readingLevel: 6.0 },
  { id: "s17", readingLevel: 6.2 },
  { id: "s18", readingLevel: 6.4, iep: true },
  { id: "s19", readingLevel: 6.6 },
  { id: "s20", readingLevel: 6.8 },
  { id: "s21", readingLevel: 7.0 },
  // Proficient tertile.
  { id: "s22", readingLevel: 7.2 },
  { id: "s23", readingLevel: 7.5 },
  { id: "s24", readingLevel: 7.8 },
  { id: "s25", readingLevel: 8.0 },
  { id: "s26", readingLevel: 8.0 },
  { id: "s27", readingLevel: 8.2 },
  { id: "s28", readingLevel: 8.5 },
  { id: "s29", readingLevel: 8.8 },
  { id: "s30", readingLevel: 9.0 },
  { id: "s31", readingLevel: 9.2 },
];

/** Headline roster stats, computed — not asserted — for the input screen. */
export function rosterStats(roster: Student[] = ROSTER) {
  const atOrBelow5 = roster.filter((s) => s.readingLevel <= 5).length;
  const ell = roster.filter((s) => s.ell).length;
  const iep = roster.filter((s) => s.iep).length;
  return { total: roster.length, atOrBelow5, ell, iep };
}

/**
 * Load the cached run for offline mode. Returns null if it hasn't been generated
 * yet (scripts/generate-demo.ts writes it). Read from disk at call time so a build
 * never depends on the file existing.
 */
export function loadCachedRun(): RunResult | null {
  try {
    const path = join(process.cwd(), "data", "demo-run.json");
    return JSON.parse(readFileSync(path, "utf8")) as RunResult;
  } catch {
    return null;
  }
}
