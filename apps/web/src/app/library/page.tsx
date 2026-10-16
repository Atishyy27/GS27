import Link from "next/link";
import { BRANCH_OPTIONS, currentSemester } from "@/lib/catalog";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { getCollege } from "@/lib/college";
import NotConfigured from "@/components/library/NotConfigured";

export const metadata = { title: "Library · GS27" };

export default async function Library({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const sp = await searchParams;
  const [v, college] = await Promise.all([getViewer(), getCollege()]);
  const branches = college.branches.length ? college.branches : BRANCH_OPTIONS.map((b) => b.code as string);
  const own = v?.profile?.branch && branches.includes(v.profile.branch) ? v.profile.branch : branches[0];
  const branch = sp.branch && branches.includes(sp.branch) ? sp.branch : own;
  const sameCollege = v?.profile?.college_id === college.id;
  const nowSem = sameCollege && v?.profile?.batch && v.profile.branch === branch ? currentSemester(v.profile.batch) : null;

  const perSem: Record<number, { subjects: number; resources: number }> = {};
  let totalSubjects = 0;
  let totalResources = 0;
  if (hasSupabase) {
    const supabase = await createClient();
    const { data: offs } = await supabase.from("subject_offerings").select("subject_id, semester")
      .eq("college_id", college.id).eq("branch", branch);
    const ids = [...new Set((offs ?? []).map((o) => o.subject_id as number))];
    const { data: res } = ids.length
      ? await supabase.from("v_resources").select("subject_id").in("subject_id", ids)
      : { data: [] as { subject_id: number }[] };
    const files = new Map<number, number>();
    for (const r of res ?? []) files.set(r.subject_id, (files.get(r.subject_id) ?? 0) + 1);
    for (const o of offs ?? []) {
      perSem[o.semester] ??= { subjects: 0, resources: 0 };
      perSem[o.semester].subjects++;
      perSem[o.semester].resources += files.get(o.subject_id) ?? 0;
    }
    totalSubjects = offs?.length ?? 0;
    totalResources = res?.length ?? 0;
  }

  const name = BRANCH_OPTIONS.find((b) => b.code === branch)?.name ?? branch;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">LIBRARY · {college.short_name}</p>
      <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Every subject. Every semester.<br /><span className="text-dim">Built by the students who sat the exam.</span></h1>
      <p className="mt-4 max-w-2xl text-sm text-dim">
        Syllabus, notes, past papers, assignments with solutions and lab files for {college.short_name}, sorted by branch and semester.
        Upload what helped you; vote up what is good.
      </p>
      <p className="mt-3 max-w-2xl rounded-xl border border-white/10 bg-card px-4 py-3 text-xs text-dim">
        Notes are shared across colleges. Syllabi overlap by about 80%, so a subject is one shared page and each college
        maps it to its own branch, semester and code. Thermodynamics notes uploaded anywhere show up for everyone who studies it.
      </p>
      {!hasSupabase && <NotConfigured />}

      <div className="mt-8 flex flex-wrap gap-2">
        {branches.map((b) => (
          <Link key={b} href={`/library?branch=${encodeURIComponent(b)}`}
            className={`rounded-full border px-3 py-1 text-sm ${b === branch ? "border-accent bg-accent/10 text-accent" : "border-white/15 text-dim hover:text-fg"}`}>
            {b}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-xs text-dim">{totalSubjects} subjects · {totalResources} files</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
          const c = perSem[sem] ?? { subjects: 0, resources: 0 };
          const mine = sem === nowSem;
          return (
            <Link key={sem} href={`/library/${encodeURIComponent(branch)}/${sem}`}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${mine ? "border-accent bg-accent/10" : "border-white/10 bg-card hover:border-white/30"}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-dim">Semester</span>
                {mine && <span className="text-[10px] font-bold tracking-wider text-accent">YOU ARE HERE</span>}
              </div>
              <div className="mt-1 text-4xl font-extrabold">{sem}</div>
              <div className="mt-2 text-xs text-dim">{c.subjects} subjects · {c.resources} files</div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
