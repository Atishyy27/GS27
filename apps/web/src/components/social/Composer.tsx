"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPost } from "./actions";
import type { ActionState } from "./types";

type Props = { groupId?: number; withTitle?: boolean; placeholder?: string };

/** X-style short post (no title) or Reddit-style group post (with title). */
export default function Composer({ groupId, withTitle, placeholder }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPost, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);

  return (
    <form ref={form} action={action} className="rounded-2xl border border-white/10 bg-card p-4">
      {groupId !== undefined && <input type="hidden" name="group_id" value={groupId} />}
      {withTitle && (
        <input name="title" maxLength={200} placeholder="Title"
          className="mb-2 w-full rounded-lg bg-transparent px-1 py-1 text-lg font-semibold outline-none placeholder:text-faint" />
      )}
      <textarea name="body" required maxLength={5000} rows={withTitle ? 4 : 3}
        placeholder={placeholder ?? "What's happening on campus?"}
        className="w-full resize-y rounded-lg bg-transparent px-1 py-1 outline-none placeholder:text-faint" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-dim">
          <input type="checkbox" name="anonymous" className="accent-[#ff5a36]" />
          Post anonymously (hides your handle, branch and batch)
        </label>
        <button disabled={pending} className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-bg disabled:opacity-50">
          {pending ? "Posting..." : "Post"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-sm text-accent">{state.error}</p>}
    </form>
  );
}
