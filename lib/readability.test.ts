/**
 * Tests for THE MEASURER.
 *
 * We test this file and only this file. It is the component whose correctness the
 * entire product claim rests on — "the model proposes, the code disposes" is worth
 * nothing if the code is wrong. Testing the model wrappers would be theatre.
 *
 * Expected values are hand-computed from the published formulas and shown in the
 * comments so a reader can check the arithmetic without trusting us.
 */

import { describe, expect, it } from "vitest";
import {
  checkBand,
  countSyllables,
  gradeLabel,
  isFamiliar,
  measure,
  splitSentences,
  splitWords,
} from "./readability";

describe("splitSentences", () => {
  it("splits on terminal punctuation", () => {
    expect(splitSentences("The sun is hot. Plants need light. Do they?")).toHaveLength(3);
  });

  it("does not split on abbreviations", () => {
    expect(splitSentences("Dr. Chall wrote the formula. It works.")).toHaveLength(2);
  });

  it("does not split on decimals", () => {
    expect(splitSentences("The score was 8.4 for that passage.")).toHaveLength(1);
  });

  it("does not split on single initials", () => {
    expect(splitSentences("J. Chall and E. Dale built it.")).toHaveLength(1);
  });

  it("treats a run of terminators as one boundary", () => {
    expect(splitSentences("Really?! Yes.")).toHaveLength(2);
  });

  it("ignores trailing whitespace and empty fragments", () => {
    expect(splitSentences("One. Two.   ")).toHaveLength(2);
    expect(splitSentences("   ")).toHaveLength(0);
  });
});

describe("splitWords", () => {
  it("counts hyphenated and apostrophised words as one word", () => {
    expect(splitWords("light-dependent reactions don't stop")).toEqual([
      "light-dependent",
      "reactions",
      "don't",
      "stop",
    ]);
  });

  it("drops digits and punctuation", () => {
    expect(splitWords("6 plants, 2 leaves!")).toEqual(["plants", "leaves"]);
  });
});

