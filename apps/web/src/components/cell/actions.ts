"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { CellActionState } from "./shared";

// Every write goes through RLS and the 0007 triggers: the database decides who may create drives,
// register, or record outcomes. These functions only parse forms and pass errors back.

async function client() {
  if (!hasSupabase) return { supabase: null, userId: null, error: "Backend not configured yet." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null, error: "Sign in first." };
  return { supabase, userId: data.user.id, error: null };
}

const refresh = () => {
  revalidatePath("/cell", "layout");
  revalidatePath("/drives", "layout");
};

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/** datetime-local value, typed in India time, to an ISO timestamp. */
const istToIso = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? new Date(`${s}:00+05:30`).toISOString() : null;
};

export async function saveDrive(_: CellActionState, form: FormData): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const id = form.get("id") ? Number(form.get("id")) : null;
  const company = String(form.get("company") ?? "").trim();
  const kind = String(form.get("kind") ?? "");
  if (company.length < 2) return { error: "Company name is required." };
  if (!["internship", "intern_fte", "job"].includes(kind)) return { error: "Pick a drive type." };
  const row = {
    code: String(form.get("code") ?? "").trim() || null,
    company,
    kind,
    ctc_lpa: num(form.get("ctc_lpa")),
    stipend_month: num(form.get("stipend_month")),
    branches: form.getAll("branches").map(String),
    all_branches: form.get("all_branches") === "on",
    min_cgpa: num(form.get("min_cgpa")),
    min_pct_10: num(form.get("min_pct_10")),
    min_pct_12: num(form.get("min_pct_12")),
    max_backlogs: num(form.get("max_backlogs")),
    bond: String(form.get("bond") ?? "").trim() || null,
    location: String(form.get("location") ?? "").trim() || null,
    drive_date: String(form.get("drive_date") ?? "").trim() || null,
    deadline: istToIso(form.get("deadline")),
    status: String(form.get("status") ?? "draft"),
    description: String(form.get("description") ?? "").trim() || null,
  };
  if (Object.values(row).some((v) => typeof v === "number" && Number.isNaN(v))) return { error: "One of the numbers is not a number." };
  if (!row.all_branches && row.branches.length === 0) return { error: "Pick the eligible branches, or tick All branches." };

  if (id) {
    const { error: e } = await supabase.from("drives").update(row).eq("id", id);
    if (e) return { error: e.message };
    refresh();
    return { ok: true, message: "Saved." };
  }
  const { data, error: e } = await supabase.from("drives").insert(row).select("id").single();
  if (e) return { error: e.message };
  refresh();
  redirect(`/cell/drives/${data.id}`);
}

export async function setDriveStatus(id: number, status: string): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("drives").update({ status }).eq("id", id);
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function deleteDrive(id: number): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("drives").delete().eq("id", id);
  if (e) return { error: e.message };
  refresh();
  redirect("/cell");
}

export async function addStage(_: CellActionState, form: FormData): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Name the stage (OA, GD, Interview 1...)." };
  const { error: e } = await supabase.from("drive_stages").insert({
    drive_id: Number(form.get("drive_id")),
    name,
    position: Number(form.get("position") ?? 1) || 1,
    stage_date: String(form.get("stage_date") ?? "").trim() || null,
  });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function deleteStage(id: number): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("drive_stages").delete().eq("id", id);
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

/** Paste enrollment numbers (any separator) and mark them all with one outcome. */
export async function bulkOutcomes(_: CellActionState, form: FormData): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const list = String(form.get("enrollments") ?? "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return { error: "Paste at least one enrollment number." };
  if (list.length > 2000) return { error: "At most 2000 at a time." };
  const { data, error: e } = await supabase.rpc("set_stage_outcomes", {
    p_stage: Number(form.get("stage_id")), p_enrollments: list, p_outcome: String(form.get("outcome")),
  });
  if (e) return { error: e.message };
  const r = (Array.isArray(data) ? data[0] : data) as { matched: number; unmatched: string[] } | null;
  refresh();
  const miss = r?.unmatched?.length ? ` Not matched (not registered, or no placement profile): ${r.unmatched.join(", ")}` : "";
  return { ok: true, message: `${r?.matched ?? 0} of ${list.length} marked.${miss}` };
}

export async function addMember(_: CellActionState, form: FormData): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const handle = String(form.get("handle") ?? "").trim().replace(/^@/, "");
  const collegeId = Number(form.get("college_id"));
  const { data: p } = await supabase.from("profiles").select("id").eq("handle", handle).eq("college_id", collegeId).maybeSingle();
  if (!p) return { error: `No one with the handle @${handle} in this college.` };
  const { error: e } = await supabase.from("cell_members").insert({ college_id: collegeId, user_id: p.id, role: String(form.get("role") ?? "coordinator") });
  if (e) return { error: e.message.includes("duplicate") ? "Already a member." : e.message };
  refresh();
  return { ok: true, message: `Added @${handle}.` };
}

export async function removeMember(collegeId: number, userId: string): Promise<CellActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("cell_members").delete().match({ college_id: collegeId, user_id: userId });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function savePlacementProfile(_: CellActionState, form: FormData): Promise<CellActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  if (form.get("consent") !== "on") return { error: "Tick the consent box to save." };
  const row = {
    user_id: userId,
    full_name: String(form.get("full_name") ?? "").trim(),
    enrollment_no: String(form.get("enrollment_no") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim() || null,
    cgpa: num(form.get("cgpa")),
    pct_10: num(form.get("pct_10")),
    pct_12: num(form.get("pct_12")),
    backlogs: num(form.get("backlogs")) ?? 0,
    resume_url: String(form.get("resume_url") ?? "").trim() || null,
    consent_at: new Date().toISOString(),
  };
  if (Object.values(row).some((v) => typeof v === "number" && Number.isNaN(v))) return { error: "One of the numbers is not a number." };
  // college_id is set by the database from your profile
  const { error: e } = await supabase.from("placement_profiles").upsert(row as typeof row & { college_id?: number }, { onConflict: "user_id" });
  if (e) {
    if (e.message.includes("college_id")) return { error: "Pick your college on the onboarding page first." };
    if (e.message.includes("enrollment_no")) return { error: "Enrollment number: 6 to 20 letters and digits, and it must be unique in your college." };
    return { error: e.message };
  }
  refresh();
  return { ok: true, message: "Saved. Eligibility for open drives is checked against this." };
}

export async function registerForDrive(driveId: number): Promise<CellActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const { data: existing } = await supabase.from("drive_registrations").select("id, status").eq("drive_id", driveId).eq("user_id", userId).maybeSingle();
  const { error: e } = existing
    ? await supabase.from("drive_registrations").update({ status: "registered" }).eq("id", existing.id)
    : await supabase.from("drive_registrations").insert({ drive_id: driveId });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function withdrawFromDrive(driveId: number): Promise<CellActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("drive_registrations").update({ status: "withdrawn" }).eq("drive_id", driveId).eq("user_id", userId);
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}
