/**
 * SHARED TYPES
 * ============
 *
 * The vocabulary of the whole system in one place. Read this file and you know
 * the shape of everything that flows between the four agents, the pipeline, the
 * API routes and the UI.
 *
 * One rule governs every type here: a grade level or any other number is only
 * ever produced by lib/readability.ts. No field on any of these types is ever
 * populated by a model's opinion of a reading level. The models return prose and
 * structured claims about *concepts*; the arithmetic is ours.
 */

import type { Band, BandVerdict, Readability } from "./readability";

export type { Band, BandVerdict, Readability } from "./readability";

/* -------------------------------------------------------------------------- */
/* The Analyst's output                                                       */
/* -------------------------------------------------------------------------- */

/** One atomic, checkable proposition the source text teaches. */
export interface Concept {
  /** Stable id, "c1".."c14", used to line up audits and highlights. */
  id: string;
  /** A single testable claim, e.g. "Chlorophyll absorbs light energy." */
  text: string;
}

/** A tier-3 academic term that must survive into every reading level. */
export interface ProtectedTerm {
  /** The term exactly as it must appear, e.g. "chloroplast". */
  term: string;
  /** A short, kid-facing gloss shown inline. Never gated on — it is a courtesy. */
  gloss: string;
}

/** The Analyst reads the source once and returns this. */
export interface Analysis {
  concepts: Concept[];
  protectedTerms: ProtectedTerm[];
}

/* -------------------------------------------------------------------------- */
/* The Fidelity Auditor's output                                              */
/* -------------------------------------------------------------------------- */

/**
 * The Auditor's verdict on a single concept. `span` is the exact substring of
 * the rewrite that carries the concept — this is both the proof and the highlight
 * data. If the Auditor cannot quote a span, the concept is gone.
 */
export interface ConceptCheck {
  conceptId: string;
  retained: boolean;
  /** Verbatim span from the rewrite. Null when the concept was dropped. */
  span: string | null;
}

export interface Audit {
  checks: ConceptCheck[];
  /** Count of concepts the Auditor could locate in the rewrite. */
  retained: number;
  /** Total concepts required — equal to analysis.concepts.length. */
  total: number;
}

/* -------------------------------------------------------------------------- */
/* Deterministic protected-term check                                         */
/* -------------------------------------------------------------------------- */

export interface TermCheck {
  term: string;
  present: boolean;
}

/* -------------------------------------------------------------------------- */
/* One attempt at one band                                                    */
/* -------------------------------------------------------------------------- */

/** Why an attempt was rejected. Carried into the next retry prompt verbatim. */
export type RejectionKind =
  | "too_hard"
  | "too_easy"
  | "dropped_term"
  | "dropped_concept";

export interface Attempt {
  /** 1-based attempt number within its band. */
  n: number;
  text: string;
  /** Every number on screen for this attempt comes from here. */
  readability: Readability;
  /** The Flesch–Kincaid gate result. */
  gate: BandVerdict;
  terms: TermCheck[];
  termsAllPresent: boolean;
  audit: Audit;
  /** True only if the gate passed AND all terms present AND all concepts retained. */
  passed: boolean;
  /** Empty when passed. Otherwise the specific, actionable reason. */
  rejections: RejectionKind[];
  /** One human-readable sentence for the attempt log, e.g. "TOO HARD". */
  reason: string;
}

/* -------------------------------------------------------------------------- */
/* One band's result                                                          */
/* -------------------------------------------------------------------------- */

export type BandOutcome = "PASS" | "ESCALATED";

export interface BandResult {
  band: Band;
  attempts: Attempt[];
  outcome: BandOutcome;
  /** The passing attempt, or — when escalated — the closest one we reached. */
  final: Attempt;
}

/* -------------------------------------------------------------------------- */
/* A whole run                                                                */
/* -------------------------------------------------------------------------- */

export interface RunResult {
  source: string;
  analysis: Analysis;
  bands: BandResult[];
  /** Five comprehension questions — the SAME on every level. Optional. */
  questions?: string[];
  /** True when this run was replayed from cache rather than freshly computed. */
  cached: boolean;
  elapsedMs: number;
}

/* -------------------------------------------------------------------------- */
/* The single-prompt baseline                                                 */
/* -------------------------------------------------------------------------- */

/**
 * What "just ask ChatGPT to simplify it" produces, scored by the *same* Measurer
 * against the *same* target band. This is the hostile-question answer made
 * visible: same model, no measurement.
 */
export interface BaselineResult {
  target: Band;
  text: string;
  readability: Readability;
  gate: BandVerdict;
  audit: Audit;
  /** Concepts the one-shot rewrite dropped. Rendered struck-through in red. */
  droppedConcepts: Concept[];
  cached: boolean;
}

/* -------------------------------------------------------------------------- */
/* Streaming events                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The streaming route emits one of these per line (SSE). The client never waits
 * on a blank screen: the analysis lands first, then attempts appear as each one
 * is measured, then each band closes.
 */
export type RunEvent =
  | { type: "meta"; bands: Band[]; cached: boolean; source: string }
  | { type: "analysis"; analysis: Analysis }
  | { type: "attempt-start"; bandId: string; n: number }
  | { type: "attempt"; bandId: string; attempt: Attempt }
  | { type: "band-done"; bandId: string; result: BandResult }
  | { type: "done"; elapsedMs: number }
  | { type: "error"; message: string };

/* -------------------------------------------------------------------------- */
/* Roster (P1, but the bands are derived from it)                             */
/* -------------------------------------------------------------------------- */

export interface Student {
  id: string;
  /** Measured reading grade level (synthetic — disclosed in the README). */
  readingLevel: number;
  /** Flags that colour the pitch: newcomer English learner, or an IEP. */
  ell?: boolean;
  iep?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Evaluation (scripts/evaluate.ts → data/evidence.json → /evidence)          */
/* -------------------------------------------------------------------------- */

export interface CorpusPassage {
  id: string;
  subject: string;
  title: string;
  text: string;
  /** Target grade for this passage's rewrite. */
  target: number;
}

export interface EvidenceRow {
  id: string;
  subject: string;
  title: string;
  target: number;
  /** The naive one-shot, scored by the Measurer. */
  oneShot: { grade: number; inBand: boolean; retained: number; total: number };
  /** The LEXA loop. */
  loop: {
    grade: number;
    inBand: boolean;
    attempts: number;
    retained: number;
    total: number;
    outcome: BandOutcome;
  };
}

export interface EvidenceSummary {
  /** Fraction of passages whose rewrite landed inside the band, 0–1. */
  inBandRate: number;
  /** Mean absolute error of measured grade vs. target, in grade levels. */
  mae: number;
  /** Fraction of required concepts retained across all passages, 0–1. */
  retentionRate: number;
  /** Loop only: mean attempts to convergence. */
  meanAttempts?: number;
}

export interface Evidence {
  generatedAt: string;
  tolerance: number;
  passages: number;
  oneShot: EvidenceSummary;
  loop: EvidenceSummary;
  rows: EvidenceRow[];
}
