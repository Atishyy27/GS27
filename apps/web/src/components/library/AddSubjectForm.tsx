"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { offerSubject, searchSubjects, type OfferState, type SubjectHit } from "@/app/library/actions";

/** Search the shared subjects first; add an existing one to this semester, or create a new one. */
export default function AddSubjectForm({ branch, semester }: { branch: string; semester: number }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SubjectHit[]>([]);
  const [pick, setPick] = useState<{ id: number; name: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pick || q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(async () => { const r = await searchSubjects(q); if (live) setHits(r); }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q, pick]);

  // Update local UI from the server result inside the action itself (no state-syncing effect).
  const [state, action, pending] = useActionState<OfferState, FormData>(async (prev, fd) => {
    const r = await offerSubject(prev, fd);
    if (r.ok) { form.current?.reset(); setQ(""); setHits([]); setPick(null); }
    else if (r.existing) { setPick(r.existing); setHits([]); }
    return r;
  }, {});

  const shownHits = q.trim().length < 2 ? [] : hits;
  const exact = shownHits.some((h) => h.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <form ref={form} action={action} className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="semester" value={semester} />
      {pick && <input type="hidden" name="subject_id" value={pick.id} />}

      {pick ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm">
          <span>Adding <b>{pick.name}</b> to {branch} Sem {semester}</span>
          <button type="button" onClick={() => setPick(null)} className="text-xs text-dim hover:text-fg">change</button>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-xs text-dim">Subject name (search the shared list first)
          <input name="name" required minLength={2} maxLength={120} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Thermodynamics" autoComplete="off"
            className="rounded-lg border border-white/15 bg-bg px-3 py-2 text-sm text-fg" />
        </label>
      )}

      {!pick && shownHits.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {shownHits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => setPick({ id: h.id, name: h.name })}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-left hover:border-accent">
                <span className="text-sm font-semibold">{h.name}</span>
                <span className="mt-0.5 block text-[11px] text-dim">
                  {h.offerings.length
                    ? h.offerings.map((o) => `${o.college} · ${o.branch} · Sem ${o.semester}${o.code ? ` · ${o.code}` : ""}`).join("  |  ")
                    : "Not offered anywhere yet"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-dim sm:w-40">Your college&apos;s code (optional)
          <input name="code" maxLength={20} placeholder="ME 23001"
            className="rounded-lg border border-white/15 bg-bg px-3 py-2 text-sm text-fg" />
        </label>
        <button disabled={pending || (!pick && (q.trim().length < 2 || exact))}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-50">
          {pending ? "Adding..." : pick ? "Add to this semester" : "Create new subject"}
        </button>
      </div>
      {!pick && exact && <p className="text-xs text-dim">That subject already exists. Pick it from the list above.</p>}
      {state.error && <p className="text-xs text-accent">{state.error}</p>}
      {state.ok && <p className="text-xs text-good">Added.</p>}
    </form>
  );
}