describe("countSyllables", () => {
  const cases: Array<[string, number]> = [
    ["the", 1],
    ["sun", 1],
    ["water", 2],
    ["sugar", 2],
    ["plant", 1],
    ["energy", 3],
    ["table", 2],
    ["needles", 2],
    ["make", 1],
    ["chloroplast", 3],
  ];

  for (const [word, expected] of cases) {
    it(`counts "${word}" as ${expected}`, () => {
      expect(countSyllables(word)).toBe(expected);
    });
  }

  it("never returns zero for a real word", () => {
    for (const w of ["a", "I", "strengths", "rhythm", "queue"]) {
      expect(countSyllables(w)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("isFamiliar", () => {
  it("accepts base forms on the list", () => {
    expect(isFamiliar("plant")).toBe(true);
    expect(isFamiliar("water")).toBe(true);
  });

  it("accepts regular inflections of listed words", () => {
    // Without inflection handling, every passage reads ~3 grades harder.
    expect(isFamiliar("plants")).toBe(true);
    expect(isFamiliar("growing")).toBe(true);
    expect(isFamiliar("leaves")).toBe(true);
    expect(isFamiliar("running")).toBe(true);
    expect(isFamiliar("carried")).toBe(true);
    expect(isFamiliar("quickly")).toBe(true);
  });

  it("rejects tier-3 academic vocabulary", () => {
    expect(isFamiliar("chloroplast")).toBe(false);
    expect(isFamiliar("photosynthesis")).toBe(false);
    expect(isFamiliar("stomata")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isFamiliar("Water")).toBe(true);
  });
});

describe("measure", () => {
  it("computes Flesch–Kincaid from the published formula", () => {
    // "The cat sat on the mat." → 1 sentence, 6 words.
    // Syllables: the(1) cat(1) sat(1) on(1) the(1) mat(1) = 6
    // FK = 0.39*(6/1) + 11.8*(6/6) - 15.59 = 2.34 + 11.8 - 15.59 = -1.45
    const r = measure("The cat sat on the mat.");
    expect(r.sentences).toBe(1);
    expect(r.words).toBe(6);
    expect(r.syllables).toBe(6);
    expect(r.fleschKincaid).toBeCloseTo(-1.45, 2);
  });

  it("computes ARI from the published formula", () => {
    // "The cat sat on the mat." → the letters "Thecatsatonthemat" are 17, not the
    // 18 an earlier version of this test asserted. ARI counts letters and digits
    // only, so the code's 17 is correct and the expectation was the bug.
    // ARI = 4.71*(17/6) + 0.5*(6/1) - 21.43 = 13.345 + 3 - 21.43 = -5.085, which
    // rounds to -5.09 (the stored value is fractionally below -5.085 in float).
    const r = measure("The cat sat on the mat.");
    expect(r.characters).toBe(17);
    expect(r.ari).toBeCloseTo(-5.09, 2);
  });

  it("scores complex academic prose well above simple prose", () => {
    const hard = measure(
      "Photosynthesis constitutes the biochemical mechanism whereby chloroplast-bearing " +
        "organisms transduce electromagnetic radiation into chemical potential energy, " +
        "subsequently assimilating atmospheric carbon dioxide through enzymatic carboxylation.",
    );
    const easy = measure(
      "Plants use light to make food. The light hits the leaf. The leaf makes sugar. " +
        "The plant uses the sugar to grow.",
    );
    expect(hard.fleschKincaid).toBeGreaterThan(easy.fleschKincaid + 6);
    expect(hard.daleChall).toBeGreaterThan(easy.daleChall);
    expect(hard.ari).toBeGreaterThan(easy.ari);
  });

  it("is deterministic", () => {
    const text = "Plants use light to make food. The leaf makes sugar.";
    expect(measure(text)).toEqual(measure(text));
  });

  it("does not divide by zero on empty input", () => {
    const r = measure("");
    expect(Number.isFinite(r.fleschKincaid)).toBe(true);
    expect(Number.isFinite(r.ari)).toBe(true);
    expect(Number.isFinite(r.daleChall)).toBe(true);
  });

  it("reports the unfamiliar words it found", () => {
    const r = measure("The chloroplast holds green stuff.");
    expect(r.difficultWords).toContain("chloroplast");
    expect(r.difficultWords).not.toContain("green");
  });

  it("applies the Dale–Chall 5% correction only above the threshold", () => {
    // A passage of entirely familiar words gets no +3.6365 adjustment, so it
    // lands far below one that crosses the threshold.
    const familiar = measure("The dog ran to the house. The cat sat on the mat.");
    const unfamiliar = measure(
      "The chloroplast enables photosynthesis. Stomata regulate transpiration rates.",
    );
    expect(familiar.daleChall).toBeLessThan(3.6365);
    expect(unfamiliar.daleChall).toBeGreaterThan(3.6365);
  });
});

describe("checkBand — the gate", () => {
  const band = { id: "core", label: "Grade 8", target: 8, tolerance: 0.5 };

  it("passes a measurement inside the band", () => {
    const verdict = checkBand({ ...measure("x"), fleschKincaid: 8.2 }, band);
    expect(verdict.passed).toBe(true);
    expect(verdict.direction).toBe("in_band");
  });

  it("fails and labels text that is too hard", () => {
    const verdict = checkBand({ ...measure("x"), fleschKincaid: 9.4 }, band);
    expect(verdict.passed).toBe(false);
    expect(verdict.direction).toBe("too_hard");
    expect(verdict.delta).toBeCloseTo(1.4, 2);
  });

  it("fails text that overshot into baby-talk", () => {
    // Overshooting is a failure too. The target is the reading level of the
    // class, not the lowest number reachable.
    const verdict = checkBand({ ...measure("x"), fleschKincaid: 4.1 }, band);
    expect(verdict.passed).toBe(false);
    expect(verdict.direction).toBe("too_easy");
  });

  it("treats the tolerance edge as passing", () => {
    expect(checkBand({ ...measure("x"), fleschKincaid: 8.5 }, band).passed).toBe(true);
    expect(checkBand({ ...measure("x"), fleschKincaid: 8.51 }, band).passed).toBe(false);
  });
});

describe("gradeLabel", () => {
  it("labels grade bands", () => {
    expect(gradeLabel(8.2)).toBe("Grade 8");
    expect(gradeLabel(4.6)).toBe("Grade 5");
    expect(gradeLabel(13.5)).toBe("College");
    expect(gradeLabel(17)).toBe("Graduate");
    expect(gradeLabel(0.4)).toBe("Pre-K");
  });
});
