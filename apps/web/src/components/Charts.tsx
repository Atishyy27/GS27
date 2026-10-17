// Small, dependency-free charts for the Placecom dashboard. Server-renderable.

export function Card({ title, insight, source, children }: { title: string; insight: string; source: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6">
      <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">{title}</p>
      <p className="mt-2 text-lg font-bold leading-snug sm:text-xl">{insight}</p>
      <div className="mt-5">{children}</div>
      <p className="mt-4 text-[11px] text-faint">Source: {source}</p>
    </section>
  );
}

export function Stat({ big, label, tone = "accent" }: { big: string; label: string; tone?: "accent" | "good" | "fg" }) {
  const c = tone === "good" ? "text-good" : tone === "fg" ? "text-fg" : "text-accent";
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <div className={`text-4xl font-extrabold leading-none tabular-nums sm:text-5xl ${c}`}>{big}</div>
      <div className="mt-2 text-sm text-dim">{label}</div>
    </div>
  );
}

/** Horizontal bars. Values are labelled directly, so no axis is needed. */
export function HBars({ rows, max, suffix = "", highlight }: { rows: { label: string; value: number; note?: string }[]; max?: number; suffix?: string; highlight?: string }) {
  const m = max ?? Math.max(...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 text-sm">
          <span className={r.label === highlight ? "font-bold text-fg" : "text-dim"}>{r.label}</span>
          <div className="h-5 overflow-hidden rounded bg-white/5">
            <div className={`h-full rounded ${r.label === highlight ? "bg-accent" : "bg-accent/60"}`} style={{ width: `${(100 * r.value) / m}%` }} />
          </div>
          <span className="min-w-12 text-right font-semibold tabular-nums">
            {r.value}{suffix}{r.note && <span className="ml-1 text-xs font-normal text-faint">{r.note}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Vertical columns with the value on top. */
export function Columns({ rows, height = 160 }: { rows: { label: string; value: number }[]; height?: number }) {
  const m = Math.max(...rows.map((r) => r.value));
  return (
    <div className="flex items-end gap-3" style={{ height: height + 44 }}>
      {rows.map((r) => (
        <div key={r.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-sm font-bold tabular-nums">{r.value}</span>
          <div className="w-full max-w-14 rounded-t-md bg-accent" style={{ height: Math.max(4, (height * r.value) / m) }} />
          <span className="text-xs text-dim">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Interview funnel: one step per round, each step's width relative to round 1. */
export function Funnel({ date, rounds }: { date: string; rounds: number[] }) {
  const kept = Math.round((100 * rounds[rounds.length - 1]) / rounds[0]);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-dim">
        <span>{date}</span>
        <span><b className="text-fg">{kept}%</b> made the last round</span>
      </div>
      <div className="mt-1.5 flex flex-col gap-1">
        {rounds.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 rounded-sm bg-accent" style={{ width: `${(100 * n) / rounds[0]}%`, opacity: 1 - i * 0.2 }} />
            <span className="text-xs tabular-nums text-dim">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
