/**
 * Cached baselines for offline mode, keyed by band id. Written by
 * scripts/generate-demo.ts. Loaded from disk at call time so the build never
 * depends on the file existing.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BaselineResult } from "./types";

export function loadCachedBaseline(bandId: string): BaselineResult | null {
  try {
    const path = join(process.cwd(), "data", "demo-baseline.json");
    const map = JSON.parse(readFileSync(path, "utf8")) as Record<string, BaselineResult>;
    return map[bandId] ?? null;
  } catch {
    return null;
  }
}
