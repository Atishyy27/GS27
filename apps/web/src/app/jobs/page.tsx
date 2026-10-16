import Link from "next/link";
import { getCollege } from "@/lib/college";
import { hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import JobCard from "@/components/recruit/JobCard";
import { db, JOB_COLUMNS, JOB_KINDS, type JobWithOrg } from "@/components/recruit/data";
import { BackendMissing, Empty } from "@/components/recruit/Notice";

export const metadata = { title: "Jobs · GS27" };

type SP = Promise<{ kind?: string; remote?: string; mine?: string }>;

export default async function JobsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const college = await getCollege();
  let jobs: JobWithOrg[] = [];
  type Stats = { verified_orgs: number; published_jobs: number; visible_talent: number };
  let stats: Stats | null = null;
  const supabase = await db();
  if (supabase) {
    let q = supabase.from("jobs").select(`${JOB_COLUMNS}, organizations!inner(name, slug, logo_url, verified)`)
      .eq("status", "published").eq("organizations.verified", true).order("created_at", { ascending: false }).limit(100);
    if (sp.kind && JOB_KINDS.some((k) => k.kind === sp.kind)) q = q.eq("kind", sp.kind);
    if (sp.remote === "1") q = q.eq("remote", true);
    const { data } = await q;
    jobs = (data as unknown as JobWithOrg[]) ?? [];
    // "My college": jobs open to every college or naming this one
    if (sp.mine === "1") jobs = jobs.filter((j) => j.colleges.length === 0 || j.colleges.includes(college.id));
    const { data: s } = await supabase.rpc("public_recruit_stats");
    stats = (s as Stats[] | null)?.[0] ?? null;
  }

  const href = (patch: Record<string, string | undefined>) => {
    const next = { ...sp, ...patch };
    const qs = Object.entries(next).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
    return `/jobs${qs ? `?${qs}` : ""}`;
  };
  const pill = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-accent text-accent" : "border-white/15 text-dim hover:text-fg"}`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">JOBS</p>
      <h1 className="mt-2 text-4xl font-extrabold">Jobs from verified companies</h1>
      <p className="mt-3 max-w-2xl text-sm text-dim">
        Every company here was checked by GS27 before it could post. You apply with your talent profile, which is separate from your anonymous handle.
      </p>
      {stats && (
        <p className="mt-3 text-sm text-faint">{stats.verified_orgs} verified companies · {stats.published_jobs} open jobs · {stats.visible_talent} students visible to recruiters</p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={href({ kind: undefined })} className={pill(!sp.kind)}>All</Link>
        {JOB_KINDS.map((k) => <Link key={k.kind} href={href({ kind: k.kind })} className={pill(sp.kind === k.kind)}>{k.label}</Link>)}
        <Link href={href({ remote: sp.remote === "1" ? undefined : "1" })} className={pill(sp.remote === "1")}>Remote</Link>
        <Link href={href({ mine: sp.mine === "1" ? undefined : "1" })} className={pill(sp.mine === "1")}>Open to {college.short_name}</Link>
        <span className="flex-1" />
        {viewer ? <Link href="/talent" className="text-sm text-accent hover:underline">My talent profile</Link> : null}
        <Link href="/recruit" className="text-sm text-dim hover:text-fg">Hiring? Post a job</Link>
      </div>
      <div className="mt-6 space-y-3">
        {!hasSupabase ? <BackendMissing /> : jobs.length === 0 ? <Empty>No open jobs match. Check back soon.</Empty> : jobs.map((j) => <JobCard key={j.id} j={j} />)}
      </div>
    </main>
  );
}
