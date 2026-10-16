import { createClient, hasSupabase } from "@/lib/supabase/server";

// Row shapes from supabase/migrations/0008_recruit.sql. No recruiter-facing shape carries a user id.

export type Org = { id: number; slug: string; name: string; website: string | null; logo_url: string | null; verified: boolean; created_at: string };

export type Job = {
  id: number;
  org_id: number;
  title: string;
  kind: "internship" | "job" | "contract";
  ctc_lpa: number | null;
  stipend_month: number | null;
  location: string | null;
  remote: boolean;
  description: string | null;
  skills: string[];
  colleges: number[];
  branches: string[];
  batches: number[];
  status: "draft" | "published" | "closed";
  deadline: string | null;
  created_at: string;
};

export type JobWithOrg = Job & { organizations: Pick<Org, "name" | "slug" | "logo_url" | "verified"> | null };

export type Talent = {
  id: string;
  visible: boolean;
  display_name: string;
  headline: string | null;
  college_id: number | null;
  branch: string | null;
  batch: number | null;
  skills: string[];
  links: { github?: string; linkedin?: string; portfolio?: string };
  leetcode_handle: string | null;
  codeforces_handle: string | null;
  resume_url: string | null;
  updated_at: string;
};

export type Application = { id: number; job_id: number; talent_id: string; note: string | null; status: AppStatus; created_at: string; updated_at: string };
export type AppStatus = "applied" | "shortlisted" | "rejected" | "hired" | "withdrawn";
export type MyApplication = { id: number; job_id: number; status: AppStatus; note: string | null; created_at: string };
export type Member = { email: string; role: "owner" | "recruiter"; joined_at: string; is_me: boolean };

export const JOB_KINDS = [
  { kind: "internship", label: "Internship" },
  { kind: "job", label: "Full-time" },
  { kind: "contract", label: "Contract" },
] as const;

export const TALENT_COLUMNS =
  "id, visible, display_name, headline, college_id, branch, batch, skills, links, leetcode_handle, codeforces_handle, resume_url, updated_at";
export const JOB_COLUMNS =
  "id, org_id, title, kind, ctc_lpa, stipend_month, location, remote, description, skills, colleges, branches, batches, status, deadline, created_at";
export const ORG_COLUMNS = "id, slug, name, website, logo_url, verified, created_at";

export function pay(j: Pick<Job, "ctc_lpa" | "stipend_month">): string {
  const parts: string[] = [];
  if (j.ctc_lpa) parts.push(`${Number(j.ctc_lpa)} LPA`);
  if (j.stipend_month) parts.push(`₹${(j.stipend_month / 1000).toFixed(j.stipend_month % 1000 ? 1 : 0)}k / month`);
  return parts.join(" · ") || "Pay not stated";
}

/** Comma or newline separated text to a clean, de-duplicated list. */
export function splitList(raw: FormDataEntryValue | null, max = 20): string[] {
  return [...new Set(String(raw ?? "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, max);
}

export async function db() {
  if (!hasSupabase) return null;
  return createClient();
}

/** Organizations the signed-in user belongs to, with their role. */
export async function myOrgs(): Promise<(Org & { role: "owner" | "recruiter" })[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: rows } = await supabase.from("org_members").select("org_id, role").eq("user_id", auth.user.id);
  if (!rows?.length) return [];
  const { data: orgs } = await supabase.from("organizations").select(ORG_COLUMNS).in("id", rows.map((r) => r.org_id));
  return ((orgs as Org[]) ?? []).map((o) => ({ ...o, role: rows.find((r) => r.org_id === o.id)!.role as "owner" | "recruiter" }));
}

/** The org if the viewer is a member of it, else null. */
export async function memberOrg(id: number) {
  return (await myOrgs()).find((o) => o.id === id) ?? null;
}

export async function myTalent(): Promise<Talent | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data: id } = await supabase.rpc("my_talent_id");
  if (!id) return null;
  const { data } = await supabase.from("talent_profiles").select(TALENT_COLUMNS).eq("id", id).maybeSingle();
  return (data as Talent) ?? null;
}

export async function myApplications(): Promise<MyApplication[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.rpc("my_applications");
  return (data as MyApplication[]) ?? [];
}
