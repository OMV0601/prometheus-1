"use client";

/**
 * THE DIRECTOR
 * ============
 *
 * Runs the SCRIPT in autoDemo.ts against one clock. Every beat is scheduled up
 * front from a single t0, so a slow frame or a late network response shifts
 * nothing: beat N always fires at its own timestamp. That is the whole point,
 * because the narration is recorded separately and cut against these timestamps.
 *
 * Esc aborts and puts the page back to idle, so a bad take costs one key press
 * rather than a page reload.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_TOTAL_MS, SCRIPT } from "./autoDemo";

export interface DemoHandlers {
  /** Start the run, already configured for cached + stretched playback. */
  onRun: () => void;
  /** Return the page to the idle input view. */
  onIdle: () => void;
  /** Drive the three-column highlight. null releases it. */
  setConcept: (id: string | null) => void;
  /** Open the baseline comparison. */
  setBaselineOpen: (open: boolean) => void;
  /** Concept ids in analysis order. Empty until the Analyst event lands. */
  getConceptIds: () => string[];
  /** Indices into the concept list to tour, in order. */
  conceptTour: number[];
}

function spotlight(target: string | null) {
  document
    .querySelectorAll<HTMLElement>("[data-demo][data-spot='true']")
    .forEach((el) => el.removeAttribute("data-spot"));
  if (!target) return;
  const el = document.querySelector<HTMLElement>(`[data-demo="${target}"]`);
  if (!el) return;
  el.setAttribute("data-spot", "true");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function scrollTo(target: string) {
  const el = document.querySelector<HTMLElement>(`[data-demo="${target}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function useAutoDemo(handlers: DemoHandlers) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<number[]>([]);
  const saved = useRef(handlers);
  saved.current = handlers;

  const stop = useCallback((returnToIdle: boolean) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setActive(false);
    setElapsed(0);
    spotlight(null);
    saved.current.setConcept(null);
    saved.current.setBaselineOpen(false);
    if (returnToIdle) {
      saved.current.onIdle();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const start = useCallback(() => {
    const h = saved.current;
    // Always open from a clean idle page so every take is identical.
    h.onIdle();
    h.setConcept(null);
    h.setBaselineOpen(false);
    spotlight(null);
    window.scrollTo({ top: 0, behavior: "auto" });

    setActive(true);
    setElapsed(0);
    const t0 = performance.now();

    const tick = window.setInterval(() => {
      const e = performance.now() - t0;
      setElapsed(e);
      if (e >= DEMO_TOTAL_MS) window.clearInterval(tick);
    }, 100);
    timers.current.push(tick as unknown as number);

    for (const beat of SCRIPT) {
      const id = window.setTimeout(() => {
        const a = beat.action;
        switch (a.kind) {
          case "spotlight":
            spotlight(a.target);
            break;
          case "scroll":
            scrollTo(a.target);
            break;
          case "run":
            saved.current.onRun();
            break;
          case "concept": {
            if (a.index === null) {
              saved.current.setConcept(null);
              break;
            }
            const ids = saved.current.getConceptIds();
            const pick = saved.current.conceptTour[a.index];
            saved.current.setConcept(ids[pick] ?? ids[0] ?? null);
            break;
          }
          case "baseline":
            saved.current.setBaselineOpen(a.open);
            break;
          case "end":
            // Leave the finished page on screen; just drop the driving state so
            // the highlight is interactive again and the HUD stops.
            timers.current.forEach((t) => window.clearTimeout(t));
            timers.current = [];
            setActive(false);
            saved.current.setConcept(null);
            spotlight(null);
            break;
        }
      }, beat.at);
      timers.current.push(id);
    }
  }, []);

  // Esc aborts a take.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, stop]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return { active, elapsed, start, abort: () => stop(true) };
}
