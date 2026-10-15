import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANCH_OPTIONS, RESOURCE_KINDS } from "@/lib/catalog";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import NotConfigured from "@/components/library/NotConfigured";
import AddSubjectForm from "@/components/library/AddSubjectForm";

type Subject = { id: number; name: string; code: string | null };

export async function generateMetadata({ params }: { params: Promise<{ branch: string; sem: string }> }) {
  const { branch, sem } = await params;
  return { title: `${decodeURIComponent(branch)} Sem ${sem} · Library · GS27` };
}

export default async function SemesterPage({ params }: { params: Promise<{ branch: string; sem: string }> }) {
  const p = await params;
  const branch = decodeURIComponent(p.branch);
  const sem = Number(p.sem);
  const info = BRANCH_OPTIONS.find((b) => b.code === branch);
  if (!info || !Number.isInteger(sem) || sem < 1 || sem > 8) notFound();

  const v = await getViewer();
  const onboarded = Boolean(v?.profile?.branch && v?.profile?.batch);

  let subjects: Subject[] = [];
  const counts = new Map<number, Record<string, number>>();
  if (hasSupabase) {
    const supabase = await createClient();
    const { data } = await supabase.from("subjects").select("id, name, code").eq("branch", branch).eq("semester", sem).order("name");
    subjects = (data ?? []) as Subject[];
    const ids = subjects.map((s) => s.id);
    if (ids.length) {
      const { data: res } = await supabase.from("v_resources").select("subject_id, kind").in("subject_id", ids);
      for (const r of res ?? []) {
        const m = counts.get(r.subject_id) ?? {};
        m[r.kind] = (m[r.kind] ?? 0) + 1;
        counts.set(r.subject_id, m);
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
      <nav className="text-xs text-dim">
        <Link href={`/library?branch=${branch}`} className="hover:text-fg">Library</Link> / {branch} / Semester {sem}
      </nav>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{info.name}<span className="text-dim"> · Sem {sem}</span></h1>
      {!hasSupabase && <NotConfigured />}

      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <Link key={s} href={`/library/${branch}/${s}`}
            className={`rounded-full border px-3 py-1 text-sm ${s === sem ? "border-accent text-accent" : "border-white/15 text-dim hover:text-fg"}`}>
            {s}
          </Link>
        ))}
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        {subjects.map((s) => {
          const c = counts.get(s.id) ?? {};
          const total = Object.values(c).reduce((a, b) => a + b, 0);
          return (
            <Link key={s.id} href={`/library/s/${s.id}`} className="rounded-2xl border border-white/10 bg-card p-4 hover:border-white/30">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">{s.name}</h2>
                {s.code && <span className="text-xs text-faint">{s.code}</span>}
              </div>
              <p className="mt-1 text-xs text-dim">{total} {total === 1 ? "resource" : "resources"}</p>
              {total > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {RESOURCE_KINDS.filter((k) => c[k.kind]).map((k) => (
                    <span key={k.kind} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-dim">{k.label} {c[k.kind]}</span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
        {hasSupabase && subjects.length === 0 && (
          <p className="text-sm text-dim sm:col-span-2">No subjects here yet. Add the first one below.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wide text-dim">Missing a subject?</h2>
        {onboarded ? (
          <AddSubjectForm branch={branch} semester={sem} />
        ) : (
          <p className="mt-2 text-sm text-dim">
            <Link href={v ? `/onboarding?next=/library/${branch}/${sem}` : `/login?next=/library/${branch}/${sem}`} className="text-accent hover:underline">
              {v ? "Finish your profile" : "Sign in"}
            </Link>{" "}to add subjects and upload files.
          </p>
        )}
      </section>
    </main>
  );
}
