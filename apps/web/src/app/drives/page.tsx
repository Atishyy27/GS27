import Link from "next/link";
import { cellContext, DRIVE_COLS, eligibilityLine, istDateTime, isPastDeadline, KIND_LABEL, money, STATUS_STYLE, type DriveRow, type StageRow } from "@/components/cell/data";
import Gate, { NOT_CONFIGURED } from "@/components/cell/Gate";
import { RunButton, primary } from "@/components/cell/ui";
import { registerForDrive, withdrawFromDrive } from "@/components/cell/actions";

export const metadata = { title: "Drives · GS27" };

type Reg = { drive_id: number; status: string; reason: string | null };

export default async function Drives() {
  const ctx = await cellContext();
  if (!ctx.configured) return <Gate title="Drives">{NOT_CONFIGURED}</Gate>;
  if (!ctx.viewer) return <Gate title="Drives" next="/drives">Sign in to see your college&apos;s placement drives and register.</Gate>;
  const p = ctx.viewer.profile;
  if (!p?.college_id || !p.branch || !p.batch) {
    return <Gate title="Drives">Pick your college, branch and batch first. <Link href="/onboarding?next=/drives" className="text-accent hover:underline">Finish setup</Link>.</Gate>;
  }
  const { supabase } = ctx;
  // RLS returns only non-draft drives of the viewer's own college (cell members also see drafts; hide those here).
  const [{ data: dd }, { data: rr }, { data: me }] = await Promise.all([
    supabase.from("drives").select(DRIVE_COLS).eq("college_id", p.college_id).neq("status", "draft").order("deadline", { ascending: true, nullsFirst: false }).limit(200),
    supabase.from("drive_registrations").select("drive_id, status, reason").eq("user_id", ctx.viewer.userId),
    supabase.from("placement_profiles").select("user_id, updated_at").eq("user_id", ctx.viewer.userId).maybeSingle(),
  ]);
  const drives = (dd ?? []) as DriveRow[];
  const regs = new Map(((rr ?? []) as Reg[]).map((r) => [r.drive_id, r]));
  const openIds = drives.filter((d) => d.status === "open" && !regs.has(d.id)).map((d) => d.id);
  const elig = new Map<number, string | null>();
  if (me) {
    const checks = await Promise.all(openIds.map((id) => supabase.rpc("my_eligibility", { p_drive: id })));
    openIds.forEach((id, i) => elig.set(id, (checks[i].data as string | null) ?? null));
  }
  const myDriveIds = drives.filter((d) => regs.has(d.id)).map((d) => d.id);
  const [{ data: st }, { data: rs }] = myDriveIds.length
    ? await Promise.all([
        supabase.from("drive_stages").select("id, drive_id, name, position, stage_date").in("drive_id", myDriveIds).order("position"),
        supabase.from("stage_results").select("stage_id, outcome").eq("user_id", ctx.viewer.userId),
      ])
    : [{ data: [] }, { data: [] }];
  const stages = (st ?? []) as StageRow[];
  const outcome = new Map(((rs ?? []) as { stage_id: number; outcome: string }[]).map((r) => [r.stage_id, r.outcome]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">{ctx.college.short_name} · PLACEMENT DRIVES</p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Drives</h1>
      <p className="mt-3 text-dim">Register here instead of the poll form. Eligibility is checked against your placement profile.</p>

      <div className={`mt-6 rounded-2xl border p-4 text-sm ${me ? "border-white/10 bg-card text-dim" : "border-accent/40 text-accent"}`}>
        {me ? <>Placement profile saved. <Link href="/drives/profile" className="font-semibold text-fg hover:underline">Edit it</Link> if your marks changed.</>
          : <>You need a placement profile (name, enrollment number, marks) before you can register. Only your college&apos;s cell sees it. <Link href="/drives/profile" className="font-semibold underline">Fill it now</Link>.</>}
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {drives.length === 0 && <li className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-faint">No drives published yet.</li>}
        {drives.map((d) => {
          const r = regs.get(d.id);
          const late = isPastDeadline(d);
          const canRegister = d.status === "open" && !late && (!r || r.status === "withdrawn") && !!me;
          const reason = elig.get(d.id);
          const mine = stages.filter((s) => s.drive_id === d.id);
          return (
            <li key={d.id} className="rounded-2xl border border-white/10 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-faint">{d.code ?? ""} · {KIND_LABEL[d.kind]}</p>
                  <h2 className="text-xl font-bold">{d.company}</h2>
                  <p className="mt-1 text-sm text-dim">{money(d)} · {eligibilityLine(d)}</p>
                  <p className="mt-1 text-xs text-faint">Deadline {istDateTime(d.deadline)}{d.location ? ` · ${d.location}` : ""}{d.bond ? ` · Bond: ${d.bond}` : ""}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[d.status]}`}>{late && d.status === "open" ? "deadline passed" : d.status}</span>
                  {r && r.status !== "withdrawn" ? (
                    <span className={`text-sm font-semibold ${r.status === "eligible" ? "text-good" : "text-accent"}`}>
                      {r.status === "eligible" ? "Registered, eligible" : "Registered, not eligible"}
                    </span>
                  ) : d.status === "open" && me && !late ? (
                    <span className={`text-xs font-semibold ${reason ? "text-accent" : "text-good"}`}>{reason ? `Not eligible: ${reason}` : "You are eligible"}</span>
                  ) : null}
                </div>
              </div>
              {r?.status === "ineligible" && r.reason && <p className="mt-2 text-xs text-accent">{r.reason}</p>}
              {d.description && <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-dim">{d.description}</p>}
              {mine.length > 0 && r && r.status !== "withdrawn" && (
                <ol className="mt-4 flex flex-wrap gap-2 text-xs">
                  {mine.map((s) => {
                    const o = outcome.get(s.id);
                    return (
                      <li key={s.id} className={`rounded-full border px-3 py-1 ${o === "cleared" ? "border-good/40 text-good" : o === "not_cleared" ? "border-accent/40 text-accent" : "border-white/15 text-dim"}`}>
                        {s.name}: {o ? o.replace("_", " ") : "pending"}
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="mt-4 flex gap-2">
                {canRegister && <RunButton run={registerForDrive.bind(null, d.id)} className={primary}>{r ? "Register again" : "Register"}</RunButton>}
                {r && r.status !== "withdrawn" && d.status !== "completed" && (
                  <RunButton run={withdrawFromDrive.bind(null, d.id)} confirm={`Withdraw from ${d.company}?`}>Withdraw</RunButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
