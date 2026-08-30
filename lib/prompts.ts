/**
 * THE PROMPTS
 * ===========
 *
 * All four agents' instructions in one readable file, plus the two tool schemas
 * that force the Analyst and the Auditor into structured output. Prose JSON fails
 * live; a tool call does not. The Rewriter alone returns free text, because its
 * output *is* the passage.
 *
 * A design note that matters for the pitch: none of these prompts ever ask a model
 * for a reading grade level. The Rewriter is told the target and asked to write to
 * it; whether it succeeded is decided afterwards by lib/readability.ts. If a prompt
 * here ever asked "what grade is this?", the product claim would be a lie.
 */

import type { Anthropic } from "@anthropic-ai/sdk";
import type { Analysis, Band, Concept, ProtectedTerm } from "./types";

type Tool = Anthropic.Tool;

/* -------------------------------------------------------------------------- */
/* 1. The Analyst                                                             */
/* -------------------------------------------------------------------------- */

export const ANALYST_TOOL: Tool = {
  name: "record_analysis",
  description:
    "Record the required concepts and protected vocabulary extracted from the source passage.",
  input_schema: {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        description:
          "8 to 14 atomic, individually checkable propositions the passage teaches. Each must be a single fact a reader either did or did not receive — not a summary of several.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: 'Sequential id: "c1", "c2", …' },
            text: {
              type: "string",
              description:
                "One testable claim in plain language, e.g. 'Chlorophyll absorbs light energy.'",
            },
          },
          required: ["id", "text"],
        },
      },
      protectedTerms: {
        type: "array",
        description:
          "Tier-3 academic terms that must survive verbatim into every reading level (e.g. chloroplast, stomata, light-dependent reaction). Do NOT include ordinary words. If the passage names something the common assessment could ask about, it belongs here.",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            gloss: {
              type: "string",
              description:
                "A short student-facing definition (≤ 12 words) suitable to show inline next to the term.",
            },
          },
          required: ["term", "gloss"],
        },
      },
    },
    required: ["concepts", "protectedTerms"],
  },
};

export function analystSystem(): string {
  return [
    "You are THE ANALYST on a curriculum team. You read a passage from a science or",
    "social-studies textbook exactly once and extract two things a teacher must not",
    "lose when the passage is rewritten for struggling readers:",
    "",
    "1. The REQUIRED CONCEPTS — 8 to 14 atomic propositions. Atomic means one fact",
    "   each. 'Plants make sugar using light, water, and carbon dioxide' is three",
    "   concepts, not one. Split it. A concept must be something a test question",
    "   could target, and something you could later find (or fail to find) in a",
    "   rewrite as a specific span of text.",
    "",
    "2. The PROTECTED VOCABULARY — the tier-3 academic terms that carry the science",
    "   and that the common end-of-unit test will use by name. These survive into",
    "   every reading level unchanged; only the sentences around them get simpler.",
    "   Ordinary words are not protected terms.",
    "",
    "Return your answer only through the record_analysis tool.",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* 2. The Rewriter                                                            */
/* -------------------------------------------------------------------------- */

export function rewriterSystem(): string {
  return [
    "You are THE REWRITER. You rewrite one textbook passage to one target reading",
    "level, for a specific group of students, without making the science easier.",
    "",
    "The distinction is the whole job:",
    "  • SIMPLER READING: shorter sentences, one idea per sentence, common words for",
    "    ordinary vocabulary, concrete phrasing, active voice.",
    "  • SAME SCIENCE: every required concept stays. Every protected term stays,",
    "    spelled exactly as given, and is glossed inline the first time it appears —",
    "    e.g. 'chloroplast (the part of the cell that traps light)'. You may not",
    "    delete a hard idea to hit the number; that is the one failure that is worse",
    "    than missing the number.",
    "",
    "Reading level is measured after you write, by a fixed formula you cannot see.",
    "Sentence length and syllable count are what move it. To get easier: cut sentence",
    "length hard. To get harder (if you overshot into baby-talk): combine sentences.",
    "",
    "Write only the rewritten passage. No preamble, no notes, no headings, no lists",
    "unless the source had them. Just the passage.",
  ].join("\n");
}

export function rewriterUser(args: {
  source: string;
  band: Band;
  analysis: Analysis;
  previousFailure?: string;
}): string {
  const { source, band, analysis, previousFailure } = args;
  const concepts = analysis.concepts.map((c) => `  - [${c.id}] ${c.text}`).join("\n");
  const terms = analysis.protectedTerms
    .map((t) => `  - ${t.term} — gloss inline as: ${t.gloss}`)
    .join("\n");

  const parts = [
    `TARGET READING LEVEL: US grade ${band.target.toFixed(1)} (±${band.tolerance}).`,
    `Audience: ${band.label} readers.`,
    "",
    "REQUIRED CONCEPTS — every one of these must appear in your rewrite:",
    concepts,
    "",
    "PROTECTED TERMS — keep each exactly, gloss on first use:",
    terms || "  (none)",
  ];

  if (previousFailure) {
    parts.push(
      "",
      "YOUR PREVIOUS ATTEMPT WAS REJECTED. Fix exactly this, change nothing else:",
      previousFailure,
    );
  }

  parts.push("", "SOURCE PASSAGE:", source);
  return parts.join("\n");
}

/* -------------------------------------------------------------------------- */
/* 3. The Fidelity Auditor                                                    */
/* -------------------------------------------------------------------------- */

export const AUDITOR_TOOL: Tool = {
  name: "record_audit",
  description:
    "Record, for each required concept, whether the rewrite still carries it and the exact span that proves it.",
  input_schema: {
    type: "object",
    properties: {
      checks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            conceptId: { type: "string" },
            retained: {
              type: "boolean",
              description:
                "True only if the rewrite genuinely teaches this concept — not merely mentions a related word.",
            },
            span: {
              type: "string",
              description:
                "The exact, verbatim substring of the REWRITE that carries the concept. Must be copied character-for-character so it can be located by string search. Omit only when retained is false.",
            },
          },
          required: ["conceptId", "retained"],
        },
      },
    },
    required: ["checks"],
  },
};

