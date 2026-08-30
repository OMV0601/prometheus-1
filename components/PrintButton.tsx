"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="label border border-rule px-3 py-1.5 hover:text-ink"
    >
      Print
    </button>
  );
}
