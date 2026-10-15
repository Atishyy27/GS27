"use client";

import { useState } from "react";

// Draft targets for LeetCode problems solved by the end of each semester (from the session).
// Sem 6 and 8 are not set in the draft; 6 is shown as the midpoint of 5 and 7, 8 equals 7.
const DRAFT: Record<number, number> = { 3: 200, 4: 350, 5: 600, 7: 900 };
const target = (sem: number): number | null =>
  DRAFT[sem] ?? (sem === 6 ? 750 : sem === 8 ? 900 : null);

// One senior's curve (verified profile on 15 Oct 2026: 1005 solved; per-semester values estimated).
const SENIOR: Record<number, number> = { 2: 83, 3: 250, 4: 662, 5: 792, 6: 976, 7: 1005 };

type CF = { rating?: number; maxRating?: number; rank?: string; maxRank?: string } | { error: string } | null;

function level(solved: number, t: number | null) {
  if (t === null) {
    if (solved >= 100) return { name: "Early bird", line: "Ahead of where most people start. Keep the streak.", tone: "text-good" };
    if (solved > 0) return { name: "Started", line: "You have started. One problem a day gets you to 200 by Sem 3.", tone: "text-good" };
    return { name: "Day zero", line: "Everyone starts here. Solve one today.", tone: "text-dim" };
  }
  const r = solved / t;
  if (r >= 1.5) return { name: "Ahead of the curve", line: "Way past the draft target. Start contests and real projects now.", tone: "text-good" };
  if (r >= 1) return { name: "On target", line: "You hit the draft target for your semester. Now push quality: finish a sheet.", tone: "text-good" };
  if (r >= 0.6) return { name: "Close", line: `${t - solved} problems to the draft target. Very doable in a month of steady work.`, tone: "text-accent" };
  if (r >= 0.25) return { name: "Warming up", line: `${t - solved} to go. Pick ONE sheet and do 3 a day.`, tone: "text-accent" };
  return { name: "Wake-up call", line: `${t - solved} to go. Not a disaster, but the season starts in Sem 7. Start tonight.`, tone: "text-accent" };
}

