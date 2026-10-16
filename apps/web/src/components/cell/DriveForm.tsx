"use client";

import { useState } from "react";
import { saveDrive } from "./actions";
import { ActionForm, input, label, primary } from "./ui";
import { toLocalInput, type DriveRow } from "./shared";

/** Create or edit a drive: the "company information sheet" row, as a form. */
export default function DriveForm({ drive, branches }: { drive?: DriveRow; branches: string[] }) {
  const [all, setAll] = useState(drive?.all_branches ?? false);
  return (
    <ActionForm action={saveDrive} className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-card p-5">
      {drive && <input type="hidden" name="id" value={drive.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={`${label} sm:col-span-2`}>Company
          <input name="company" required defaultValue={drive?.company} className={input} placeholder="Acme Technologies Pvt Ltd" />
        </label>
        <label className={label}>Drive code
          <input name="code" defaultValue={drive?.code ?? ""} className={input} placeholder="JNID-15-10-2026-01" />
        </label>
        <label className={label}>Type
          <select name="kind" defaultValue={drive?.kind ?? "job"} className={input}>
            <option value="job">Job</option>
            <option value="internship">Internship</option>
            <option value="intern_fte">Intern + FTE</option>
          </select>
        </label>
        <label className={label}>CTC (LPA)
          <input name="ctc_lpa" type="number" step="0.01" min="0" defaultValue={drive?.ctc_lpa ?? ""} className={input} />
        </label>
        <label className={label}>Stipend (₹ a month)
          <input name="stipend_month" type="number" min="0" defaultValue={drive?.stipend_month ?? ""} className={input} />
        </label>
      </div>

      <fieldset className="rounded-xl border border-white/10 p-4">
        <legend className="px-1 text-xs font-semibold text-dim">Eligible branches</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="all_branches" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[#ff5a36]" />
          All branches
        </label>
        {!all && (
          <div className="mt-3 flex flex-wrap gap-3">
            {branches.map((b) => (
              <label key={b} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="branches" value={b} defaultChecked={drive?.branches.includes(b)} className="accent-[#ff5a36]" />
                {b}
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className={label}>Min CGPA
            <input name="min_cgpa" type="number" step="0.01" min="0" max="10" defaultValue={drive?.min_cgpa ?? ""} className={input} />
          </label>
          <label className={label}>Min 10th %
            <input name="min_pct_10" type="number" step="0.01" min="0" max="100" defaultValue={drive?.min_pct_10 ?? ""} className={input} />
          </label>
          <label className={label}>Min 12th %
            <input name="min_pct_12" type="number" step="0.01" min="0" max="100" defaultValue={drive?.min_pct_12 ?? ""} className={input} />
          </label>
          <label className={label}>Max backlogs
            <input name="max_backlogs" type="number" min="0" defaultValue={drive?.max_backlogs ?? ""} className={input} />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>Drive date
          <input name="drive_date" type="date" defaultValue={drive?.drive_date ?? ""} className={input} />
        </label>
        <label className={label}>Registration deadline (India time)
          <input name="deadline" type="datetime-local" defaultValue={toLocalInput(drive?.deadline ?? null)} className={input} />
        </label>
        <label className={label}>Status
          <select name="status" defaultValue={drive?.status ?? "draft"} className={input}>
            <option value="draft">Draft (cell only)</option>
            <option value="open">Open for registration</option>
            <option value="closed">Closed</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className={label}>Location
          <input name="location" defaultValue={drive?.location ?? ""} className={input} placeholder="Bengaluru, Pune" />
        </label>
        <label className={`${label} sm:col-span-2`}>Bond
          <input name="bond" defaultValue={drive?.bond ?? ""} className={input} placeholder="None" />
        </label>
      </div>
      <label className={label}>Description, process, links
        <textarea name="description" rows={5} defaultValue={drive?.description ?? ""} className={input} />
      </label>
      <div><button className={primary}>{drive ? "Save drive" : "Create drive"}</button></div>
    </ActionForm>
  );
}
