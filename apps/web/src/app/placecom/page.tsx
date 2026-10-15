import Link from "next/link";
import { BRANCHES } from "@/data/branches";
import { AS_OF, BOND, CTC, CUTOFFS, DRIVES, DRIVES_BY_MONTH, INTERVIEW_ROUNDS, SOURCE, STIPEND, SUMMER_CALLING } from "@/data/season-2026-27";
import { Card, Columns, Funnel, HBars, Stat } from "@/components/placecom/Charts";

export const metadata = { title: "Placecom · GS27", description: "The 2026-27 placement season at SGSITS, in numbers." };

const r1 = INTERVIEW_ROUNDS.reduce((s, d) => s + d.rounds[0], 0);
const r2 = INTERVIEW_ROUNDS.reduce((s, d) => s + d.rounds[1], 0);
const augSep = DRIVES_BY_MONTH.filter((m) => m.month === "Aug" || m.month === "Sep").reduce((s, m) => s + m.n, 0);
const atOrBelow65 = CUTOFFS.filter((c) => c.pct <= 65).reduce((s, c) => s + c.n, 0);
const cutoffTotal = CUTOFFS.reduce((s, c) => s + c.n, 0);
const rates = BRANCHES.map((b) => ({ label: b.code, value: Math.round((100 * b.clearedAny) / b.registered), note: `${b.clearedAny}/${b.registered}` }))
  .sort((a, b) => b.value - a.value);

export default function Placecom() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">PLACECOM · 2026-27 SEASON · AS OF {AS_OF.toUpperCase()}</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
        What actually came to SGSITS this year.
      </h1>
      <p className="mt-4 max-w-2xl text-dim">
        Every number here is counted from the placement cell&apos;s own sheets. Rounds cleared are stage results, not offers.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/placecom/game" className="rounded-full bg-accent px-5 py-2.5 font-bold text-bg">Play: where are you right now?</Link>
        <Link href="/g/placecom" className="rounded-full border border-white/20 px-5 py-2.5 font-semibold hover:border-white/50">Ask anonymously</Link>
        <a href="https://atishay.tech/GS27/placecom/" target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-5 py-2.5 font-semibold hover:border-white/50">Watch the session deck ↗</a>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat big={String(DRIVES.total)} label={`drives: ${DRIVES.internship} internship, ${DRIVES.internPlusJob} intern + job, ${DRIVES.job} job`} />
        <Stat big={`${CTC.medianLpa}`} label={`median CTC in LPA (${CTC.n} drives state one), ${CTC.minLpa} to ${CTC.maxLpa}`} />
        <Stat big={`₹${STIPEND.median / 1000}k`} label={`median stipend a month (${STIPEND.n} drives), ₹${STIPEND.min / 1000}k to ₹${Math.round(STIPEND.max / 1000)}k`} tone="good" />
        <Stat big={`${BOND.n}/${BOND.of}`} label="drives come with a bond" tone="fg" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="The calendar" insight={`${augSep} of ${DRIVES.total} drives landed in August and September. Be ready by the end of Sem 6.`} source={`${SOURCE}, drive dates`}>
          <Columns rows={DRIVES_BY_MONTH.map((m) => ({ label: m.month, value: m.n }))} />
        </Card>

        <Card title="Where the money is" insight={`${CTC.buckets[1].n + CTC.buckets[2].n} of ${CTC.n} drives pay 5 to 12 LPA. Only ${CTC.buckets[3].n} pay 12 or more.`} source={`${SOURCE}, ${CTC.n} drives that state a CTC`}>
          <HBars rows={CTC.buckets.map((b) => ({ label: b.label, value: b.n }))} />
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {CTC.top.map((t) => <span key={t.company} className="rounded-full border border-white/15 px-2.5 py-1 text-dim"><b className="text-fg">{t.lpa} LPA</b> {t.company}</span>)}
          </div>
        </Card>

        <Card title="Branch is not the excuse" insight="Mech gets 28 of 40 drives. CSE gets 29. EI gets the most." source={`${SOURCE}, eligible branches per drive`}>
          <HBars rows={BRANCHES.map((b) => ({ label: b.code, value: b.drivesOpen }))} max={DRIVES.total} suffix={`/${DRIVES.total}`} />
        </Card>

        <Card title="2027 batch: cleared at least one round" insight={`${rates[0].label} leads at ${rates[0].value}%. The gap between branches is bigger than the gap in drives.`} source={`${SOURCE}, stage result and interview sheets (registered students, n per branch shown)`}>
          <HBars rows={rates} max={100} suffix="%" />
        </Card>

        <Card title="Interviews" insight={`Across ${INTERVIEW_ROUNDS.length} drives, ${r1} people sat round 1 and ${r2} made round 2 (${Math.round((100 * r2) / r1)}%).`} source="Interview tracking sheets, Feb 2025 to Sep 2026, drives with 2+ rounds recorded">
          <div className="grid gap-5 sm:grid-cols-2">
            {INTERVIEW_ROUNDS.slice(0, 6).map((d, i) => <Funnel key={i} date={d.date} rounds={d.rounds} />)}
          </div>
        </Card>

        <Card title="The gate before the test" insight={`${atOrBelow65} of ${cutoffTotal} drives with a cut-off ask 65% or less in 10th and 12th. Your marks still decide who sits the test.`} source={`${SOURCE}, 10th/12th criteria`}>
          <Columns rows={CUTOFFS.map((c) => ({ label: `${c.pct}%`, value: c.n }))} height={130} />
        </Card>

        <Card title="The companies are outside" insight={`The cell called about ${SUMMER_CALLING.companies.toLocaleString("en-IN")} companies this summer. ${SUMMER_CALLING.cameThisSeason} of them came here.`} source={`Summer calling sheet 2026, lists from ${SUMMER_CALLING.peerColleges} colleges`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-3xl font-extrabold text-accent tabular-nums">{SUMMER_CALLING.companies.toLocaleString("en-IN")}</div><div className="text-xs text-dim">companies called</div></div>
            <div><div className="text-3xl font-extrabold text-good tabular-nums">{SUMMER_CALLING.cameThisSeason}</div><div className="text-xs text-dim">came this season</div></div>
            <div><div className="text-3xl font-extrabold tabular-nums">{SUMMER_CALLING.priority10Plus}</div><div className="text-xs text-dim">priority companies paying 10+ LPA</div></div>
          </div>
          <p className="mt-4 text-sm text-dim">Off-campus is not a backup plan. It is where most of the companies are.</p>
        </Card>

        <Card title="So what do you do" insight="Count, contest, contribute, cold mail." source="The Placecom session, 16 Oct 2026">
          <ul className="flex flex-col gap-2 text-sm text-dim">
            <li><b className="text-fg">Count:</b> finish one sheet, then count problems.</li>
            <li><b className="text-fg">Contest:</b> Codeforces and LeetCode contests every week.</li>
            <li><b className="text-fg">Contribute:</b> one real open-source PR beats ten tutorials.</li>
            <li><b className="text-fg">Cold mail:</b> personalised beats mass, every time.</li>
          </ul>
          <Link href="/placecom/game" className="mt-4 inline-block font-semibold text-accent">Check where you stand →</Link>
        </Card>
      </div>
    </main>
  );
}
