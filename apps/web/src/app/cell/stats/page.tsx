import Link from "next/link";
import { Card, Columns, HBars, Stat } from "@/components/placecom/Charts";
import { cellContext } from "@/components/cell/data";
import Gate, { CellTabs, NOT_CONFIGURED } from "@/components/cell/Gate";

export const metadata = { title: "Season stats · GS27" };

type Stats = {
  drives: number;
  by_kind: Record<string, number>;
  by_month: Record<string, number>;
  ctc_median: number | null; ctc_n: number; ctc_min: number | null; ctc_max: number | null;
  stipend_median: number | null; stipend_n: number;
  open_per_branch: Record<string, number>;
  branch_rates: Record<string, { registered: number; cleared_any: number | null; rate: number | null }>;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Season starts 1 July: the cell's year runs Jul to Jun. */
function seasonStart(now: Date): string {
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-07-01`;
}

export default async function CellStats({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const ctx = await cellContext();
  if (!ctx.configured) return <Gate title="Season stats">{NOT_CONFIGURED}</Gate>;
  const { college, supabase, isCell } = ctx;
  const since = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : seasonStart(new Date());
  const { data, error } = await supabase.rpc("college_season_stats", { p_college: college.id, p_from: since });
  const s = data as Stats | null;
  const asOf = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const source = `${college.short_name} placement cell drives on GS27, live, since ${since}`;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">{college.short_name} · SEASON SINCE {since} · AS OF {asOf.toUpperCase()}</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-5xl">The season, live from the cell&apos;s own drives.</h1>
      <p className="mt-4 max-w-2xl text-dim">
        Counts only. Rounds cleared are stage results, not offers. A branch rate is hidden when fewer than 5 students registered.
      </p>
      {isCell && <CellTabs active="stats" />}
      {error && <p className="mt-6 text-sm text-accent">{error.message}</p>}
      {!s || s.drives === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-faint">
          No published drives since {since} yet.{isCell && <> <Link href="/cell/drives/new" className="text-accent hover:underline">Create one</Link>.</>}
        </p>
      ) : (
        <Body s={s} source={source} />
      )}
    </main>
  );
}

function Body({ s, source }: { s: Stats; source: string }) {
  const months = Object.entries(s.by_month).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1] ?? k, value: n }));
  const busiest = months.reduce((m, r) => (r.value > m.value ? r : m), months[0]);
  const open = Object.entries(s.open_per_branch).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const rates = Object.entries(s.branch_rates)
    .map(([label, r]) => ({ label, value: r.rate ?? 0, note: r.rate == null ? `n=${r.registered}, hidden` : `${r.cleared_any}/${r.registered}` }))
    .sort((a, b) => b.value - a.value);
  const kind = s.by_kind;
  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat big={String(s.drives)} label={`drives: ${kind.internship ?? 0} internship, ${kind.intern_fte ?? 0} intern + FTE, ${kind.job ?? 0} job`} />
        <Stat big={s.ctc_median != null ? `${Number(s.ctc_median.toFixed(1))}` : "n/a"} label={`median CTC in LPA (${s.ctc_n} drives state one)${s.ctc_min != null ? `, ${s.ctc_min} to ${s.ctc_max}` : ""}`} />
        <Stat big={s.stipend_median != null ? `₹${Math.round(s.stipend_median / 1000)}k` : "n/a"} label={`median stipend a month (${s.stipend_n} drives)`} tone="good" />
        <Stat big={String(open[0]?.value ?? 0)} label={`most drives open to one branch (${open[0]?.label ?? "none"})`} tone="fg" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="The calendar" insight={busiest ? `${busiest.label} is the busiest month so far with ${busiest.value} drives.` : "No dated drives yet."} source={source}>
          <Columns rows={months} />
        </Card>
        <Card title="Drives open per branch" insight={`${open[0]?.label ?? "-"} has the most options; ${open[open.length - 1]?.label ?? "-"} the fewest.`} source={source}>
          <HBars rows={open} max={s.drives} />
        </Card>
        <Card title="Cleared at least one round" insight="Share of registered students per branch who cleared any stage of any drive." source={`${source}; stage outcomes entered by the cell`}>
          {rates.length ? <HBars rows={rates} max={100} suffix="%" /> : <p className="text-sm text-faint">No registrations yet.</p>}
        </Card>
      </div>
    </>
  );
}
