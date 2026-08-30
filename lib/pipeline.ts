/**
 * THE PIPELINE
 * ============
 *
 * The loop from the brief, made concrete. The Analyst reads the source once; then
 * every band runs in parallel, and within a band up to four attempts run in
 * sequence, because each retry is told exactly why the last one was rejected. A
 * retry that doesn't carry the failure forward is just resampling.
 *
 * Every attempt is graded three ways, and all three must pass:
 *   1. lib/readability.ts    — is it inside the target grade band?
 *   2. a substring check      — did every protected term survive verbatim?
 *   3. the Fidelity Auditor   — is every required concept still taught?
 *
 * The models never grade themselves. The Rewriter proposes; arithmetic and a
 * literal string search dispose; the Auditor only reports which concepts it can
 * still locate. If four attempts miss, the band ESCALATES — a designed outcome,
 * not a crash.
 */

import type { Anthropic } from "@anthropic-ai/sdk";
import { getClient, MODELS, withRetry } from "./anthropic";
import {
  ANALYST_TOOL,
  AUDITOR_TOOL,
  analystSystem,
  auditorSystem,
  auditorUser,
  baselineSystem,
  baselineUser,
  questionsSystem,
  questionsUser,
  rewriterSystem,
  rewriterUser,
} from "./prompts";
import { checkBand, measure } from "./readability";
import type {
  Analysis,
  Attempt,
  Audit,
  BandResult,
  BaselineResult,
  Band,
  Concept,
  ConceptCheck,
  ProtectedTerm,
  RejectionKind,
  RunEvent,
  TermCheck,
} from "./types";

export const MAX_ATTEMPTS = 4;

type Emit = (event: RunEvent) => void;

/* -------------------------------------------------------------------------- */
/* Agent calls                                                                */
/* -------------------------------------------------------------------------- */

/** The Analyst: read the source once, return concepts + protected terms. */
export async function analyze(source: string): Promise<Analysis> {
  const msg = await withRetry(
    () =>
      getClient().messages.create({
        model: MODELS.reasoning,
        max_tokens: 2048,
        system: analystSystem(),
        tools: [ANALYST_TOOL],
        tool_choice: { type: "tool", name: ANALYST_TOOL.name },
        messages: [{ role: "user", content: source }],
      }),
    { label: "Analyst" },
  );
  return normalizeAnalysis(toolInput<Analysis>(msg, ANALYST_TOOL.name));
}

/** The Rewriter: one candidate, one band, told why the last attempt failed. */
export async function rewrite(args: {
  source: string;
  band: Band;
  analysis: Analysis;
  previousFailure?: string;
}): Promise<string> {
  const msg = await withRetry(
    () =>
      getClient().messages.create({
        model: MODELS.rewriter,
        max_tokens: 1600,
        system: rewriterSystem(),
        messages: [{ role: "user", content: rewriterUser(args) }],
      }),
    { label: `Rewriter(${args.band.id})` },
  );
  return textOf(msg);
}

/** The Fidelity Auditor: which concepts survived, and the span that proves each. */
export async function audit(rewriteText: string, concepts: Concept[]): Promise<Audit> {
  const msg = await withRetry(
    () =>
      getClient().messages.create({
        model: MODELS.reasoning,
        max_tokens: 2048,
        system: auditorSystem(),
        tools: [AUDITOR_TOOL],
        tool_choice: { type: "tool", name: AUDITOR_TOOL.name },
        messages: [{ role: "user", content: auditorUser({ rewrite: rewriteText, concepts }) }],
      }),
    { label: "Auditor" },
  );
  return normalizeAudit(toolInput<{ checks: ConceptCheck[] }>(msg, AUDITOR_TOOL.name), rewriteText, concepts);
}

/**
 * Transcribe a photographed textbook page. Claude reads images natively — this is
 * the only place an image enters the system, and it exits as plain text that flows
 * through the identical pipeline. No OCR library, no PDF parser.
 */
