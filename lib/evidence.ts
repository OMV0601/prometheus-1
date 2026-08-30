/** Load the ablation results written by scripts/evaluate.ts. Null until run. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Evidence } from "./types";

export function loadEvidence(): Evidence | null {
  try {
    const path = join(process.cwd(), "data", "evidence.json");
    return JSON.parse(readFileSync(path, "utf8")) as Evidence;
  } catch {
    return null;
  }
}
