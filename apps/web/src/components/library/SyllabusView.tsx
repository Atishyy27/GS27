import type { Syllabus } from "@/lib/data/types";

export default function SyllabusView({ syllabi, error }: { syllabi: Syllabus[]; error?: string | null }) {
  if (error) return <section className="mt-6"><p role="alert" className="text-sm text-accent">Could not load the syllabus. Try again in a minute.</p></section>;
  if (syllabi.length === 0) return null;
  return (
    <section className="mt-6 flex flex-col gap-3" aria-label="Syllabus">
      {syllabi.map((s) => (
        <article key={s.id} className="rounded-2xl border border-white/10 bg-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-bold">Syllabus</h2>
            <span className="text-xs text-dim">{s.name} · {s.code} · {s.branch} · scheme {s.scheme_year}</span>
          </div>
          <p className="mt-1 text-xs text-dim">
            {s.ltp && <>L-T-P {s.ltp}</>}{s.credits_total != null && <> · {s.credits_total} credits</>}{s.prerequisites && <> · prerequisites: {s.prerequisites}</>}
          </p>
          <ol className="mt-3 flex flex-col gap-3">
            {s.units.map((u) => (
              <li key={u.no} className="text-sm">
                <span className="font-semibold text-fg">Unit {u.no}</span>
                <p className="mt-0.5 whitespace-pre-line text-dim">{u.text}</p>
              </li>
            ))}
          </ol>
          {s.source_url && (
            <p className="mt-3 text-xs text-dim">
              Source: SGSITS scheme &amp; syllabus {s.scheme_year}{s.source_page && <>, page {s.source_page}</>}.{" "}
              <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Open the PDF ↗</a>
              {s.source_note && <> {s.source_note}</>}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