export async function transcribeImage(base64: string, mediaType: string): Promise<string> {
  const msg = await withRetry(
    () =>
      getClient().messages.create({
        model: MODELS.reasoning,
        max_tokens: 2048,
        system:
          "Transcribe the body text of this textbook page exactly. Output only the passage prose — skip page numbers, figure captions, sidebars and headings unless they are part of the passage. No commentary.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType as never, data: base64 },
              },
              { type: "text", text: "Transcribe the passage." },
            ],
          },
        ],
      }),
    { label: "Transcribe" },
  );
  return textOf(msg);
}

/**
 * Five comprehension questions covering the concepts — the same test every student
 * takes regardless of level. Falls back to concept-derived questions if the model
 * call fails, so the print handout is never empty.
 */
export async function generateQuestions(concepts: Concept[]): Promise<string[]> {
  try {
    const msg = await withRetry(
      () =>
        getClient().messages.create({
          model: MODELS.rewriter,
          max_tokens: 512,
          system: questionsSystem(),
          messages: [{ role: "user", content: questionsUser(concepts) }],
        }),
      { label: "Questions" },
    );
    const lines = textOf(msg)
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length >= 5) return lines.slice(0, 5);
  } catch {
    /* fall through to the deterministic fallback */
  }
  return concepts.slice(0, 5).map((c) => `In your own words, explain: ${c.text.replace(/\.$/, "")}.`);
}

/* -------------------------------------------------------------------------- */
/* Deterministic checks                                                        */
/* -------------------------------------------------------------------------- */

/** Did every protected term survive, verbatim (case-insensitively)? Pure. */
export function checkTerms(text: string, terms: ProtectedTerm[]): TermCheck[] {
  const haystack = text.toLowerCase();
  return terms.map((t) => ({
    term: t.term,
    present: haystack.includes(t.term.toLowerCase()),
  }));
}

/**
 * Fold the three gradings into one verdict for a single attempt. This function is
 * pure — given the draft and the three inputs it always returns the same Attempt —
 * which is what lets the cached run replay identically.
 */
export function evaluateAttempt(args: {
  n: number;
  text: string;
  band: Band;
  terms: ProtectedTerm[];
  concepts: Concept[];
  auditResult: Audit;
}): Attempt {
  const { n, text, band, terms, concepts, auditResult } = args;
  const readability = measure(text);
  const gate = checkBand(readability, band);
  const termChecks = checkTerms(text, terms);
  const termsAllPresent = termChecks.every((t) => t.present);

  const rejections: RejectionKind[] = [];
  if (!gate.passed) rejections.push(gate.direction === "too_hard" ? "too_hard" : "too_easy");
  if (!termsAllPresent) rejections.push("dropped_term");
  if (auditResult.retained < concepts.length) rejections.push("dropped_concept");

  const passed = rejections.length === 0;

  return {
    n,
    text,
    readability,
    gate,
    terms: termChecks,
    termsAllPresent,
    audit: auditResult,
    passed,
    rejections,
    reason: reasonLabel(rejections, gate.measured, band, termChecks, auditResult, concepts),
  };
}

/* -------------------------------------------------------------------------- */
/* The loop                                                                    */
/* -------------------------------------------------------------------------- */

/** Run one band to PASS or ESCALATED, emitting an event per attempt. */
export async function runBand(
  source: string,
  band: Band,
  analysis: Analysis,
  emit: Emit,
): Promise<BandResult> {
  const attempts: Attempt[] = [];
  let previousFailure: string | undefined;

  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    emit({ type: "attempt-start", bandId: band.id, n });

    const text = await rewrite({ source, band, analysis, previousFailure });
    const auditResult = await audit(text, analysis.concepts);
    const attempt = evaluateAttempt({
      n,
      text,
      band,
      terms: analysis.protectedTerms,
      concepts: analysis.concepts,
      auditResult,
    });

    attempts.push(attempt);
    emit({ type: "attempt", bandId: band.id, attempt });

    if (attempt.passed) {
      const result: BandResult = { band, attempts, outcome: "PASS", final: attempt };
      emit({ type: "band-done", bandId: band.id, result });
      return result;
    }

    previousFailure = buildFailureReason(attempt, band, analysis);
  }

  // Four misses. Escalate with the closest attempt — the one nearest the band that
  // also lost the fewest concepts. Reading distance dominates; concepts break ties.
  const closest = [...attempts].sort((a, b) => {
    const da = Math.abs(a.gate.delta);
    const db = Math.abs(b.gate.delta);
    if (da !== db) return da - db;
    return b.audit.retained - a.audit.retained;
  })[0];

  const result: BandResult = { band, attempts, outcome: "ESCALATED", final: closest };
  emit({ type: "band-done", bandId: band.id, result });
  return result;
}

