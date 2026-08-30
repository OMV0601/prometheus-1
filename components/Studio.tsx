"use client";

/**
 * STUDIO — the whole tool on one screen: paste or drop a page, watch three bands
 * run in parallel, then read the three columns side by side and interrogate the
 * baseline. It owns the SSE connection and a reducer that turns the event stream
 * into live band state. It never computes a grade — every number it shows arrived
 * from the server, produced by lib/readability.ts.
 */

import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import BandColumn from "./BandColumn";
import ThreeColumnView, { type Column } from "./ThreeColumnView";
import BaselinePanel from "./BaselinePanel";
import { initLiveBand, type LiveBand } from "./live";
import type { Analysis, Band, RunEvent } from "@/lib/types";

interface RosterStats {
  total: number;
  atOrBelow5: number;
  ell: number;
  iep: number;
}

/* -------------------------------------------------------------------------- */
/* Reducer                                                                    */
/* -------------------------------------------------------------------------- */

interface State {
  phase: "input" | "running" | "done";
  cached: boolean;
  source: string;
  analysis: Analysis | null;
  order: string[];
  bands: Record<string, LiveBand>;
  elapsedMs: number | null;
  error: string | null;
}

const emptyState = (): State => ({
  phase: "input",
  cached: false,
  source: "",
  analysis: null,
  order: [],
  bands: {},
  elapsedMs: null,
  error: null,
});

type Action = { type: "reset" } | { type: "event"; event: RunEvent };

