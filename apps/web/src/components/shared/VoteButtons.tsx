"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { targetType: "post" | "comment" | "resource"; targetId: number; score: number; myVote?: -1 | 0 | 1; signedIn: boolean };

/** Up/down vote with optimistic score. Clicking your current vote again removes it. */
export default function VoteButtons({ targetType, targetId, score, myVote = 0, signedIn }: Props) {
  const [vote, setVote] = useState<-1 | 0 | 1>(myVote);
  const [s, setS] = useState(score);
  const [busy, setBusy] = useState(false);

  async function cast(v: -1 | 1) {
    if (!signedIn) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    if (busy) return;
    setBusy(true);
    const next = vote === v ? 0 : v;
    const prev = vote;
    setVote(next); setS(s - prev + next);
    const supabase = createClient();
    const res = next === 0
      ? await supabase.from("votes").delete().match({ target_type: targetType, target_id: targetId })
      : await supabase.from("votes").upsert({ target_type: targetType, target_id: targetId, value: next }, { onConflict: "user_id,target_type,target_id" });
    if (res.error) { setVote(prev); setS(s); alert(res.error.message); }
    setBusy(false);
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <button aria-label="Upvote" onClick={() => cast(1)} className={vote === 1 ? "text-accent" : "text-dim hover:text-fg"}>▲</button>
      <span className="min-w-6 text-center font-semibold tabular-nums">{s}</span>
      <button aria-label="Downvote" onClick={() => cast(-1)} className={vote === -1 ? "text-accent" : "text-dim hover:text-fg"}>▼</button>
    </span>
  );
}
