import Link from "next/link";
import { listColleges } from "@/lib/college";
import { hasSupabase, createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/viewer";
import ActionForm from "@/components/recruit/ActionForm";
import TalentCard from "@/components/recruit/TalentCard";
import { deleteTalent, saveTalent, withdraw } from "@/components/recruit/actions";
import { JOB_COLUMNS, myApplications, myTalent, type Job, type Talent } from "@/components/recruit/data";
import { BackendMissing } from "@/components/recruit/Notice";
import { card, input, label } from "@/components/recruit/styles";

export const metadata = { title: "Talent profile · GS27" };

export default async function TalentPage() {
  if (!hasSupabase) {
    return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24"><h1 className="text-3xl font-extrabold">Talent profile</h1><div className="mt-6"><BackendMissing /></div></main>;
  }
  const v = await requireOnboarded("/talent");
  const [t, apps, colleges] = await Promise.all([myTalent(), myApplications(), listColleges()]);
  const supabase = await createClient();
  const { data: jobs } = apps.length
    ? await supabase.from("jobs").select(`${JOB_COLUMNS}, organizations(name)`).in("id", apps.map((a) => a.job_id))
    : { data: [] };
  const college = colleges.find((c) => c.id === (t?.college_id ?? v.profile.college_id))?.short_name;
  const preview: Talent = t ?? {
    id: "", visible: false, display_name: "Your name", headline: "One line about you", college_id: v.profile.college_id,
    branch: v.profile.branch, batch: v.profile.batch, skills: [], links: {}, leetcode_handle: null, codeforces_handle: null,
    resume_url: null, updated_at: "",
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">FOR RECRUITERS</p>
      <h1 className="mt-2 text-4xl font-extrabold">Your talent profile</h1>
      <div className="mt-4 max-w-3xl space-y-2 text-sm text-dim">
        <p>This is separate from your GS27 handle. Your posts stay anonymous. This profile is off until you switch it on.</p>
        <p>When it is on, only recruiters from organizations GS27 has verified can see it, and you can apply to jobs. Other students never see it. Nothing links it to your handle.</p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className={card}>
          <ActionForm action={saveTalent} submit="Save profile">
            <label className="flex items-center gap-3 rounded-xl border border-white/15 p-3 text-sm">
              <input type="checkbox" name="visible" defaultChecked={t?.visible ?? false} className="h-5 w-5 accent-[#3dd68c]" />
              <span><b className="text-fg">Visible to verified recruiters</b><br /><span className="text-dim">Off by default. Turn off any time.</span></span>
            </label>
            <label className={label}>Name recruiters see
              <input name="display_name" required minLength={2} maxLength={80} defaultValue={t?.display_name ?? ""} className={input} />
            </label>
            <label className={label}>Headline
              <input name="headline" maxLength={140} defaultValue={t?.headline ?? ""} placeholder="Backend, Go and Postgres. ICPC regionalist." className={input} />
            </label>
            <label className={label}>Skills (comma separated)
              <input name="skills" defaultValue={t?.skills.join(", ") ?? ""} placeholder="python, react, sql" className={input} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>LeetCode username<input name="leetcode_handle" defaultValue={t?.leetcode_handle ?? ""} className={input} /></label>
              <label className={label}>Codeforces handle<input name="codeforces_handle" defaultValue={t?.codeforces_handle ?? ""} className={input} /></label>
              <label className={label}>GitHub<input name="github" defaultValue={t?.links.github ?? ""} placeholder="github.com/you" className={input} /></label>
              <label className={label}>LinkedIn<input name="linkedin" defaultValue={t?.links.linkedin ?? ""} className={input} /></label>
              <label className={label}>Portfolio<input name="portfolio" defaultValue={t?.links.portfolio ?? ""} className={input} /></label>
              <label className={label}>Resume link (Drive, PDF)<input name="resume_url" defaultValue={t?.resume_url ?? ""} className={input} /></label>
            </div>
            <p className="text-xs text-faint">College, branch and batch come from your GS27 profile and cannot be edited here.</p>
          </ActionForm>
          {t && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <ActionForm action={deleteTalent} submit="Delete talent profile" confirm="Delete your talent profile and all your applications?"
                buttonClassName="rounded-full border border-white/20 px-4 py-2 text-sm text-dim hover:border-accent hover:text-accent" />
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.2em] text-dim">WHAT RECRUITERS SEE</p>
            <TalentCard t={preview} college={college} />
            <p className="mt-2 text-xs text-faint">{t?.visible ? "Visible now." : "Hidden now: nobody but you sees this."}</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold tracking-[0.2em] text-dim">MY APPLICATIONS</p>
              <Link href="/jobs" className="text-xs text-accent hover:underline">Browse jobs</Link>
            </div>
            {apps.length === 0 ? <p className="text-sm text-faint">None yet.</p> : (
              <ul className="space-y-2">
                {apps.map((a) => {
                  const j = (jobs as (Job & { organizations: { name: string } | null })[] | null)?.find((x) => x.id === a.job_id);
                  return (
                    <li key={a.id} className="rounded-xl border border-white/10 p-3 text-sm">
                      <Link href={`/jobs/${a.job_id}`} className="font-semibold hover:underline">{j?.title ?? `Job ${a.job_id}`}</Link>
                      <span className="text-dim"> · {j?.organizations?.name ?? ""}</span>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-accent">{a.status}</span>
                        {a.status !== "withdrawn" && a.status !== "hired" && (
                          <ActionForm action={withdraw} submit="Withdraw" className="" buttonClassName="text-xs text-faint hover:text-accent">
                            <input type="hidden" name="id" value={a.id} />
                          </ActionForm>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