/** The whole run: Analyst once, then every band in parallel. */
export async function runPipeline(source: string, bands: Band[], emit: Emit): Promise<void> {
  const started = Date.now();
  emit({ type: "meta", bands, cached: false, source });
//
  const analysis = await analyze(source);
  emit({ type: "analysis", analysis });

  await Promise.all(bands.map((band) => runBand(source, band, analysis, emit)));

  emit({ type: "done", elapsedMs: Date.now() - started });
}

/* -------------------------------------------------------------------------- */
/* The baseline                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The naive one-shot, scored by the SAME Measurer against the SAME target. Same
 * model family, no measurement, no concept list — this is what the teacher does
 * tonight, and the point is to show it landing outside the band with concepts gone.
 */
export async function runBaseline(
  source: string,
  band: Band,
  analysis: Analysis,
): Promise<BaselineResult> {
  const msg = await withRetry(
    () =>
      getClient().messages.create({
        model: MODELS.rewriter,
        max_tokens: 1600,
        system: baselineSystem(),
        messages: [{ role: "user", content: baselineUser(source, band) }],
      }),
    { label: "Baseline" },
  );
  const text = textOf(msg);
  const readability = measure(text);
  const gate = checkBand(readability, band);
  const auditResult = await audit(text, analysis.concepts);
  const droppedConcepts = analysis.concepts.filter(
    (c) => !auditResult.checks.find((ch) => ch.conceptId === c.id)?.retained,
  );
  return { target: band, text, readability, gate, audit: auditResult, droppedConcepts, cached: false };
}

/* -------------------------------------------------------------------------- */
/* Failure messaging                                                          */
/* -------------------------------------------------------------------------- */

/** The specific instruction carried into the next Rewriter call. */
function buildFailureReason(attempt: Attempt, band: Band, analysis: Analysis): string {
  const lines: string[] = [
    `Attempt ${attempt.n} measured Flesch–Kincaid grade ${attempt.readability.fleschKincaid.toFixed(
      1,
    )}, but the target is ${band.target.toFixed(1)} ± ${band.tolerance}.`,
  ];

  // Adaptive budget: invert Flesch–Kincaid using THIS attempt's own measured
  // syllables-per-word, so the words-per-sentence aim we hand back is exact for
  // this passage's vocabulary rather than a generic estimate. This is what makes
  // the loop converge instead of oscillate: FK = 0.39·ASL + 11.8·ASW − 15.59, so
  // the sentence length needed to hit the target is (T + 15.59 − 11.8·ASW)/0.39.
  const measuredAsw = attempt.readability.avgSyllablesPerWord;
  const currentAsl = attempt.readability.avgSentenceLength;
  const neededAsl = Math.max(3, Math.round((band.target + 15.59 - 11.8 * measuredAsw) / 0.39));
  if (attempt.rejections.includes("too_hard")) {
    lines.push(
      `It reads TOO HARD. Your sentences average ${currentAsl.toFixed(
        1,
      )} words; make them average about ${neededAsl} words instead. Split every sentence longer than that into two, and prefer short everyday words for everything that is not a protected term. Keep every required concept and every protected term.`,
    );
  }
  if (attempt.rejections.includes("too_easy")) {
    lines.push(
      `It reads TOO EASY — you overshot. Your sentences average ${currentAsl.toFixed(
        1,
      )} words; lengthen them toward about ${neededAsl} words by combining short sentences, and restore natural phrasing, without dropping any concept.`,
    );
  }
  const missingTerms = attempt.terms.filter((t) => !t.present).map((t) => `"${t.term}"`);
  if (missingTerms.length) {
    lines.push(`You dropped these protected terms — put them back verbatim: ${missingTerms.join(", ")}.`);
  }
  const droppedIds = attempt.audit.checks.filter((c) => !c.retained).map((c) => c.conceptId);
  if (droppedIds.length) {
    const dropped = analysis.concepts
      .filter((c) => droppedIds.includes(c.id))
      .map((c) => `'${c.text}'`);
    lines.push(`You dropped these required concepts — restore them: ${dropped.join("; ")}.`);
  }
  return lines.join(" ");
}

