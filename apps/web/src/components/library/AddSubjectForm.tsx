"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSubject, type AddSubjectState } from "@/app/library/actions";

export default function AddSubjectForm({ branch, semester }: { branch: string; semester: number }) {
  const [state, action, pending] = useActionState<AddSubjectState, FormData>(addSubject, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) form.current?.reset(); }, [state]);

  return (
    <form ref={form} action={action} className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-4 sm:flex-row sm:items-end">
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="semester" value={semester} />
      <label className="flex flex-1 flex-col gap-1 text-xs text-dim">Subject name
        <input name="name" required minLength={2} maxLength={120} placeholder="Engineering Mechanics"
          className="rounded-lg border border-white/15 bg-bg px-3 py-2 text-sm text-fg" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-dim sm:w-32">Code (optional)
        <input name="code" maxLength={20} placeholder="ME 23001"
          className="rounded-lg border border-white/15 bg-bg px-3 py-2 text-sm text-fg" />
      </label>
      <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-50">
        {pending ? "Adding..." : "Add subject"}
      </button>
      {state.error && <p className="text-xs text-accent sm:basis-full">{state.error}</p>}
      {state.ok && <p className="text-xs text-good sm:basis-full">Added.</p>}
    </form>
  );
}
