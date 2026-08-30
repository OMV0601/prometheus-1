/**
 * THE MEASURER
 * ============
 *
 * This file is the only component in LEXA permitted to decide whether a rewrite
 * succeeded. It contains no model calls, no network, no randomness, and imports
 * nothing but a static word list. Given the same string it returns the same
 * numbers forever.
 *
 * That property is the entire product. A language model cannot measure its own
 * output — ask one for "a 6th grade version" and you get something that reads at
 * 8.9, with no way for the teacher to know. So the model proposes and this file
 * disposes.
 *
 * Three formulas run on every passage, deliberately chosen because they disagree
 * about what makes text hard, and because they take *different inputs*:
 *
 *   Flesch–Kincaid   syllables  →  the primary gate
 *   ARI              characters →  an independent cross-check on the syllable
 *                                  heuristic, which is the softest part of this file
 *   Dale–Chall       vocabulary →  catches text that is syntactically simple but
 *                                  lexically brutal ("The mitochondrion is big.")
 *
 * We gate on Flesch–Kincaid because it is the measure US districts, publishers and
 * IEP teams are already held to. The other two are reported so a skeptic can see
 * where they diverge.
 */

import { DALE_CHALL_FAMILIAR } from "./dale-chall-words";

export interface Readability {
  /** Flesch–Kincaid grade level. The gated metric. */
  fleschKincaid: number;
  /** Automated Readability Index. Character-based, so independent of syllables. */
  ari: number;
  /** New Dale–Chall adjusted grade level. Vocabulary-based. */
  daleChall: number;
  /** Flesch Reading Ease, 0–100. Reported for familiarity, not gated on. */
  readingEase: number;
  sentences: number;
  words: number;
  syllables: number;
  characters: number;
  /** Words absent from the Dale–Chall familiar list, deduped and lowercased. */
  difficultWords: string[];
  /** Mean words per sentence. */
  avgSentenceLength: number;
  /** Mean syllables per word. */
  avgSyllablesPerWord: number;
}

/** A target reading band: a grade level with a tolerance either side. */
export interface Band {
  id: string;
  label: string;
  target: number;
  tolerance: number;
}

/* -------------------------------------------------------------------------- */
/* Tokenisation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Split into sentences. Terminators are . ! ? and newlines, but we refuse to
 * break on a period that follows a known abbreviation or a single capital
 * (initials), because a false sentence break inflates every score at once.
 */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e",
  "fig", "approx", "no", "vol", "ch", "pp", "al", "inc", "ltd", "co", "dept",
]);

export function splitSentences(text: string): string[] {
  const normalised = text.replace(/\s+/g, " ").trim();
  if (!normalised) return [];

  const out: string[] = [];
  let current = "";

  const chars = [...normalised];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    current += ch;

    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    // Consume a run of terminators, e.g. "?!" or "..."
    while (i + 1 < chars.length && /[.!?]/.test(chars[i + 1])) {
      current += chars[++i];
    }
    // A terminator not followed by whitespace is not a sentence end (3.14, U.S.A)
    if (i + 1 < chars.length && !/\s/.test(chars[i + 1])) continue;

    if (ch === ".") {
      const lastToken = current.trim().split(/\s+/).pop() ?? "";
      const bare = lastToken.replace(/[^A-Za-z.]/g, "").replace(/\.$/, "").toLowerCase();
      // "Dr." or a lone initial "J." — not a sentence boundary.
      if (ABBREVIATIONS.has(bare) || /^[a-z]$/.test(bare)) continue;
    }

    out.push(current.trim());
    current = "";
  }

  if (current.trim()) out.push(current.trim());
  return out.filter((s) => /[A-Za-z0-9]/.test(s));
}

/** Words are alphabetic runs; internal apostrophes and hyphens are kept. */
export function splitWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g) ?? []).filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Syllables                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Heuristic syllable count. English orthography does not permit an exact
 * algorithm without a pronunciation dictionary, so this is the acknowledged
 * approximation inside every implementation of Flesch–Kincaid in existence.
 * ARI exists in this file specifically so its error is visible rather than
 * silently absorbed into the gate.
 */
export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;

  // Silent trailing e ("make"), but not "-le" after a consonant ("table").
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  w = w.replace(/^y/, "");

  // A syllabic "-le" after a consonant ("ta-ble", "need-les") keeps its own vowel
  // group because the silent-e rule above deliberately never strips it: the guard
  // [^laeiouy]e requires the letter before the final "e" to be a vowel or "l", so
  // "le" survives and the counter below already scores its "e". An extra +1 here —
  // as an earlier version had — double-counts it and pushes "table" to 3. So there
  // is nothing to add: the vowel-group count is the answer.
  const groups = w.match(/[aeiouy]{1,2}/g);
  const count = groups ? groups.length : 0;

  return Math.max(1, count);
}

