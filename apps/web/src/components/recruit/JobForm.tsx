import type { College } from "@/lib/college";
import { BATCH_OPTIONS } from "@/lib/catalog";
import ActionForm from "./ActionForm";
import { saveJob } from "./actions";
import { JOB_KINDS, type Job } from "./data";
import { input, label } from "./styles";

/** Create or edit a job. Publishing is refused by the database until the org is verified. */
export default function JobForm({ orgId, verified, job, colleges }: { orgId: number; verified: boolean; job?: Job; colleges: College[] }) {
  const branches = [...new Set(colleges.flatMap((c) => c.branches))];
  const box = "flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-sm text-dim has-[:checked]:border-accent has-[:checked]:text-accent";
  return (
    <ActionForm action={saveJob} submit={job ? "Save job" : "Create job"} className="flex flex-col gap-4">
      <input type="hidden" name="org_id" value={orgId} />
      {job && <input type="hidden" name="job_id" value={job.id} />}
      <label className={label}>Title<input name="title" required minLength={3} maxLength={120} defaultValue={job?.title} className={input} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>Type
          <select name="kind" defaultValue={job?.kind ?? "internship"} className={input}>
            {JOB_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
        </label>
        <label className={label}>CTC (LPA)<input name="ctc_lpa" type="number" step="0.01" min={0} defaultValue={job?.ctc_lpa ?? ""} className={input} /></label>
        <label className={label}>Stipend (₹ per month)<input name="stipend_month" type="number" min={0} defaultValue={job?.stipend_month ?? ""} className={input} /></label>
        <label className={label}>Location<input name="location" maxLength={120} defaultValue={job?.location ?? ""} className={input} /></label>
        <label className={label}>Apply by<input name="deadline" type="date" defaultValue={job?.deadline ?? ""} className={input} /></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-dim">
          <input type="checkbox" name="remote" defaultChecked={job?.remote} className="accent-[#ff5a36]" /> Remote
        </label>
      </div>
      <label className={label}>Description<textarea name="description" rows={6} maxLength={8000} defaultValue={job?.description ?? ""} className={input} /></label>
      <label className={label}>Skills (comma separated)<input name="skills" defaultValue={job?.skills.join(", ")} className={input} /></label>

      <fieldset className="space-y-2">
        <legend className="text-sm text-dim">Colleges (none ticked = all colleges)</legend>
        <div className="flex flex-wrap gap-2">
          {colleges.map((c) => (
            <label key={c.id} className={box}><input type="checkbox" name="colleges" value={c.id} defaultChecked={job?.colleges.includes(c.id)} className="hidden" />{c.short_name}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm text-dim">Branches (none ticked = all branches)</legend>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <label key={b} className={box}><input type="checkbox" name="branches" value={b} defaultChecked={job?.branches.includes(b)} className="hidden" />{b}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm text-dim">Batches (none ticked = all batches)</legend>
        <div className="flex flex-wrap gap-2">
          {BATCH_OPTIONS.map((y) => (
            <label key={y} className={box}><input type="checkbox" name="batches" value={y} defaultChecked={job?.batches.includes(y)} className="hidden" />{y}</label>
          ))}
        </div>
      </fieldset>

      <label className={label}>Status
        <select name="status" defaultValue={job?.status ?? "draft"} className={input}>
          <option value="draft">Draft (only your team sees it)</option>
          <option value="published" disabled={!verified}>Published{verified ? "" : " (after verification)"}</option>
          <option value="closed">Closed</option>
        </select>
      </label>
    </ActionForm>
  );
}
