/**
 * Concept highlight tints. The only colour in the app besides PASS/FAIL state.
 * Muted, low-saturation, and stable per concept index so the *same* concept wears
 * the *same* tint in all three columns — which is what makes the cross-column
 * matching legible at a glance.
 */

export interface Tint {
  soft: string;
  strong: string;
}

const PALETTE: Tint[] = [
  { soft: "rgba(193, 138, 42, 0.20)", strong: "rgba(193, 138, 42, 0.42)" }, // amber
  { soft: "rgba(45, 122, 122, 0.18)", strong: "rgba(45, 122, 122, 0.40)" }, // teal
  { soft: "rgba(163, 66, 92, 0.18)", strong: "rgba(163, 66, 92, 0.38)" }, // rose
  { soft: "rgba(74, 96, 158, 0.18)", strong: "rgba(74, 96, 158, 0.40)" }, // indigo
  { soft: "rgba(112, 120, 48, 0.20)", strong: "rgba(112, 120, 48, 0.42)" }, // olive
  { soft: "rgba(128, 74, 140, 0.18)", strong: "rgba(128, 74, 140, 0.38)" }, // plum
  { soft: "rgba(52, 108, 148, 0.18)", strong: "rgba(52, 108, 148, 0.40)" }, // sky
  { soft: "rgba(168, 96, 62, 0.20)", strong: "rgba(168, 96, 62, 0.42)" }, // clay
];

/** Deterministic tint for a concept id like "c1", "c2", … */
export function tintFor(conceptId: string): Tint {
  const n = parseInt(conceptId.replace(/\D/g, ""), 10);
  const index = Number.isFinite(n) ? (n - 1) % PALETTE.length : 0;
  return PALETTE[(index + PALETTE.length) % PALETTE.length];
}
