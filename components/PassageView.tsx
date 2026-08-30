"use client";

/**
 * PASSAGE VIEW — renders one rewrite with two decorations layered over the prose:
 *
 *   1. Concept highlights: each retained concept's audited span gets its concept's
 *      tint as a subtle underline. Hovering one raises every copy of that concept —
 *      here and in the sibling columns — which is what proves, without reading a
 *      word, that the same idea survived at every level.
 *   2. Protected terms: tier-3 vocabulary in small caps with a dotted underline and
 *      an inline gloss on hover.
 *
 * The highlight geometry comes straight from the Fidelity Auditor's quoted spans —
 * the verification IS the visualization; there is no separate highlighting pass.
 */

import { Fragment, type ReactNode } from "react";
import type { ConceptCheck, ProtectedTerm } from "@/lib/types";
import { tintFor } from "./tints";

interface Range {
  start: number;
  end: number;
  conceptId: string;
}

function conceptRanges(text: string, checks: ConceptCheck[]): Range[] {
  const hay = text.toLowerCase();
  const ranges: Range[] = [];
  for (const c of checks) {
    if (!c.retained || !c.span) continue;
    const idx = hay.indexOf(c.span.toLowerCase());
    if (idx >= 0) ranges.push({ start: idx, end: idx + c.span.length, conceptId: c.conceptId });
  }
  // Prefer earlier starts, then longer spans, and drop anything that overlaps a
  // range already kept — so decorations never collide.
  ranges.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: Range[] = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      kept.push(r);
      lastEnd = r.end;
    }
  }
  return kept;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split a plain chunk of text into nodes, wrapping protected terms as they occur. */
function withTerms(text: string, terms: ProtectedTerm[], keyBase: string): ReactNode[] {
  if (terms.length === 0 || !text) return [text];
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const re = new RegExp(`(${sorted.map((t) => escapeRegExp(t.term)).join("|")})`, "gi");
  const pieces = text.split(re);
  return pieces.map((piece, i) => {
    const match = sorted.find((t) => t.term.toLowerCase() === piece.toLowerCase());
    if (!match) return <Fragment key={`${keyBase}-t${i}`}>{piece}</Fragment>;
    return (
      <span key={`${keyBase}-t${i}`} className="term" title={match.gloss}>
        {piece}
      </span>
    );
  });
}

export interface PassageViewProps {
  text: string;
  checks: ConceptCheck[];
  terms: ProtectedTerm[];
  activeConcept?: string | null;
  onHoverConcept?: (id: string | null) => void;
  className?: string;
}

export default function PassageView({
  text,
  checks,
  terms,
  activeConcept = null,
  onHoverConcept,
  className = "",
}: PassageViewProps) {
  const ranges = conceptRanges(text, checks);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, i) => {
    if (range.start > cursor) {
      nodes.push(...withTerms(text.slice(cursor, range.start), terms, `gap${i}`));
    }
    const tint = tintFor(range.conceptId);
    const active = activeConcept === range.conceptId;
    nodes.push(
      <span
        key={`c${i}`}
        className="concept"
        data-active={active}
        onMouseEnter={() => onHoverConcept?.(range.conceptId)}
        onMouseLeave={() => onHoverConcept?.(null)}
        style={{
          boxShadow: `inset 0 ${active ? "-0.62em" : "-0.34em"} 0 ${active ? tint.strong : tint.soft}`,
        }}
      >
        {withTerms(text.slice(range.start, range.end), terms, `c${i}`)}
      </span>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) {
    nodes.push(...withTerms(text.slice(cursor), terms, "tail"));
  }

  // Preserve paragraph breaks from the source prose.
  return (
    <div className={`passage whitespace-pre-wrap ${className}`}>{nodes}</div>
  );
}
