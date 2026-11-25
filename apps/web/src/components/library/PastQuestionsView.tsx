import type { PastQuestion } from "@/lib/data/types";

export default function PastQuestionsView({ questions, error }: { questions: PastQuestion[]; error?: string | null }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold">Past questions</h2>
      {error && <p role="alert" className="mt-3 text-sm text-accent">Could not load past questions. Try again in a minute.</p>}
      {!error && questions.length === 0 && <p className="mt-3 text-sm text-dim">No past questions yet.</p>}
      {questions.map((q, i) => {
        const solution = q.solutions.filter((s) => s.status === "published").sort((a, b) => b.version - a.version)[0];
        const newUnit = i === 0 || questions[i - 1].unit !== q.unit;
        return (
          <div key={q.id}>
            {newUnit && <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-dim">Unit {q.unit}</h3>}
            <article className="mt-3 rounded-2xl border border-white/10 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
                {q.papers && <span>{q.papers.year}</span>}
                <span className="font-semibold text-fg">Q{q.q_no}({q.part}){q.is_or ? " OR" : ""}</span>
                {q.marks != null && <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-fg">{q.marks} marks</span>}
                {q.repeats > 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Repeat x{q.repeats + 1}</span>}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{q.text}</p>
              {solution && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-accent">Solution</summary>
                  <p className="mt-2 whitespace-pre-line text-sm text-dim">{solution.body_md}</p>
                </details>
              )}
            </article>
          </div>
        );
      })}
    </section>
  );
}