/* -------------------------------------------------------------------------- */
/* Dale–Chall                                                                 */
/* -------------------------------------------------------------------------- */

const SUFFIX_RULES: Array<[RegExp, string[]]> = [
  [/ies$/, ["y"]],
  [/es$/, ["", "e"]],
  [/s$/, [""]],
  [/ing$/, ["", "e"]],
  [/ied$/, ["y"]],
  [/ed$/, ["", "e"]],
  [/er$/, ["", "e"]],
  [/est$/, ["", "e"]],
  [/ly$/, [""]],
];

/**
 * Dale–Chall counts a word as familiar if the word *or a regular inflection of
 * it* is on the list. Without this, "plants" and "growing" score as difficult
 * and every passage reads three grades harder than it is.
 */
export function isFamiliar(word: string): boolean {
  const w = word.toLowerCase().replace(/[’']/g, "'");
  if (DALE_CHALL_FAMILIAR.has(w)) return true;
  const stripped = w.replace(/'s$/, "");
  if (DALE_CHALL_FAMILIAR.has(stripped)) return true;

  for (const [pattern, replacements] of SUFFIX_RULES) {
    if (!pattern.test(stripped)) continue;
    for (const replacement of replacements) {
      const candidate = stripped.replace(pattern, replacement);
      if (candidate.length >= 2 && DALE_CHALL_FAMILIAR.has(candidate)) return true;
      // Undo consonant doubling: "running" → "runn" → "run"
      if (/([bdfglmnprt])\1$/.test(candidate)) {
        const undoubled = candidate.slice(0, -1);
        if (DALE_CHALL_FAMILIAR.has(undoubled)) return true;
      }
    }
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* The measurement                                                            */
/* -------------------------------------------------------------------------- */

export function measure(text: string): Readability {
  const sentenceList = splitSentences(text);
  const wordList = splitWords(text);

  const sentences = Math.max(1, sentenceList.length);
  const words = Math.max(1, wordList.length);

  let syllables = 0;
  for (const w of wordList) syllables += countSyllables(w);

  // ARI counts letters and digits only — not spaces or punctuation.
  const characters = (text.match(/[A-Za-z0-9]/g) ?? []).length;

  const difficultSet = new Set<string>();
  let difficultCount = 0;
  for (const w of wordList) {
    if (!isFamiliar(w)) {
      difficultCount++;
      difficultSet.add(w);
    }
  }

  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  // Flesch–Kincaid Grade Level (Kincaid et al., 1975)
  const fleschKincaid = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  // Flesch Reading Ease (Flesch, 1948)
  const readingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  // Automated Readability Index (Smith & Senter, 1967)
  const ari = 4.71 * (characters / words) + 0.5 * avgSentenceLength - 21.43;

  // New Dale–Chall (Chall & Dale, 1995). The +3.6365 correction applies only
  // when more than 5% of words are unfamiliar.
  const pdw = (difficultCount / words) * 100;
  let daleChall = 0.1579 * pdw + 0.0496 * avgSentenceLength;
  if (pdw > 5) daleChall += 3.6365;

  return {
    fleschKincaid: round2(fleschKincaid),
    ari: round2(ari),
    daleChall: round2(daleChall),
    readingEase: round2(readingEase),
    sentences,
    words,
    syllables,
    characters,
    difficultWords: [...difficultSet].sort(),
    avgSentenceLength: round2(avgSentenceLength),
    avgSyllablesPerWord: round2(avgSyllablesPerWord),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* The gate                                                                   */
/* -------------------------------------------------------------------------- */

export interface BandVerdict {
  passed: boolean;
  measured: number;
  target: number;
  tolerance: number;
  /** Signed distance from target. Negative = too easy, positive = too hard. */
  delta: number;
  direction: "too_hard" | "too_easy" | "in_band";
}

/**
 * The single yes/no in the system. Everything upstream is a proposal; this is
 * the verdict. Note it can say "too easy" — a rewrite that overshoots into
 * baby-talk has also failed, because the point is the reading level of the class,
 * not the lowest possible number.
 */
export function checkBand(readability: Readability, band: Band): BandVerdict {
  const measured = readability.fleschKincaid;
  const delta = round2(measured - band.target);
  const passed = Math.abs(delta) <= band.tolerance;
  return {
    passed,
    measured,
    target: band.target,
    tolerance: band.tolerance,
    delta,
    direction: passed ? "in_band" : delta > 0 ? "too_hard" : "too_easy",
  };
}

/** Human-readable grade label, e.g. 8.2 → "Grade 8". */
export function gradeLabel(grade: number): string {
  if (grade < 1) return "Pre-K";
  if (grade >= 16) return "Graduate";
  if (grade >= 13) return "College";
  return `Grade ${Math.round(grade)}`;
}
