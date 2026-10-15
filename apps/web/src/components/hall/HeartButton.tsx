"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProjectVote } from "./actions";

type Props = { projectId: number; score: number; voted: boolean; signedIn: boolean };

/** One upvote per person (a heart). Clicking again takes it back. */
export default function HeartButton({ projectId, score, voted, signedIn }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(voted);
  const [n, setN] = useState(score);
  const [pending, start] = useTransition();

  function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) { router.push(`/login?next=${encodeURIComponent("/hall")}`); return; }
    const next = !on;
    setOn(next); setN(n + (next ? 1 : -1));
    start(async () => {
      const res = await toggleProjectVote(projectId, next);
      if (res?.error) { setOn(!next); setN(n); alert(res.error); }
    });
  }

  return (
    <button onClick={click} disabled={pending} aria-pressed={on} aria-label={on ? "Remove upvote" : "Upvote"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums transition ${
        on ? "border-accent/60 bg-accent/15 text-accent" : "border-white/15 text-dim hover:border-accent/50 hover:text-accent"}`}>
      <span aria-hidden>{on ? "♥" : "♡"}</span>{n}
    </button>
  );
}
