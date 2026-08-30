/**
 * Minimal .env.local loader for standalone scripts (evaluate, generate-demo).
 * Next.js loads .env.local automatically for the app; a bare `tsx` process does
 * not, so the scripts call this first. Never prints the value.
 */

import { readFileSync } from "node:fs";

export function loadEnv(file = ".env.local"): void {
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}
