import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cellContext, DRIVE_COLS, eligibilityLine, istDateTime, KIND_LABEL, money, PROFILE_COLS, STATUS_STYLE,
  type DriveRow, type PlacementProfile, type StageRow,
} from "@/components/cell/data";
import DriveForm from "@/components/cell/DriveForm";
import Gate, { NOT_CONFIGURED } from "@/components/cell/Gate";
import { ActionForm, RunButton, input, label, primary } from "@/components/cell/ui";
import { addStage, bulkOutcomes, deleteDrive, deleteStage, setDriveStatus } from "@/components/cell/actions";

export const metadata = { title: "Drive · Cell console · GS27" };

type Reg = { id: number; user_id: string; status: string; reason: string | null; created_at: string };
type Result = { stage_id: number; user_id: string; outcome: string };
type Funnel = { registered: number; eligible: number; stages: { name: string; position: number; cleared: number; appeared: number }[] } | null;

const OUTCOME: Record<string, string> = { cleared: "text-good", not_cleared: "text-accent", absent: "text-faint" };

export default async function DrivePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { show, edit } = await searchParams;
  const driveId = Number(id);
  if (!Number.isInteger(driveId)) notFound();
  const ctx = await cellContext();
  if (!ctx.configured) return <Gate title="Drive">{NOT_CONFIGURED}</Gate>;
  if (!ctx.viewer) return <Gate title="Drive" next={`/cell/drives/${id}`}>Sign in to continue.</Gate>;
  if (!ctx.isCell) return <Gate title="Cell members only">Only the {ctx.college.short_name} placement cell can open this page.</Gate>;
  const { supabase, college } = ctx;

  const { data: d } = await supabase.from("drives").select(DRIVE_COLS).eq("id", driveId).eq("college_id", college.id).maybeSingle();
  if (!d) notFound();
  const drive = d as DriveRow;

  const [{ data: stageData }, { data: regData }, { data: funnelData }] = await Promise.all([
    supabase.from("drive_stages").select("id, drive_id, name, position, stage_date").eq("drive_id", driveId).order("position"),
    supabase.from("drive_registrations").select("id, user_id, status, reason, created_at").eq("drive_id", driveId).order("created_at"),
    supabase.rpc("drive_funnel", { p_drive: driveId }),
  ]);
  const stages = (stageData ?? []) as StageRow[];
  const regs = (regData ?? []) as Reg[];
  const funnel = funnelData as Funnel;
  const ids = regs.map((r) => r.user_id);
  const [{ data: ppData }, { data: profData }, { data: resData }] = ids.length
    ? await Promise.all([
        supabase.from("placement_profiles").select(PROFILE_COLS).in("user_id", ids),
        supabase.from("profiles").select("id, branch, batch").in("id", ids),
        stages.length ? supabase.from("stage_results").select("stage_id, user_id, outcome").in("stage_id", stages.map((s) => s.id)) : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const pp = new Map(((ppData ?? []) as PlacementProfile[]).map((p) => [p.user_id, p]));
  const prof = new Map(((profData ?? []) as { id: string; branch: string | null; batch: number | null }[]).map((p) => [p.id, p]));
  const res = new Map(((resData ?? []) as Result[]).map((r) => [`${r.stage_id}:${r.user_id}`, r.outcome]));
  const visible = regs.filter((r) => (show === "all" ? true : show === "ineligible" ? r.status === "ineligible" : r.status === "eligible"));
  const count = (s: string) => regs.filter((r) => r.status === s).length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-24">
      <Link href="/cell" className="text-sm text-dim hover:text-fg">← Cell console</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-accent">{drive.code ?? "DRIVE"} · {KIND_LABEL[drive.kind].toUpperCase()}</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{drive.company}</h1>
          <p className="mt-2 text-sm text-dim">{money(drive)} · {eligibilityLine(drive)}</p>
          <p className="mt-1 text-sm text-dim">Deadline {istDateTime(drive.deadline)}{drive.drive_date ? ` · drive on ${drive.drive_date}` : ""}{drive.location ? ` · ${drive.location}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLE[drive.status]}`}>{drive.status}</span>
          {(["draft", "open", "closed", "completed"] as const).filter((s) => s !== drive.status).map((s) => (
            <RunButton key={s} run={setDriveStatus.bind(null, drive.id, s)}>Set {s}</RunButton>
          ))}
          <Link href={edit ? `/cell/drives/${drive.id}` : `/cell/drives/${drive.id}?edit=1`} className="rounded-full border border-white/15 px-3 py-1 text-sm hover:border-white/40">
            {edit ? "Close editor" : "Edit"}
          </Link>
        </div>
      </div>

      {edit && <div className="mt-6"><DriveForm drive={drive} branches={college.branches} /></div>}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Box big={String(funnel?.registered ?? regs.length - count("withdrawn"))} label="registered" />
        <Box big={String(count("eligible"))} label="eligible" />
        <Box big={String(count("ineligible"))} label="not eligible" />
        <Box big={String(count("withdrawn"))} label="withdrew" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Stages</p>
          {stages.length === 0 && <p className="mt-3 text-sm text-faint">No stages yet. Add PPT, OA, GD, interviews in order.</p>}
          <ol className="mt-3 flex flex-col gap-4">
            {stages.map((s) => {
              const f = funnel?.stages.find((x) => x.position === s.position && x.name === s.name);
              return (
                <li key={s.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{s.position}. {s.name}{s.stage_date ? <span className="ml-2 text-xs text-dim">{s.stage_date}</span> : null}</span>
                    <span className="text-sm text-dim tabular-nums">{f ? `${f.cleared} cleared of ${f.appeared} appeared` : ""}</span>
                  </div>
                  <ActionForm action={bulkOutcomes} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="stage_id" value={s.id} />
                    <textarea name="enrollments" rows={2} placeholder="Paste enrollment numbers (any separator)" className={input} />
                    <div className="flex flex-wrap items-center gap-2">
                      <select name="outcome" defaultValue="cleared" className={`${input} w-auto`}>
                        <option value="cleared">Cleared</option><option value="not_cleared">Not cleared</option><option value="absent">Absent</option>
                      </select>
                      <button className={primary}>Mark</button>
                      <RunButton run={deleteStage.bind(null, s.id)} confirm={`Delete stage ${s.name} and its outcomes?`}>Delete stage</RunButton>
                    </div>
                  </ActionForm>
                </li>
              );
            })}
          </ol>
        </div>
        <ActionForm action={addStage} className="flex h-fit flex-col gap-3 rounded-2xl border border-white/10 bg-card p-5">
          <p className="font-bold">Add a stage</p>
          <input type="hidden" name="drive_id" value={drive.id} />
          <label className={label}>Name<input name="name" required placeholder="Online test" className={input} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Order<input name="position" type="number" min="1" defaultValue={stages.length + 1} className={input} /></label>
            <label className={label}>Date<input name="stage_date" type="date" className={input} /></label>
          </div>
          <button className={primary}>Add stage</button>
        </ActionForm>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 text-sm">
            {[["eligible", "Eligible"], ["ineligible", "Not eligible"], ["all", "All"]].map(([k, l]) => (
              <Link key={k} href={`/cell/drives/${drive.id}${k === "eligible" ? "" : `?show=${k}`}`}
                className={`rounded-full border px-3 py-1 ${(show ?? "eligible") === k ? "border-accent text-accent" : "border-white/15 text-dim hover:text-fg"}`}>{l}</Link>
            ))}
          </div>
          <a href={`/cell/drives/${drive.id}/export`} className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold hover:border-white/40">Export CSV</a>
        </div>
        <p className="mt-2 text-xs text-faint">Names and marks here are visible only to the {college.short_name} cell. Do not screenshot them into public groups.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wider text-dim">
              <tr>
                <th className="px-3 py-2">Name</th><th className="px-3 py-2">Enrollment</th><th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">CGPA</th><th className="px-3 py-2">Status</th>
                {stages.map((s) => <th key={s.id} className="px-3 py-2">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={5 + stages.length} className="px-3 py-6 text-center text-faint">No one here yet.</td></tr>}
              {visible.map((r) => {
                const p = pp.get(r.user_id);
                const b = prof.get(r.user_id);
                return (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="px-3 py-2">{p?.full_name ?? "No profile"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p?.enrollment_no ?? ""}</td>
                    <td className="px-3 py-2 text-dim">{b?.branch}{b?.batch ? ` · ${b.batch}` : ""}</td>
                    <td className="px-3 py-2 tabular-nums">{p?.cgpa ?? ""}</td>
                    <td className="px-3 py-2">
                      <span className={r.status === "eligible" ? "text-good" : r.status === "ineligible" ? "text-accent" : "text-faint"}>{r.status}</span>
                      {r.reason && <div className="text-xs text-faint">{r.reason}</div>}
                    </td>
                    {stages.map((s) => {
                      const o = res.get(`${s.id}:${r.user_id}`);
                      return <td key={s.id} className={`px-3 py-2 text-xs ${o ? OUTCOME[o] : "text-faint"}`}>{o ? o.replace("_", " ") : "·"}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {drive.description && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-card p-5">
          <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">Description</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-dim">{drive.description}</p>
        </section>
      )}
      <div className="mt-10">
        <RunButton run={deleteDrive.bind(null, drive.id)} confirm="Delete this drive with all registrations and outcomes? This cannot be undone."
          className="rounded-full border border-accent/40 px-4 py-1.5 text-sm text-accent hover:bg-accent/10">Delete drive</RunButton>
      </div>
    </main>
  );
}

function Box({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="text-3xl font-extrabold tabular-nums text-accent">{big}</div>
      <div className="mt-1 text-sm text-dim">{label}</div>
    </div>
  );
}
