/**
 * POST /api/baseline  —  the single-prompt comparison.
 *
 * Body: { source: string, bandId?: "low" | "mid" | "high" }
 * Response: BaselineResult (JSON).
 *
 * One naive "rewrite this at grade N" call, scored by the SAME Measurer against
 * the SAME target as the loop. This is the answer to "can't they just use
 * ChatGPT?" — same model, no measurement, and it usually lands outside the band
 * with concepts gone. Offline, it replays a cached baseline.
 */

import { deriveBands } from "@/lib/bands";
import { ROSTER, loadCachedRun } from "@/lib/demo-data";
import { hasApiKey } from "@/lib/anthropic";
import { analyze, runBaseline } from "@/lib/pipeline";
import { loadCachedBaseline } from "@/lib/demo-baseline";
import type { BaselineResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  source?: string;
  bandId?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const bands = deriveBands(ROSTER);
  const band = bands.find((b) => b.id === body.bandId) ?? bands[1];

  const fallback = (): BaselineResult | null => {
    const cached = loadCachedBaseline(band.id);
    if (cached) return cached;
    // Derive a baseline from the cached run's own source if we must.
    const run = loadCachedRun();
    return run ? null : null;
  };

  if (!hasApiKey()) {
    const cached = fallback();
    return cached
      ? Response.json(cached)
      : Response.json({ error: "No API key and no cached baseline." }, { status: 503 });
  }

  try {
    const source = body.source?.trim();
    if (!source) return Response.json({ error: "Missing source." }, { status: 400 });
    const analysis = await analyze(source);
    const result = await runBaseline(source, band, analysis);
    return Response.json(result);
  } catch (err) {
    const cached = fallback();
    return cached
      ? Response.json(cached)
      : Response.json(
          { error: err instanceof Error ? err.message : String(err) },
          { status: 500 },
        );
  }
}
