/**
 * /print — the printable handout.
 *
 * The same passage at three reading levels and, crucially, the SAME five
 * comprehension questions on every level. That is the pedagogical claim made
 * physical: different reading level, identical assessment. Reads the cached run so
 * it always has content and works offline.
 */

import Link from "next/link";
import { loadCachedRun } from "@/lib/demo-data";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default function PrintPage() {
  const run = loadCachedRun();

  if (!run) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-muted">
          No cached run yet. Run <span className="num">npm run generate-demo</span> to create the
          handout data.
        </p>
        <Link href="/" className="label mt-4 inline-block hover:text-ink">
          ← Back
        </Link>
      </main>
    );
  }

  const questions =
    run.questions ??
    run.analysis.concepts.slice(0, 5).map((c) => `Explain: ${c.text.replace(/\.$/, "")}.`);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 pb-24">
      <header className="no-print flex items-center justify-between border-b border-rule py-5">
        <Link href="/" className="text-[1.35rem] font-semibold tracking-[0.02em]">
          LEXA
        </Link>
        <div className="flex items-center gap-5">
          <PrintButton />
          <Link href="/" className="label hover:text-ink">
            ← Back to the tool
          </Link>
        </div>
      </header>

      <div className="py-8">
        <span className="label">Differentiated handout · same assessment</span>
        <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.01em]">
          Photosynthesis — three reading levels, one test
        </h1>
      </div>

      <div className="grid gap-px bg-rule md:grid-cols-3">
        {run.bands.map((b) => (
          <article key={b.band.id} className="flex flex-col bg-panel p-6">
            <header className="mb-3 flex items-baseline justify-between border-b border-rule pb-2">
              <h2 className="text-[0.95rem] font-semibold tracking-tight">{b.band.label}</h2>
              <span className="num text-[0.75rem] text-muted">
                FK {b.final.readability.fleschKincaid.toFixed(1)}
              </span>
            </header>
            <p className="passage whitespace-pre-wrap text-[0.9rem] leading-relaxed">
              {b.final.text}
            </p>
          </article>
        ))}
      </div>

      <section className="mt-10 border border-rule bg-panel p-8">
        <span className="label">Comprehension — the same five questions for every student</span>
        <ol className="mt-4 space-y-4">
          {questions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="num text-muted">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-[0.95rem]">{q}</p>
                <div className="mt-3 h-px bg-rule" />
                <div className="mt-4 h-px bg-rule" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="num mt-4 text-[0.75rem] text-faint">
        Reading level differs by column; the assessment does not. That is the point.
      </p>
    </main>
  );
}
