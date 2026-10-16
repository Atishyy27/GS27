import Link from "next/link";
import { cellContext, PROFILE_COLS, type PlacementProfile } from "@/components/cell/data";
import Gate, { NOT_CONFIGURED } from "@/components/cell/Gate";
import { ActionForm, input, label, primary } from "@/components/cell/ui";
import { savePlacementProfile } from "@/components/cell/actions";

export const metadata = { title: "Placement profile · GS27" };

export default async function PlacementProfilePage() {
  const ctx = await cellContext();
  if (!ctx.configured) return <Gate title="Placement profile">{NOT_CONFIGURED}</Gate>;
  if (!ctx.viewer) return <Gate title="Placement profile" next="/drives/profile">Sign in to fill your placement profile.</Gate>;
  const p = ctx.viewer.profile;
  if (!p?.college_id) {
    return <Gate title="Placement profile">Pick your college first. <Link href="/onboarding?next=/drives/profile" className="text-accent hover:underline">Finish setup</Link>.</Gate>;
  }
  const { data } = await ctx.supabase.from("placement_profiles").select(PROFILE_COLS).eq("user_id", ctx.viewer.userId).maybeSingle();
  const pp = data as PlacementProfile | null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-24">
      <Link href="/drives" className="text-sm text-dim hover:text-fg">← Drives</Link>
      <p className="mt-4 text-xs font-bold tracking-[0.2em] text-accent">{ctx.college.short_name} · PRIVATE</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Placement profile</h1>
      <div className="mt-4 rounded-2xl border border-white/10 bg-card p-4 text-sm text-dim">
        <p className="font-semibold text-fg">Who sees this</p>
        <p className="mt-1">
          Only you and the {ctx.college.short_name} placement cell. It is never shown next to your handle, your posts or
          anything public, and other students cannot read it. Companies get it only through the cell, as with the poll form today.
        </p>
      </div>
      <ActionForm action={savePlacementProfile} className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>Full name (as in college records)
            <input name="full_name" required minLength={2} maxLength={100} defaultValue={pp?.full_name ?? ""} className={input} />
          </label>
          <label className={label}>Enrollment number
            <input name="enrollment_no" required pattern="[A-Za-z0-9]{6,20}" defaultValue={pp?.enrollment_no ?? ""} className={`${input} font-mono`} placeholder="0801CS231001" />
          </label>
          <label className={label}>Phone
            <input name="phone" pattern="[0-9+ \-]{8,16}" defaultValue={pp?.phone ?? ""} className={input} />
          </label>
          <label className={label}>CGPA
            <input name="cgpa" type="number" step="0.01" min="0" max="10" defaultValue={pp?.cgpa ?? ""} className={input} />
          </label>
          <label className={label}>Active backlogs
            <input name="backlogs" type="number" min="0" defaultValue={pp?.backlogs ?? 0} className={input} />
          </label>
          <label className={label}>10th %
            <input name="pct_10" type="number" step="0.01" min="0" max="100" defaultValue={pp?.pct_10 ?? ""} className={input} />
          </label>
          <label className={label}>12th / diploma %
            <input name="pct_12" type="number" step="0.01" min="0" max="100" defaultValue={pp?.pct_12 ?? ""} className={input} />
          </label>
          <label className={`${label} sm:col-span-2`}>Resume link (Drive, PDF)
            <input name="resume_url" type="url" defaultValue={pp?.resume_url ?? ""} className={input} placeholder="https://" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm text-dim">
          <input type="checkbox" name="consent" required className="mt-1 accent-[#ff5a36]" />
          I agree that the {ctx.college.short_name} placement cell may use these details to check my eligibility and share them
          with companies I register for. I can edit or delete this profile at any time.
        </label>
        <div><button className={primary}>Save profile</button></div>
        {pp && <p className="text-xs text-faint">Last saved {new Date(pp.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.</p>}
      </ActionForm>
    </main>
  );
}
