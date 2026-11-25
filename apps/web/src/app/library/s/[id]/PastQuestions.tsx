import { createClient } from "@/lib/supabase/server";

type Solution = { body_md: string; version: number; status: string };
type Question = {
  id: number; q_no: number; part: string; is_or: boolean; marks: number | null; unit: number | null; text: string;
  papers: { exam: string; year: number } | null; solutions: Solution[];
};

export default async function PastQuestions({ subjectId }: { subjectId: number }) {
  const supabase = await createClient();
  const { data } = await supabase.from("questions")
    .select("id, q_no, part, is_or, marks, unit, text, papers!inner(exam, year, subject_id), solutions(body_md, version, status)")
    .eq("papers.subject_id", subjectId);
  const qs = ((data ?? []) as unknown as Question[]).slice().sort((a, b) =>
    (a.unit ?? 0) - (b.unit ?? 0) || (b.papers?.year ?? 0) - (a.papers?.year ?? 0) || a.q_no - b.q_no || a.part.localeCompare(b.part));

  const ids = qs.map((q) => q.id);
  const linked = new Map<number, Set<number>>();
  if (ids.length) {
    const { data: links } = await supabase.from("question_links").select("from_id, to_id")
      .or(`from_id.in.(${ids.join(",")}),to_id.in.(${ids.join(",")})`);
    for (const l of links ?? []) {
      for (const [a, b] of [[l.from_id, l.to_id], [l.to_id, l.from_id]]) {
        if (!linked.has(a)) linked.set(a, new Set());
        linked.get(a)!.add(b);
      }
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold">Past questions</h2>
      {qs.length === 0 && <p className="mt-3 text-sm text-dim">No past questions yet.</p>}
      {qs.map((q, i) => {
        const solution = q.solutions.filter((s) => s.status === "published").sort((a, b) => b.version - a.version)[0];
        const repeats = linked.get(q.id)?.size ?? 0;
        const newUnit = i === 0 || qs[i - 1].unit !== q.unit;
        return (
          <div key={q.id}>
            {newUnit && <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-dim">Unit {q.unit}</h3>}
            <article className="mt-3 rounded-2xl border border-white/10 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
                {q.papers && <span>{q.papers.year}</span>}
                <span className="font-semibold text-fg">Q{q.q_no}({q.part}){q.is_or ? " OR" : ""}</span>
                {q.marks != null && <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-fg">{q.marks} marks</span>}
                {repeats > 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Repeat x{repeats + 1}</span>}
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
