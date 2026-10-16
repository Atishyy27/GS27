import { NextResponse, type NextRequest } from "next/server";
import { cellContext, PROFILE_COLS, type PlacementProfile } from "@/components/cell/data";

// CSV of a drive's registrations for the cell (the old "List of Applicants" sheet).
// RLS returns placement profiles only to the cell of the student's own college.

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // leading = + - @ would run as a formula in Sheets or Excel
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driveId = Number(id);
  const ctx = await cellContext();
  if (!ctx.configured || !ctx.viewer || !ctx.isCell || !Number.isInteger(driveId)) {
    return new NextResponse("Cell members only", { status: 403 });
  }
  const { supabase, college } = ctx;
  const { data: drive } = await supabase.from("drives").select("id, company, code").eq("id", driveId).eq("college_id", college.id).maybeSingle();
  if (!drive) return new NextResponse("Not found", { status: 404 });

  const [{ data: regs }, { data: stages }] = await Promise.all([
    supabase.from("drive_registrations").select("user_id, status, reason, created_at").eq("drive_id", driveId).order("created_at"),
    supabase.from("drive_stages").select("id, name, position").eq("drive_id", driveId).order("position"),
  ]);
  const regRows = (regs ?? []) as { user_id: string; status: string; reason: string | null; created_at: string }[];
  const stageRows = (stages ?? []) as { id: number; name: string }[];
  const ids = regRows.map((r) => r.user_id);
  const [{ data: pp }, { data: prof }, { data: res }] = ids.length
    ? await Promise.all([
        supabase.from("placement_profiles").select(PROFILE_COLS).in("user_id", ids),
        supabase.from("profiles").select("id, branch, batch").in("id", ids),
        stageRows.length ? supabase.from("stage_results").select("stage_id, user_id, outcome").in("stage_id", stageRows.map((s) => s.id)) : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const ppm = new Map(((pp ?? []) as PlacementProfile[]).map((p) => [p.user_id, p]));
  const pm = new Map(((prof ?? []) as { id: string; branch: string | null; batch: number | null }[]).map((p) => [p.id, p]));
  const rm = new Map(((res ?? []) as { stage_id: number; user_id: string; outcome: string }[]).map((r) => [`${r.stage_id}:${r.user_id}`, r.outcome]));

  const header = ["Name", "Enrollment", "Branch", "Batch", "Phone", "CGPA", "10th %", "12th %", "Backlogs", "Resume", "Status", "Reason", "Registered at", ...stageRows.map((s) => s.name)];
  const lines = [header.map(esc).join(",")];
  for (const r of regRows) {
    const p = ppm.get(r.user_id);
    const b = pm.get(r.user_id);
    lines.push([
      p?.full_name, p?.enrollment_no, b?.branch, b?.batch, p?.phone, p?.cgpa, p?.pct_10, p?.pct_12, p?.backlogs, p?.resume_url,
      r.status, r.reason, r.created_at, ...stageRows.map((s) => rm.get(`${s.id}:${r.user_id}`) ?? ""),
    ].map(esc).join(","));
  }
  const name = `${drive.code || drive.company}`.replace(/[^A-Za-z0-9-]+/g, "_").slice(0, 60);
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