export default function Game() {
  const [sem, setSem] = useState(3);
  const [lc, setLc] = useState("");
  const [handle, setHandle] = useState("");
  const [cf, setCf] = useState<CF>(null);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const solved = Math.max(0, Math.min(5000, Number(lc) || 0));
  const t = target(sem);
  const lv = level(solved, t);
  const next = [sem + 1, sem + 2, sem + 3].map((s) => ({ s, t: target(s) })).filter((x) => x.s <= 8 && x.t !== null);

  async function play(e: React.FormEvent) {
    e.preventDefault();
    setShown(true);
    setCopied(false);
    setCf(null);
    const h = handle.trim();
    if (!h) return;
    try {
      const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(h)}`);
      const j = await res.json();
      if (j.status !== "OK") setCf({ error: "Codeforces could not find that handle." });
      else setCf(j.result[0]);
    } catch {
      setCf({ error: "Could not reach Codeforces. Try again in a bit." });
    }
  }

  const share = `I'm in Sem ${sem} with ${solved} LeetCode problems solved: "${lv.name}" on the GS27 Placecom game.${
    cf && !("error" in cf) && cf.rating ? ` Codeforces ${cf.rating}.` : ""} Where are you?`;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={play} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5">
        <label className="flex flex-col gap-2 text-sm text-dim">Semester you are in
          <div className="grid grid-cols-8 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <button type="button" key={s} onClick={() => setSem(s)}
                className={`rounded-lg py-2 text-base font-bold ${s === sem ? "bg-accent text-bg" : "bg-white/5 text-fg hover:bg-white/10"}`}>{s}</button>
            ))}
          </div>
        </label>
        <label className="flex flex-col gap-2 text-sm text-dim">LeetCode problems solved
          <input inputMode="numeric" value={lc} onChange={(e) => setLc(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 140"
            className="rounded-xl border border-white/15 bg-bg px-3 py-3 text-xl font-bold text-fg" />
        </label>
        <label className="flex flex-col gap-2 text-sm text-dim">Codeforces handle (optional)
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="tourist" autoCapitalize="none" spellCheck={false}
            className="rounded-xl border border-white/15 bg-bg px-3 py-3 text-base text-fg" />
        </label>
        <button className="rounded-xl bg-good px-4 py-3 text-lg font-extrabold text-bg">Where am I?</button>
        <p className="text-[11px] text-faint">Nothing you type here is saved or sent anywhere, except the Codeforces handle, which goes to Codeforces to look up your rating.</p>
      </form>

      <div className="rounded-2xl border border-white/10 bg-card p-5 sm:p-7">
        {!shown ? (
          <div className="flex h-full min-h-60 flex-col justify-center">
            <p className="text-3xl font-extrabold">Be honest.</p>
            <p className="mt-2 text-dim">Pick your semester, type your count, and see where it puts you against the draft targets and one senior&apos;s real curve.</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-dim">SEM {sem} · {solved} SOLVED</p>
            <p className={`mt-2 text-5xl font-extrabold leading-none ${lv.tone}`}>{lv.name}</p>
            <p className="mt-3 text-lg">{lv.line}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Mini big={t === null ? "none" : String(t)} label={`draft target, end of Sem ${sem}`} />
              <Mini big={SENIOR[sem] ? String(SENIOR[sem]) : "n/a"} label={`one senior at Sem ${sem}`} />
              {cf && ("error" in cf ? <Mini big="?" label={cf.error} /> : <Mini big={cf.rating ? String(cf.rating) : "unrated"} label={`Codeforces ${cf.rank ?? ""}${cf.maxRating ? `, peak ${cf.maxRating}` : ""}`} />)}
            </div>
            {next.length > 0 && (
              <div className="mt-5">
                <p className="text-sm text-dim">Next stops (draft targets)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {next.map((n) => <span key={n.s} className="rounded-full border border-white/15 px-3 py-1 text-sm">Sem {n.s}: <b>{n.t}{n.s >= 5 ? "+" : ""}</b></span>)}
                </div>
              </div>
            )}
            <Curve sem={sem} solved={solved} />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={async () => { try { await navigator.clipboard.writeText(share); setCopied(true); } catch {} }}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:border-white/50">
                {copied ? "Copied" : "Copy my result"}
              </button>
              <span className="text-xs text-faint">{share}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-2xl font-extrabold tabular-nums">{big}</div>
      <div className="text-xs text-dim">{label}</div>
    </div>
  );
}

/** Semesters 1-8 on x, problems on y: the senior's curve, the draft targets, and you. */
function Curve({ sem, solved }: { sem: number; solved: number }) {
  const W = 560, H = 220, P = 32;
  const maxY = Math.max(1100, solved * 1.1);
  const x = (s: number) => P + ((s - 1) * (W - 2 * P)) / 7;
  const y = (v: number) => H - P - (v * (H - 2 * P)) / maxY;
  const pts = Object.entries(SENIOR).map(([s, v]) => `${x(+s)},${y(v)}`).join(" ");
  return (
    <div className="mt-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Your count against one senior's curve and the draft targets">
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#2a2d36" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <text key={s} x={x(s)} y={H - P + 16} textAnchor="middle" fontSize="11" fill="#9a9ca6">S{s}</text>
        ))}
        <polyline points={pts} fill="none" stroke="#6b6f7b" strokeWidth="2" strokeDasharray="4 4" />
        {Object.entries(DRAFT).map(([s, v]) => (
          <g key={s}>
            <rect x={x(+s) - 5} y={y(v) - 5} width="10" height="10" fill="#3dd68c" transform={`rotate(45 ${x(+s)} ${y(v)})`} />
            <text x={x(+s)} y={y(v) - 10} textAnchor="middle" fontSize="11" fill="#3dd68c">{v}</text>
          </g>
        ))}
        <circle cx={x(sem)} cy={y(solved)} r="8" fill="#ff5a36" />
        <text x={x(sem) + 12} y={y(solved) + 4} fontSize="12" fontWeight="700" fill="#ff5a36">you</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-faint">
        <span><span className="text-good">◆</span> draft targets</span>
        <span>- - one senior&apos;s curve, estimated per semester</span>
        <span><span className="text-accent">●</span> you</span>
      </div>
    </div>
  );
}
