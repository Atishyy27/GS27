"use client";

import { useState, useTransition } from "react";
import { reviewProject } from "./actions";

/** Mod-only approve / reject for a pending project. The database re-checks the role. */
export default function ReviewButtons({ projectId }: { projectId: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  function act(status: "approved" | "rejected") {
    const note = prompt(status === "approved" ? "Note (optional)" : "Why reject? (shown only in the mod log)") ?? "";
    start(async () => {
      const res = await reviewProject(projectId, status, note.trim());
      if (res?.error) alert(res.error);
      else setDone(status);
    });
  }

  if (done) return <span className="text-sm text-dim">{done}</span>;
  return (
    <div className="flex gap-2">
      <button disabled={pending} onClick={() => act("approved")} className="rounded-full bg-good px-3 py-1 text-sm font-bold text-bg disabled:opacity-50">Approve</button>
      <button disabled={pending} onClick={() => act("rejected")} className="rounded-full border border-white/20 px-3 py-1 text-sm hover:border-accent hover:text-accent disabled:opacity-50">Reject</button>
    </div>
  );
}