function reducer(state: State, action: Action): State {
  if (action.type === "reset") return { ...emptyState(), phase: "running" };

  const ev = action.event;
  switch (ev.type) {
    case "meta": {
      const bands: Record<string, LiveBand> = {};
      for (const b of ev.bands) bands[b.id] = initLiveBand(b);
      return {
        ...state,
        phase: "running",
        cached: ev.cached,
        source: ev.source,
        order: ev.bands.map((b) => b.id),
        bands,
        analysis: null,
        elapsedMs: null,
        error: null,
      };
    }
    case "analysis":
      return { ...state, analysis: ev.analysis };
    case "attempt-start": {
      const band = state.bands[ev.bandId];
      if (!band) return state;
      return {
        ...state,
        bands: { ...state.bands, [ev.bandId]: { ...band, pending: ev.n } },
      };
    }
    case "attempt": {
      const band = state.bands[ev.bandId];
      if (!band) return state;
      return {
        ...state,
        bands: {
          ...state.bands,
          [ev.bandId]: {
            ...band,
            attempts: [...band.attempts, ev.attempt],
            currentValue: ev.attempt.readability.fleschKincaid,
            locked: ev.attempt.passed,
            pending: null,
          },
        },
      };
    }
    case "band-done": {
      const band = state.bands[ev.bandId];
      if (!band) return state;
      return {
        ...state,
        bands: {
          ...state.bands,
          [ev.bandId]: {
            ...band,
            outcome: ev.result.outcome,
            final: ev.result.final,
            currentValue: ev.result.final.readability.fleschKincaid,
            locked: ev.result.outcome === "PASS",
            pending: null,
          },
        },
      };
    }
    case "done":
      return { ...state, phase: "done", elapsedMs: ev.elapsedMs };
    case "error":
      return { ...state, phase: "input", error: ev.message };
    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Studio({
  initialSource,
  bands,
  rosterStats,
}: {
  initialSource: string;
  bands: Band[];
  rosterStats: RosterStats;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [text, setText] = useState(initialSource);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const parseStream = useCallback(async (body: BodyInit) => {
    dispatch({ type: "reset" });
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch("/api/level", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!res.body) {
      dispatch({ type: "event", event: { type: "error", message: "No response stream." } });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          dispatch({ type: "event", event: JSON.parse(line.slice(5).trim()) as RunEvent });
        } catch {
          /* ignore keepalive / malformed line */
        }
      }
    }
  }, []);

  const runText = useCallback(() => {
    void parseStream(JSON.stringify({ source: text }));
  }, [parseStream, text]);

  const runImage = useCallback(
    async (file: File) => {
      const base64 = await fileToBase64(file);
      void parseStream(JSON.stringify({ image: { base64, mediaType: file.type } }));
    },
    [parseStream],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) void runImage(file);
    },
    [runImage],
  );

  const doneColumns: Column[] = useMemo(
    () =>
      state.order
        .map((id) => state.bands[id])
        .filter((b): b is LiveBand & { final: NonNullable<LiveBand["final"]>; outcome: NonNullable<LiveBand["outcome"]> } =>
          Boolean(b?.final && b?.outcome),
        )
        .map((b) => ({
          band: b.band,
          outcome: b.outcome,
          final: b.final,
          attemptCount: b.attempts.length,
        })),
    [state.order, state.bands],
  );

  // The baseline comparison uses the most aggressive band, because that is where
  // the one-shot's failure is starkest: it chases the number by silently cutting
  // concepts. LEXA's honest escalation there is the restraint story.
  const baselineColumn = doneColumns.find((c) => c.band.id === "low") ?? doneColumns[0];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pb-24">
      <Masthead cached={state.cached && state.phase !== "input"} />

      {state.phase === "input" ? (
        <InputPanel
          text={text}
          setText={setText}
          onRun={runText}
          onDrop={onDrop}
          dragging={dragging}
          setDragging={setDragging}
          onPickImage={runImage}
          rosterStats={rosterStats}
          bands={bands}
          error={state.error}
        />
      ) : (
        <div className="space-y-10">
          <RunHeader
            cached={state.cached}
            elapsedMs={state.elapsedMs}
            phase={state.phase}
            analysis={state.analysis}
            onReset={() => window.location.reload()}
          />

          <div className="grid gap-px bg-rule lg:grid-cols-3">
            {state.order.map((id) => (
              <div key={id} className="bg-paper">
                <BandColumn band={state.bands[id]} />
              </div>
            ))}
          </div>

          {state.phase === "done" && state.analysis && doneColumns.length > 0 && (
            <>
              <SectionHeader
                kicker="Same lesson · same test · different reading level"
                title="Three levels, side by side"
                note="Hover any highlight — the same concept lifts in all three columns."
              />
              <ThreeColumnView columns={doneColumns} analysis={state.analysis} />

              {baselineColumn && (
                <>
                  <SectionHeader kicker="The comparison" title="One prompt vs. LEXA" />
                  <BaselinePanel
                    source={state.source}
                    band={baselineColumn.band}
                    lexaFinal={baselineColumn.final}
                    lexaOutcome={baselineColumn.outcome}
                    analysis={state.analysis}
                    cached={state.cached}
                  />
                </>
              )}

              <Footer />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-views                                                                  */
/* -------------------------------------------------------------------------- */

function Masthead({ cached }: { cached: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-rule py-5">
      <div className="flex items-baseline gap-3">
        <span className="text-[1.35rem] font-semibold tracking-[0.02em]">LEXA</span>
        <span className="label hidden sm:inline">
          the model proposes · the code disposes
        </span>
      </div>
      <nav className="flex items-center gap-5">
        {cached && (
          <span
            className="num rounded-sm px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-fail)", background: "var(--color-fail-soft)" }}
          >
            Cached run
          </span>
        )}
        <Link href="/evidence" className="label hover:text-ink">
          Evidence
        </Link>
        <Link href="/print" className="label hover:text-ink">
          Handout
        </Link>
      </nav>
    </header>
  );
}

function InputPanel({
  text,
  setText,
  onRun,
  onDrop,
  dragging,
  setDragging,
  onPickImage,
  rosterStats,
  bands,
  error,
}: {
  text: string;
  setText: (s: string) => void;
  onRun: () => void;
  onDrop: (e: React.DragEvent) => void;
  dragging: boolean;
  setDragging: (b: boolean) => void;
  onPickImage: (f: File) => void;
  rosterStats: RosterStats;
  bands: Band[];
  error: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-12 py-12 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <h1 className="max-w-xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.01em]">
          Rewrite the page until the math says the kid can read it — and prove it didn’t cut
          anything.
        </h1>
        <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-muted">
          Hitting a readability target alone is trivial: chop every sentence in half. Retaining
          every concept alone is trivial: copy the text. Doing both at once is the actual problem,
          and it is why a single prompt cannot do this.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="mt-8 border border-rule bg-panel transition-colors"
          style={{ borderColor: dragging ? "var(--color-ink)" : undefined }}
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <span className="label">Source passage</span>
            <button
              onClick={() => fileRef.current?.click()}
              className="label hover:text-ink"
            >
              or drop a photo of a textbook page
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="passage h-72 w-full resize-none bg-transparent p-5 outline-none"
          />
        </div>

        {error && (
          <p className="num mt-3 text-[0.8125rem]" style={{ color: "var(--color-fail)" }}>
            {error}
          </p>
        )}

        <button
          onClick={onRun}
          disabled={!text.trim()}
          className="mt-6 bg-ink px-7 py-3 text-[0.9rem] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          Level this passage →
        </button>
      </div>

      <aside className="lg:pt-2">
        <SectionHeader kicker="4th period · science" title="The class" />
        <dl className="mt-4 divide-y divide-rule border-y border-rule">
          <RosterRow k="Students" v={String(rosterStats.total)} />
          <RosterRow k="Read at or below grade 5" v={String(rosterStats.atOrBelow5)} />
          <RosterRow k="Newcomer English learners" v={String(rosterStats.ell)} />
          <RosterRow k="IEP: text at reading level" v={String(rosterStats.iep)} />
        </dl>
        <p className="num mt-3 text-[0.6875rem] text-faint">
          Roster is synthetic — no real student data.
        </p>

        <div className="mt-8">
          <SectionHeader kicker="Derived from the roster" title="Target bands" />
          <ul className="mt-4 space-y-2">
            {bands.map((b) => (
              <li
                key={b.id}
                className="flex items-baseline justify-between border-b border-rule pb-2"
              >
                <span className="text-[0.9rem]">{b.label}</span>
                <span className="num text-[0.8125rem] text-muted">
                  {b.target.toFixed(1)} ±{b.tolerance}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function RosterRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-[0.875rem] text-ink">{k}</dt>
      <dd className="num text-[0.95rem] font-semibold">{v}</dd>
    </div>
  );
}

function RunHeader({
  cached,
  elapsedMs,
  phase,
  analysis,
  onReset,
}: {
  cached: boolean;
  elapsedMs: number | null;
  phase: State["phase"];
  analysis: Analysis | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4 pt-2">
      <div>
        <span className="label">
          {phase === "done" ? "Run complete" : "The panel is working"}
        </span>
        <div className="mt-1 flex items-baseline gap-4">
          <span className="text-[1.1rem] font-semibold tracking-tight">
            {analysis
              ? `${analysis.concepts.length} required concepts · ${analysis.protectedTerms.length} protected terms`
              : "The Analyst is reading the source…"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {elapsedMs !== null && (
          <span className="num text-[0.8125rem] text-muted">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
        <button onClick={onReset} className="label hover:text-ink">
          ← New passage
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note?: string;
}) {
  return (
    <div>
      <span className="label">{kicker}</span>
      <h2 className="mt-1 text-[1.35rem] font-semibold tracking-[-0.01em]">{title}</h2>
      {note && <p className="mt-1 text-[0.875rem] text-muted">{note}</p>}
    </div>
  );
}

function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
      <p className="max-w-xl text-[0.875rem] text-muted">
        Every number on this page came from <span className="num">lib/readability.ts</span> — no
        model ever reported a grade level.
      </p>
      <div className="flex gap-5">
        <Link href="/evidence" className="label hover:text-ink">
          See the evidence →
        </Link>
        <Link href="/print" className="label hover:text-ink">
          Print handout →
        </Link>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
