import Link from "next/link";
import { cellContext, istDateTime, KIND_LABEL, money, STATUS_STYLE, DRIVE_COLS, type DriveRow } from "@/components/cell/data";
import Gate, { CellTabs, NOT_CONFIGURED } from "@/components/cell/Gate";
import { ActionForm, RunButton, input, label, primary } from "@/components/cell/ui";
import { addMember, removeMember } from "@/components/cell/actions";

export const metadata = { title: "Placement cell · GS27" };

type MemberRow = { user_id: string; role: string; created_at: string; profiles: { handle: string; branch: string | null; batch: number | null } | null };

export default async function CellHome({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const ctx = await cellContext();
  if (!ctx.configured) return <Gate title="Placement cell console">{NOT_CONFIGURED}</Gate>;
  if (!ctx.viewer) return <Gate title="Placement cell console" next="/cell">The cell console is for your college&apos;s placement cell. Sign in to continue.</Gate>;
  if (!ctx.isCell) {
    return (
      <Gate title="Cell members only">
        This console is for the {ctx.college.short_name} placement cell. Your college admin or a cell head adds you by your handle.
        Students: open drives are on <Link href="/drives" className="text-accent hover:underline">/drives</Link>.
      </Gate>
    );
  }
  const { college, supabase, isHead } = ctx;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">{college.short_name} · PLACEMENT CELL</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Cell console</h1>
        <Link href="/cell/drives/new" className={primary}>New drive</Link>
      </div>
      <CellTabs active={tab === "members" ? "members" : "drives"} />
      {tab === "members" ? <Members collegeId={college.id} isHead={isHead} supabase={supabase} /> : <Drives collegeId={college.id} supabase={supabase} />}
    </main>
  );
}

type Sb = Extract<Awaited<ReturnType<typeof cellContext>>, { configured: true }>["supabase"];

async function Drives({ collegeId, supabase }: { collegeId: number; supabase: Sb }) {
  const [{ data: drives }, { data: regs }] = await Promise.all([
    supabase.from("drives").select(DRIVE_COLS).eq("college_id", collegeId).order("created_at", { ascending: false }).limit(300),
    supabase.from("drive_registrations").select("drive_id, status").eq("college_id", collegeId).limit(20000),
  ]);
  const counts = new Map<number, { all: number; eligible: number }>();
  for (const r of (regs ?? []) as { drive_id: number; status: string }[]) {
    if (r.status === "withdrawn") continue;
    const c = counts.get(r.drive_id) ?? { all: 0, eligible: 0 };
    c.all++;
    if (r.status === "eligible") c.eligible++;
    counts.set(r.drive_id, c);
  }
  const rows = (drives ?? []) as DriveRow[];
  if (!rows.length) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-faint">
        No drives yet. Create one: it replaces the company information sheet row and the poll form.
      </p>
    );
  }
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-card text-left text-xs uppercase tracking-wider text-dim">
          <tr>
            <th className="px-4 py-3">Company</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Package</th>
            <th className="px-4 py-3">Status</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3 text-right">Registered (eligible)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const c = counts.get(d.id);
            return (
              <tr key={d.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/cell/drives/${d.id}`} className="font-semibold hover:text-accent">{d.company}</Link>
                  {d.code && <div className="text-xs text-faint">{d.code}</div>}
                </td>
                <td className="px-4 py-3 text-dim">{KIND_LABEL[d.kind]}</td>
                <td className="px-4 py-3 tabular-nums">{money(d)}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[d.status]}`}>{d.status}</span></td>
                <td className="px-4 py-3 text-dim">{istDateTime(d.deadline)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c ? `${c.all} (${c.eligible})` : "0"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function Members({ collegeId, isHead, supabase }: { collegeId: number; isHead: boolean; supabase: Sb }) {
  const { data } = await supabase.from("cell_members").select("user_id, role, created_at, profiles(handle, branch, batch)")
    .eq("college_id", collegeId).order("role");
  const rows = (data ?? []) as unknown as MemberRow[];
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
        {rows.length === 0 && <li className="p-6 text-sm text-faint">No members yet. The college admin can add the first head.</li>}
        {rows.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <span className="font-semibold">@{m.profiles?.handle ?? "unknown"}</span>
              <span className="ml-2 text-xs text-dim">{m.profiles?.branch}{m.profiles?.batch ? ` · ${m.profiles.batch}` : ""}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-dim">{m.role}</span>
              {isHead && <RunButton run={removeMember.bind(null, collegeId, m.user_id)} confirm="Remove this member from the cell?">Remove</RunButton>}
            </div>
          </li>
        ))}
      </ul>
      {isHead ? (
        <ActionForm action={addMember} className="flex h-fit flex-col gap-3 rounded-2xl border border-white/10 bg-card p-5">
          <p className="font-bold">Add a member</p>
          <p className="text-xs text-dim">By their GS27 handle. They must have picked this college.</p>
          <input type="hidden" name="college_id" value={collegeId} />
          <label className={label}>Handle<input name="handle" required placeholder="@quiet_otter_042" className={input} /></label>
          <label className={label}>Role
            <select name="role" className={input} defaultValue="coordinator">
              <option value="coordinator">Coordinator</option><option value="manager">Manager</option><option value="head">Head</option>
            </select>
          </label>
          <button className={primary}>Add</button>
        </ActionForm>
      ) : (
        <p className="h-fit rounded-2xl border border-white/10 bg-card p-5 text-sm text-dim">Only heads add or remove members.</p>
      )}
    </div>
  );
}
