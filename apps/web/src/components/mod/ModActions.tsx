"use client";

import { useState, useTransition } from "react";
import { dismissItem, moderateItem, revealAuthor } from "@/app/mod/actions";

type Props = { type: string; id: string; hidden: boolean | null; isAdmin: boolean };

/** Hide / Restore / Dismiss for one reported target, plus the admin-only author reveal. */
export default function ModActions({ type, id, hidden, isAdmin }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; handle: string } | null>(null);
  const numeric = type !== "profile";

  function run(label: string, fn: (note: string) => Promise<{ error?: string }>) {
    const note = prompt(`${label}: add a note for the mod log (optional)`);
    if (note === null) return;
    start(async () => {
      const r = await fn(note);
      setMsg(r.error ?? `${label} done.`);
    });
  }

  function reveal() {
    const reason = prompt("Reveal who wrote this. This is logged with your handle. Reason (10+ characters):");
    if (reason === null) return;
    if (reason.trim().length < 10) { setMsg("Reason must be at least 10 characters."); return; }
    start(async () => {
      const r = await revealAuthor(type, Number(id), reason);
      if (r.error) setMsg(r.error);
      else if (r.email && r.handle) setRevealed({ email: r.email, handle: r.handle });
    });
  }

  const btn = "rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {numeric && !hidden && (
          <button disabled={pending} onClick={() => run("Hide", (n) => moderateItem(type, Number(id), true, n))}
            className={`${btn} border-accent/60 text-accent hover:bg-accent/10`}>Hide</button>
        )}
        {numeric && hidden && (
          <button disabled={pending} onClick={() => run("Restore", (n) => moderateItem(type, Number(id), false, n))}
            className={`${btn} border-good/60 text-good hover:bg-good/10`}>Restore</button>
        )}
        <button disabled={pending} onClick={() => run("Dismiss", (n) => dismissItem(type, id, n))}
          className={`${btn} border-white/20 text-dim hover:border-white/50`}>Dismiss</button>
        {isAdmin && numeric && !revealed && (
          <button disabled={pending} onClick={reveal} className={`${btn} border-white/20 text-faint hover:border-accent hover:text-accent`}>
            Reveal author
          </button>
        )}
      </div>
      {revealed && (
        <div className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
          <p className="text-xs text-accent">Logged. Shown once; it is gone when you leave this page. Do not share it beyond what the case needs.</p>
          <p className="mt-1 break-all">@{revealed.handle} · {revealed.email}</p>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-dim">{msg}</p>}
    </div>
  );
}
