// Types and pure helpers for the cell console. Safe to import from client components.

// Row shapes for supabase/migrations/0007_cell.sql. Names and enrollment numbers only ever reach
// cell pages (RLS allows the cell of the student's own college) and the student's own pages.

export type DriveRow = {
  id: number;
  college_id: number;
  code: string | null;
  company: string;
  kind: "internship" | "intern_fte" | "job";
  ctc_lpa: number | null;
  stipend_month: number | null;
  branches: string[];
  all_branches: boolean;
  min_cgpa: number | null;
  min_pct_10: number | null;
  min_pct_12: number | null;
  max_backlogs: number | null;
  bond: string | null;
  location: string | null;
  drive_date: string | null;
  deadline: string | null;
  status: "draft" | "open" | "closed" | "completed";
  description: string | null;
  created_at: string;
};

export const DRIVE_COLS =
  "id, college_id, code, company, kind, ctc_lpa, stipend_month, branches, all_branches, min_cgpa, min_pct_10, min_pct_12, max_backlogs, bond, location, drive_date, deadline, status, description, created_at";

export type PlacementProfile = {
  user_id: string;
  college_id: number;
  full_name: string;
  enrollment_no: string;
  phone: string | null;
  cgpa: number | null;
  pct_10: number | null;
  pct_12: number | null;
  backlogs: number;
  resume_url: string | null;
  consent_at: string;
  updated_at: string;
};

export const PROFILE_COLS = "user_id, college_id, full_name, enrollment_no, phone, cgpa, pct_10, pct_12, backlogs, resume_url, consent_at, updated_at";

export type StageRow = { id: number; drive_id: number; name: string; position: number; stage_date: string | null };

export type CellActionState = { error?: string; ok?: boolean; message?: string } | undefined;

export const KIND_LABEL: Record<DriveRow["kind"], string> = { internship: "Internship", intern_fte: "Intern + FTE", job: "Job" };

export const STATUS_STYLE: Record<DriveRow["status"], string> = {
  draft: "border-white/15 text-faint",
  open: "border-good/40 text-good",
  closed: "border-accent/40 text-accent",
  completed: "border-white/15 text-dim",
};

export function money(d: Pick<DriveRow, "ctc_lpa" | "stipend_month">): string {
  const parts: string[] = [];
  if (d.ctc_lpa) parts.push(`${Number(d.ctc_lpa)} LPA`);
  if (d.stipend_month) parts.push(`₹${Math.round(d.stipend_month / 1000)}k/mo`);
  return parts.join(" · ") || "Not stated";
}

export function eligibilityLine(d: DriveRow): string {
  const parts = [d.all_branches ? "All branches" : d.branches.join(", ") || "No branch set"];
  if (d.min_cgpa != null) parts.push(`CGPA ${Number(d.min_cgpa)}+`);
  if (d.min_pct_10 != null) parts.push(`10th ${Number(d.min_pct_10)}%+`);
  if (d.min_pct_12 != null) parts.push(`12th ${Number(d.min_pct_12)}%+`);
  if (d.max_backlogs != null) parts.push(d.max_backlogs === 0 ? "no backlogs" : `≤${d.max_backlogs} backlogs`);
  return parts.join(" · ");
}

/** Deadlines are entered and shown in India time. */
export function istDateTime(iso: string | null): string {
  if (!iso) return "No deadline";
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** ISO string -> value for <input type="datetime-local"> in India time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 330 * 60_000);
  return d.toISOString().slice(0, 16);
}

export function isPastDeadline(d: Pick<DriveRow, "deadline">, now = Date.now()): boolean {
  return d.deadline != null && new Date(d.deadline).getTime() < now;
}