export function auditorSystem(): string {
  return [
    "You are THE FIDELITY AUDITOR. A rewrite is only allowed to ship if it still",
    "teaches every required concept from the source. Your job is not to judge",
    "quality or reading level — only presence.",
    "",
    "For each concept, decide whether the REWRITE carries it, and if so, quote the",
    "EXACT span of the rewrite that proves it. The span must be copied verbatim from",
    "the rewrite, character for character, because it will be located by literal",
    "string search and highlighted for the teacher. A paraphrase is a failure even",
    "if the meaning is right — quote, do not summarise.",
    "",
    "If you cannot find a span that genuinely carries the concept, mark it not",
    "retained and omit the span. Do not be generous: a concept that is only alluded",
    "to, or replaced by a vaguer statement, is not retained. Missing a real drop is",
    "worse than flagging a borderline one.",
    "",
    "Report only through the record_audit tool, one entry per concept.",
  ].join("\n");
}

export function auditorUser(args: {
  rewrite: string;
  concepts: Concept[];
}): string {
  const concepts = args.concepts.map((c) => `[${c.id}] ${c.text}`).join("\n");
  return [
    "REQUIRED CONCEPTS:",
    concepts,
    "",
    "REWRITE TO AUDIT:",
    args.rewrite,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* 4. The Baseline ("what a single prompt does")                             */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately the naive prompt — the thing the teacher actually types tonight.
 * No concept list, no protected terms, no measurement. It exists to be scored by
 * the same Measurer and, usually, to miss.
 */
export function baselineSystem(): string {
  return "You are a helpful assistant that rewrites text for students.";
}

export function baselineUser(source: string, band: Band): string {
  return [
    `Rewrite this passage at a ${Math.round(band.target)}th grade reading level so`,
    "my students can understand it. Just give me the rewritten text.",
    "",
    source,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* 5. Comprehension questions (P1 — the same test on every level)             */
/* -------------------------------------------------------------------------- */

export function questionsSystem(): string {
  return [
    "You write comprehension questions for a common unit test that every student",
    "takes regardless of their reading level. Given the required concepts of a",
    "passage, write exactly five short-answer questions that, together, cover the",
    "most important concepts — including the hardest distinction in the material.",
    "The questions must be answerable from the passage at any reading level.",
    "Return only the five questions, one per line, no numbering, no preamble.",
  ].join("\n");
}

export function questionsUser(concepts: Concept[]): string {
  return ["REQUIRED CONCEPTS:", ...concepts.map((c) => `- ${c.text}`)].join("\n");
}
