import Link from "next/link";
import { notFound } from "next/navigation";
import { listColleges } from "@/lib/college";
import { ago } from "@/lib/time";
import ActionForm from "@/components/recruit/ActionForm";
import JobForm from "@/components/recruit/JobForm";
import OrgNav from "@/components/recruit/OrgNav";
import TalentCard from "@/components/recruit/TalentCard";
import { deleteJob, setStatus } from "@/components/recruit/actions";
import { db, JOB_COLUMNS, TALENT_COLUMNS, type Application, type AppStatus, type Job, type Talent } from "@/components/recruit/data";
import { Empty } from "@/components/recruit/Notice";
import { requireOrg } from "@/components/recruit/orgPage";
import { card, input } from "@/components/recruit/styles";

const FILTERS: (AppStatus | "all")[] = ["all", "applied", "shortlisted", "hired", "rejected", "withdrawn"];

export default async function JobAdmin({ params, searchParams }: {
  params: Promise<{ id: string; job: string }>; searchParams: Promise<{ status?: string; edit?: string }>;
}) {
  const { id, job: jobParam } = await params;
  const sp = await searchParams;
  const org = await requireOrg(id, `/recruit/o/${id}/jobs/${jobParam}`);
  const supabase = (await db())!;
  const { data } = await supabase.from("jobs").select(JOB_COLUMNS).eq("id", Number(jobParam)).eq("org_id", org.id).maybeSingle();
  const job = data as Job | null;
  if (!job) notFound();

  const { data: appRows } = await supabase.from("applications").select("id, job_id, talent_id, note, status, created_at, updated_at")
    .eq("job_id", job.id).order("created_at", { ascending: false });
  const apps = (appRows as Application[]) ?? [];
  // A withdrawn or since-hidden profile may no longer be readable; the application row stays.
  const { data: talentRows } = apps.length
    ? await supabase.from("talent_profiles").select(TALENT_COLUMNS).in("id", apps.map((a) => a.talent_id))
    : { data: [] };
  const talents = (talentRows as Talent[]) ?? [];
  const colleges = await listColleges();
  const filter = FILTERS.includes(sp.status as AppStatus) ? sp.status : "all";
  const shown = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-24">
      <OrgNav org={org} active="jobs" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{job.title}</h2>
          <p className="text-sm text-dim">Status: <b className="uppercase">{job.status}</b> · <Link href={`/jobs/${job.id}`} className="text-accent hover:underline">public page</Link></p>
        </div>
        <Link href={`?edit=${sp.edit ? "" : "1"}`} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white/50">
          {sp.edit ? "Close editor" : "Edit job"}
        </Link>
      </div>

      {sp.edit && (
        <div className={`mt-6 ${card}`}>
          <JobForm orgId={org.id} verified={org.verified} job={job} colleges={colleges} />
          <div className="mt-6 border-t border-white/10 pt-4">
            <ActionForm action={deleteJob} submit="Delete job" confirm="Delete this job and its applications?"
              buttonClassName="rounded-full border border-white/20 px-4 py-2 text-sm text-dim hover:border-accent hover:text-accent">
              <input type="hidden" name="org_id" value={org.id} />
              <input type="hidden" name="job_id" value={job.id} />
            </ActionForm>
          </div>
        </div>
      )}

      <h3 className="mt-10 text-sm font-bold tracking-[0.2em] text-dim">APPLICANTS ({apps.length})</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f === "all" ? apps.length : apps.filter((a) => a.status === f).length;
          return (
            <Link key={f} href={`?status=${f}`}
              className={`rounded-full border px-3 py-1 text-sm capitalize ${filter === f ? "border-accent text-accent" : "border-white/15 text-dim hover:text-fg"}`}>
              {f} {n}
            </Link>
          );
        })}
      </div>
      <div className="mt-4 space-y-4">
        {shown.length === 0 ? <Empty>No applicants here.</Empty> : shown.map((a) => {
          const t = talents.find((x) => x.id === a.talent_id);
          return (
            <div key={a.id} className="space-y-2">
              {t ? <TalentCard t={t} college={colleges.find((c) => c.id === t.college_id)?.short_name} />
                : <p className="rounded-2xl border border-white/10 p-4 text-sm text-faint">The student hid their talent profile.</p>}
              <div className="flex flex-wrap items-center gap-3 px-2 text-sm">
                <span className="text-faint">applied {ago(a.created_at)}</span>
                {a.note && <span className="text-dim">“{a.note}”</span>}
                <span className="flex-1" />
                {a.status === "withdrawn" ? <span className="text-xs uppercase text-faint">withdrawn</span> : (
                  <ActionForm action={setStatus} submit="Update" className="flex items-center gap-2"
                    buttonClassName="rounded-full border border-white/20 px-3 py-1 text-xs hover:border-white/50">
                    <input type="hidden" name="id" value={a.id} />
                    <select name="status" defaultValue={a.status} className={`${input} w-auto py-1 text-sm`}>
                      {(["applied", "shortlisted", "rejected", "hired"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </ActionForm>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
