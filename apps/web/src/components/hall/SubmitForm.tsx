"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BATCH_OPTIONS, BRANCH_OPTIONS } from "@/lib/catalog";
import { submitProject } from "./actions";
import type { HallState } from "./data";

const field = "rounded-xl border border-white/15 bg-card px-3 py-2.5 text-base text-fg placeholder:text-faint";
const label = "flex flex-col gap-1.5 text-sm text-dim";

export default function SubmitForm({ branch, batch }: { branch: string | null; batch: number | null }) {
  const [state, action, pending] = useActionState<HallState, FormData>(submitProject, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-good/40 bg-good/10 p-6">
        <p className="text-lg font-bold text-good">Submitted. Waiting for a mod to approve.</p>
        <p className="mt-2 text-sm text-dim">It shows in the Hall of Fame once a mod approves it.</p>
        <Link href="/hall" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">Back to the Hall of Fame</Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={label}>Project name *
        <input name="name" required minLength={2} maxLength={80} className={field} placeholder="PRD Helper" />
      </label>
      <label className={label}>One line on what it does
        <input name="tagline" maxLength={120} className={field} placeholder="Chrome extension that fills the placement form for you" />
      </label>
      <label className={label}>Description
        <textarea name="description" maxLength={2000} rows={5} className={field} placeholder="What problem it solves, who uses it, what it is built with." />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Live link
          <input name="url" type="url" className={field} placeholder="https://..." />
        </label>
        <label className={label}>Code link
          <input name="repo_url" type="url" className={field} placeholder="https://github.com/..." />
        </label>
      </div>
      <label className={label}>Image link (optional, a screenshot or logo)
        <input name="image_url" type="url" className={field} placeholder="https://..." />
      </label>
      <label className={label}>Built by (shown publicly, write it the way the builders want credit)
        <input name="builders" maxLength={200} className={field} placeholder="Name, batch; Name, batch" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>Branch
          <select name="branch" defaultValue={branch ?? ""} className={field}>
            <option value="">Not set</option>
            {BRANCH_OPTIONS.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}
          </select>
        </label>
        <label className={label}>Batch
          <select name="batch" defaultValue={batch ?? ""} className={field}>
            <option value="">Not set</option>
            {[2020, 2021, 2022, 2023, 2024, 2025, ...BATCH_OPTIONS].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className={label}>Tags (up to 6)
          <input name="tags" className={field} placeholder="web, ai, placements" />
        </label>
      </div>
      <p className="text-xs text-faint">Needs a live link or a code link. A mod checks every submission before it shows.</p>
      <button disabled={pending} className="rounded-xl bg-accent px-4 py-3 font-bold text-bg disabled:opacity-50">
        {pending ? "Submitting..." : "Submit for review"}
      </button>
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
    </form>
  );
}