/** The short label shown in the attempt log. */
function reasonLabel(
  rejections: RejectionKind[],
  measured: number,
  band: Band,
  terms: TermCheck[],
  auditResult: Audit,
  concepts: Concept[],
): string {
  if (rejections.length === 0) return "PASS";
  const parts: string[] = [];
  if (rejections.includes("too_hard")) parts.push("TOO HARD");
  if (rejections.includes("too_easy")) parts.push("TOO EASY");
  if (rejections.includes("dropped_term")) {
    const n = terms.filter((t) => !t.present).length;
    parts.push(`DROPPED ${n} TERM${n === 1 ? "" : "S"}`);
  }
  if (rejections.includes("dropped_concept")) {
    parts.push(`DROPPED ${concepts.length - auditResult.retained}/${concepts.length} CONCEPTS`);
  }
  return parts.join(" · ");
}

/* -------------------------------------------------------------------------- */
/* Response parsing + normalisation                                           */
/* -------------------------------------------------------------------------- */

function toolInput<T>(msg: Anthropic.Message, toolName: string): T {
  const block = msg.content.find((b) => b.type === "tool_use" && b.name === toolName);
  if (!block || block.type !== "tool_use") {
    throw new Error(`Expected a ${toolName} tool call but the model returned none`);
  }
  return block.input as T;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * Guard against a model that returns malformed ids or empty fields, and cap the
 * counts. The caps are a floor-control safeguard, not cosmetic: every extra
 * polysyllabic protected term raises the minimum achievable reading grade, so an
 * over-eager Analyst can make every band impossible. Concepts are re-id'd
 * sequentially so highlights and audits always line up.
 */
const MAX_CONCEPTS = 12;
const MAX_TERMS = 8;

function normalizeAnalysis(raw: Analysis): Analysis {
  const concepts = (raw.concepts ?? [])
    .filter((c) => c.text?.trim())
    .slice(0, MAX_CONCEPTS)
    .map((c, i) => ({ id: `c${i + 1}`, text: c.text.trim() }));
  const protectedTerms = (raw.protectedTerms ?? [])
    .filter((t) => t.term?.trim())
    .slice(0, MAX_TERMS)
    .map((t) => ({ term: t.term.trim(), gloss: (t.gloss ?? "").trim() }));
  return { concepts, protectedTerms };
}

/**
 * The Auditor is a model, so we do not trust its span blindly: a span it claims to
 * have quoted but that is not actually present in the rewrite is treated as a
 * failed quote (retained ← false). This turns "the Auditor hallucinated a span"
 * into a visible, conservative rejection rather than a false pass.
 */
function normalizeAudit(
  raw: { checks: ConceptCheck[] },
  rewriteText: string,
  concepts: Concept[],
): Audit {
  const haystack = rewriteText.toLowerCase();
  const byId = new Map((raw.checks ?? []).map((c) => [c.conceptId, c]));

  const checks: ConceptCheck[] = concepts.map((concept) => {
    const claim = byId.get(concept.id);
    if (!claim || !claim.retained) {
      return { conceptId: concept.id, retained: false, span: null };
    }
    const span = (claim.span ?? "").trim();
    const quoteHolds = span.length > 0 && haystack.includes(span.toLowerCase());
    return {
      conceptId: concept.id,
      retained: quoteHolds,
      span: quoteHolds ? span : null,
    };
  });

  return { checks, retained: checks.filter((c) => c.retained).length, total: concepts.length };
}
