import Link from "next/link";
import JobCard from "@/components/recruit/JobCard";
import OrgNav from "@/components/recruit/OrgNav";
import { db, JOB_COLUMNS, type JobWithOrg } from "@/components/recruit/data";
import { Empty } from "@/components/recruit/Notice";
import { requireOrg } from "@/components/recruit/orgPage";

export default async function OrgJobs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg(id, `/recruit/o/${id}`);
  const supabase = (await db())!;
  const { data } = await supabase.from("jobs").select(`${JOB_COLUMNS}, organizations(name, slug, logo_url, verified)`)
    .eq("org_id", org.id).order("created_at", { ascending: false });
  const jobs = (data as unknown as JobWithOrg[]) ?? [];
  const { data: apps } = jobs.length
    ? await supabase.from("applications").select("job_id, status").in("job_id", jobs.map((j) => j.id))
    : { data: [] };
  const count = (jobId: number) => (apps ?? []).filter((a) => a.job_id === jobId && a.status !== "withdrawn").length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-24">
      <OrgNav org={org} active="jobs" />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-[0.2em] text-dim">JOBS ({jobs.length})</h2>
        <Link href={`/recruit/o/${org.id}/jobs/new`} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-bg">New job</Link>
      </div>
      <div className="mt-4 space-y-3">
        {jobs.length === 0 ? <Empty>No jobs yet.</Empty> : jobs.map((j) => (
          <div key={j.id}>
            <JobCard j={j} href={`/recruit/o/${org.id}/jobs/${j.id}`} />
            <p className="mt-1 px-2 text-xs text-faint">{count(j.id)} active applicants</p>
          </div>
        ))}
      </div>
    </main>
  );
}
