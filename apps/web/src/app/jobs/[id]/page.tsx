import Link from "next/link";
import { notFound } from "next/navigation";
import { listColleges } from "@/lib/college";
import { hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import ActionForm from "@/components/recruit/ActionForm";
import { applyToJob } from "@/components/recruit/actions";
import { db, JOB_COLUMNS, JOB_KINDS, myApplications, myTalent, pay, type JobWithOrg } from "@/components/recruit/data";
import { BackendMissing, SignIn } from "@/components/recruit/Notice";
import { chip, input } from "@/components/recruit/styles";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId < 1) notFound();
  if (!hasSupabase) return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24"><BackendMissing /></main>;

  const supabase = (await db())!;
  const { data } = await supabase.from("jobs").select(`${JOB_COLUMNS}, organizations(name, slug, logo_url, verified, website)`).eq("id", jobId).maybeSingle();
  const j = data as unknown as (JobWithOrg & { organizations: { website: string | null } | null }) | null;
  if (!j) notFound();

  const [viewer, colleges] = await Promise.all([getViewer(), listColleges()]);
  const onboarded = Boolean(viewer?.profile?.branch && viewer.profile.batch && viewer.profile.college_id);
  const [talent, apps] = viewer ? await Promise.all([myTalent(), myApplications()]) : [null, []];
  const mine = apps.find((a) => a.job_id === j.id);
  const kind = JOB_KINDS.find((k) => k.kind === j.kind)?.label ?? j.kind;
  const collegeNames = j.colleges.map((c) => colleges.find((x) => x.id === c)?.short_name ?? `#${c}`);
  const open = j.status === "published" && !(j.deadline && new Date(j.deadline) < new Date(new Date().toDateString()));

  // Mirrors the database check in guard_application(), so students see why before they try.
  const reasons: string[] = [];
  if (talent) {
    if (j.colleges.length && !j.colleges.includes(talent.college_id ?? -1)) reasons.push("not open to your college");
    if (j.branches.length && !j.branches.includes(talent.branch ?? "")) reasons.push("not open to your branch");
    if (j.batches.length && !j.batches.includes(talent.batch ?? -1)) reasons.push("not open to your batch");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24">
      <Link href="/jobs" className="text-sm text-dim hover:text-fg">← All jobs</Link>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-dim">
        <span className="font-semibold text-fg">{j.organizations?.name}</span>
        {j.organizations?.verified && <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">✓ verified</span>}
        {j.organizations?.website && <a href={j.organizations.website} target="_blank" rel="noreferrer" className="hover:text-fg">{j.organizations.website.replace(/^https?:\/\//, "")}</a>}
      </div>
      <h1 className="mt-2 text-4xl font-extrabold">{j.title}</h1>
      <p className="mt-3 text-dim">{kind} · {pay(j)} · {j.remote ? "Remote" : j.location ?? "Location not stated"}</p>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-card p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-faint">Colleges</dt><dd>{collegeNames.length ? collegeNames.join(", ") : "All colleges"}</dd></div>
        <div><dt className="text-faint">Branches</dt><dd>{j.branches.length ? j.branches.join(", ") : "All branches"}</dd></div>
        <div><dt className="text-faint">Batches</dt><dd>{j.batches.length ? j.batches.join(", ") : "All batches"}</dd></div>
        <div><dt className="text-faint">Deadline</dt><dd>{j.deadline ? new Date(j.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "None"}</dd></div>
      </dl>
      {j.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{j.skills.map((s) => <span key={s} className={chip}>{s}</span>)}</div>}
      {j.description && <div className="mt-6 whitespace-pre-wrap leading-relaxed">{j.description}</div>}

      <section className="mt-10">
        {j.status === "draft" ? (
          <p className="rounded-2xl border border-white/10 p-4 text-sm text-dim">Draft: only your organization sees this.</p>
        ) : mine ? (
          <p className="rounded-2xl border border-good/40 p-4 text-sm">You applied. Status: <b className="uppercase text-good">{mine.status}</b>. <Link href="/talent" className="text-accent hover:underline">Manage</Link></p>
        ) : !open ? (
          <p className="rounded-2xl border border-white/10 p-4 text-sm text-dim">Applications are closed.</p>
        ) : !viewer ? (
          <SignIn next={`/jobs/${j.id}`} text="Sign in to apply with your talent profile." />
        ) : !onboarded ? (
          <p className="rounded-2xl border border-white/10 p-4 text-sm text-dim">Finish your profile first. <Link href={`/onboarding?next=/jobs/${j.id}`} className="text-accent hover:underline">Set college, branch and batch</Link></p>
        ) : !talent || !talent.visible ? (
          <p className="rounded-2xl border border-white/10 p-4 text-sm text-dim">You apply with your talent profile, and it must be switched on. <Link href="/talent" className="text-accent hover:underline">{talent ? "Turn it on" : "Create it"}</Link></p>
        ) : reasons.length ? (
          <p className="rounded-2xl border border-white/10 p-4 text-sm text-dim">You cannot apply: this job is {reasons.join(", ")}.</p>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-card p-5">
            <h2 className="font-bold">Apply as {talent.display_name}</h2>
            <p className="mt-1 text-sm text-dim">The recruiter sees your talent profile. They never see your GS27 handle or posts.</p>
            <ActionForm action={applyToJob} submit="Apply" pendingLabel="Applying..." className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="job_id" value={j.id} />
              <textarea name="note" maxLength={1000} rows={3} placeholder="Optional note to the recruiter" className={input} />
            </ActionForm>
          </div>
        )}
      </section>
    </main>
  );
}
