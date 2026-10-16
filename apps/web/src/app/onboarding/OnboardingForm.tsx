"use client";

import { useActionState, useState } from "react";
import { BATCH_OPTIONS, BRANCH_OPTIONS } from "@/lib/catalog";
import { saveOnboarding, type OnboardState } from "./actions";

type CollegeOpt = { id: number; short_name: string; name: string; city: string | null; branches: string[] };

type Props = {
  colleges: CollegeOpt[];
  /** Set when the profile already has a college it cannot change (verified by email). */
  fixedCollegeId: number | null;
  defaultCollegeId: number | null;
  defaultBranch: string | null;
  defaultBatch: number | null;
  next: string;
};

const branchName = (code: string) => BRANCH_OPTIONS.find((b) => b.code === code)?.name ?? code;
const field = "rounded-xl border border-white/15 bg-card px-3 py-3 text-base text-fg";

export default function OnboardingForm({ colleges, fixedCollegeId, defaultCollegeId, defaultBranch, defaultBatch, next }: Props) {
  const [state, action, pending] = useActionState<OnboardState, FormData>(saveOnboarding, undefined);
  const [collegeId, setCollegeId] = useState<number | null>(fixedCollegeId ?? defaultCollegeId);
  const college = colleges.find((c) => c.id === collegeId);
  const branches = college?.branches.length ? college.branches : BRANCH_OPTIONS.map((b) => b.code as string);
  const fixed = fixedCollegeId !== null ? colleges.find((c) => c.id === fixedCollegeId) : undefined;

  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {fixed ? (
        <div className="flex flex-col gap-2 text-sm text-dim">College
          <input type="hidden" name="college_id" value={fixed.id} />
          <p className="rounded-xl border border-good/30 bg-good/5 px-3 py-3 text-base text-fg">
            {fixed.name} <span className="text-sm text-good">· verified via your college email</span>
          </p>
        </div>
      ) : (
        <label className="flex flex-col gap-2 text-sm text-dim">College
          <select name="college_id" required value={collegeId ?? ""} onChange={(e) => setCollegeId(Number(e.target.value) || null)} className={field}>
            <option value="" disabled>Choose</option>
            {colleges.map((c) => <option key={c.id} value={c.id}>{c.short_name} · {c.name}{c.city ? `, ${c.city}` : ""}</option>)}
          </select>
          <span className="text-xs text-faint">You stay unverified until you link your college Google account from your profile.</span>
        </label>
      )}
      <label className="flex flex-col gap-2 text-sm text-dim">Branch
        <select key={collegeId ?? 0} name="branch" defaultValue={defaultBranch && branches.includes(defaultBranch) ? defaultBranch : ""} required className={field}>
          <option value="" disabled>Choose</option>
          {branches.map((code) => <option key={code} value={code}>{code} · {branchName(code)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-dim">Batch (passing-out year)
        <select name="batch" defaultValue={defaultBatch ?? ""} required className={field}>
          <option value="" disabled>Choose</option>
          {BATCH_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <button disabled={pending} className="mt-2 rounded-xl bg-accent px-4 py-3 font-bold text-bg disabled:opacity-50">
        {pending ? "Saving..." : "Continue"}
      </button>
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
    </form>
  );
}
