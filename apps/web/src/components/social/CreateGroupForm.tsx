"use client";

import { useActionState, useState } from "react";
import { createGroup } from "./actions";
import type { ActionState } from "./types";

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function CreateGroupForm({ collegeName = "college" }: { collegeName?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createGroup, undefined);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-bg">Create a group</button>;
  }
  const field = "rounded-xl border border-white/15 bg-bg px-3 py-2 text-fg outline-none focus:border-white/40";
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <label className="flex flex-col gap-1 text-sm text-dim">Name
        <input name="name" required minLength={2} maxLength={60} className={field}
          onChange={(e) => { if (!touched) setSlug(toSlug(e.target.value)); }} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-dim">Link name (gs27/g/...)
        <input name="slug" required pattern="[a-z0-9\-]{2,40}" value={slug} className={field}
          onChange={(e) => { setTouched(true); setSlug(toSlug(e.target.value)); }} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-dim">Description (optional)
        <textarea name="description" maxLength={300} rows={2} className={field} />
      </label>
      <label className="flex items-center gap-2 text-sm text-dim">
        <input type="checkbox" name="verified_only" className="accent-[#ff5a36]" />
        Verified only (only accounts verified with a {collegeName} email can join)
      </label>
      <div className="flex gap-3">
        <button disabled={pending} className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-bg disabled:opacity-50">
          {pending ? "Creating..." : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-dim hover:text-fg">Cancel</button>
      </div>
      {state?.error && <p className="text-sm text-accent">{state.error}</p>}
    </form>
  );
}
