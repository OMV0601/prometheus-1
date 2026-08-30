/**
 * THE ANTHROPIC CLIENT
 * ====================
 *
 * One place that constructs the SDK client and names the models, and one retry
 * helper that every agent call goes through. The rule from the brief: the key is
 * read here, server-side, from the environment, and never crosses into a client
 * bundle. This module imports the SDK, so importing it from a client component
 * would be a build error — that is the guardrail working.
 */

import Anthropic from "@anthropic-ai/sdk";

/** The org chart, as model ids. Names match the panel table in the README. */
export const MODELS = {
  /** The Analyst and the Fidelity Auditor — the reasoning roles. */
  reasoning: "claude-sonnet-5",
  /** The Rewriter — called up to 12 times per run, so it must be fast. */
  rewriter: "claude-haiku-4-5-20251001",
} as const;

/** True when we have a key to talk to the API at all. */
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

/** Lazily construct a single shared client. Throws if there is no key. */
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Run an async call once, and on failure wait and try exactly once more. Two
 * attempts, not a loop — the brief is explicit that the second failure should
 * degrade to the cached run rather than spin. The caller decides what "degrade"
 * means; this helper only surfaces the final error.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { label, backoffMs = 800 }: { label: string; backoffMs?: number } = { label: "call" },
): Promise<T> {
  try {
    return await fn();
  } catch (first) {
    await sleep(backoffMs);
    try {
      return await fn();
    } catch (second) {
      const detail = second instanceof Error ? second.message : String(second);
      throw new Error(`${label} failed twice: ${detail}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
