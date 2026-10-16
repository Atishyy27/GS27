"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { splitList } from "./data";
import type { FormState } from "./styles";

// Every write goes through RLS and the 0008 triggers: the database decides who may publish, apply or
// read a talent profile. Nothing here ever selects or sends a user id.

async function client() {
  if (!hasSupabase) return { supabase: null, error: "Backend not configured yet." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase: null, error: "Sign in first." } as const;
  return { supabase, error: null } as const;
}

const refresh = () => revalidatePath("/", "layout");
const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" || Number.isNaN(Number(v)) ? null : Number(v);
};
const url = (v: string) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v) || null;

// ---------- students ----------

export async function saveTalent(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const row = {
    display_name: str(f, "display_name", 80),
    headline: str(f, "headline", 140) || null,
    skills: splitList(f.get("skills")),
    links: Object.fromEntries((["github", "linkedin", "portfolio"] as const)
      .map((k) => [k, url(str(f, k, 200))]).filter(([, v]) => v)),
    leetcode_handle: str(f, "leetcode_handle", 40) || null,
    codeforces_handle: str(f, "codeforces_handle", 40) || null,
    resume_url: url(str(f, "resume_url", 500)),
    visible: f.get("visible") === "on",
  };
  if (row.display_name.length < 2) return { error: "Add the name recruiters should see." };
  const { data: id } = await supabase.rpc("my_talent_id");
  const res = id
    ? await supabase.from("talent_profiles").update(row).eq("id", id)
    : await supabase.from("talent_profiles").insert(row);
  if (res.error) return { error: res.error.message };
  refresh();
  return { ok: true, message: row.visible ? "Saved. Verified recruiters can now see this profile." : "Saved. The profile is hidden." };
}

export async function deleteTalent(): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { data: id } = await supabase.rpc("my_talent_id");
  if (id) await supabase.from("talent_profiles").delete().eq("id", id);
  refresh();
  return { ok: true, message: "Deleted." };
}

export async function applyToJob(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.from("applications").insert({ job_id: Number(f.get("job_id")), note: str(f, "note", 1000) || null });
  if (e) return { error: e.code === "23505" ? "You have already applied." : e.message };
  refresh();
  return { ok: true, message: "Applied. The recruiter sees your talent profile, never your GS27 handle." };
}

export async function withdraw(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.rpc("withdraw_application", { p_id: Number(f.get("id")) });
  if (e) return { error: e.message };
  refresh();
  return { ok: true, message: "Withdrawn." };
}

// ---------- organizations ----------

export async function createOrg(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const name = str(f, "name", 80);
  const slug = (str(f, "slug", 40) || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  if (name.length < 2 || slug.length < 2) return { error: "Give the organization a name." };
  const { error: e } = await supabase.from("organizations").insert({ name, slug, website: url(str(f, "website", 200)) });
  if (e) return { error: e.code === "23505" ? "That short name is taken. Pick another." : e.message };
  const { data } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle();
  refresh();
  if (data) redirect(`/recruit/o/${data.id}`);
  return { ok: true, message: "Created." };
}

export async function updateOrg(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.from("organizations").update({
    name: str(f, "name", 80), website: url(str(f, "website", 200)), logo_url: url(str(f, "logo_url", 500)),
  }).eq("id", Number(f.get("org_id")));
  if (e) return { error: e.message };
  refresh();
  return { ok: true, message: "Saved." };
}

export async function addMember(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.rpc("org_add_member", {
    p_org: Number(f.get("org_id")), p_email: str(f, "email", 200), p_role: str(f, "role", 20) || "recruiter",
  });
  if (e) return { error: e.message };
  refresh();
  return { ok: true, message: "Added." };
}

export async function removeMember(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.rpc("org_remove_member", { p_org: Number(f.get("org_id")), p_email: str(f, "email", 200) });
  if (e) return { error: e.message };
  refresh();
  return { ok: true, message: "Removed." };
}

// ---------- jobs ----------

export async function saveJob(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const orgId = Number(f.get("org_id"));
  const jobId = num(f, "job_id");
  const row = {
    org_id: orgId,
    title: str(f, "title", 120),
    kind: str(f, "kind", 20),
    ctc_lpa: num(f, "ctc_lpa"),
    stipend_month: num(f, "stipend_month"),
    location: str(f, "location", 120) || null,
    remote: f.get("remote") === "on",
    description: str(f, "description", 8000) || null,
    skills: splitList(f.get("skills")),
    colleges: f.getAll("colleges").map(Number).filter(Boolean),
    branches: f.getAll("branches").map(String),
    batches: f.getAll("batches").map(Number).filter(Boolean),
    status: str(f, "status", 20) || "draft",
    deadline: str(f, "deadline", 10) || null,
  };
  if (row.title.length < 3) return { error: "Add a job title." };
  const res = jobId
    ? await supabase.from("jobs").update(row).eq("id", jobId)
    : await supabase.from("jobs").insert(row);
  if (res.error) return { error: res.error.message };
  refresh();
  if (!jobId) redirect(`/recruit/o/${orgId}`);
  return { ok: true, message: "Saved." };
}

export async function deleteJob(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.from("jobs").delete().eq("id", Number(f.get("job_id")));
  if (e) return { error: e.message };
  refresh();
  redirect(`/recruit/o/${Number(f.get("org_id"))}`);
}

export async function setStatus(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.rpc("set_application_status", { p_id: Number(f.get("id")), p_status: str(f, "status", 20) });
  if (e) return { error: e.message };
  refresh();
  return { ok: true, message: "Updated." };
}

// ---------- platform admin ----------

export async function verifyOrg(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, error } = await client();
  if (!supabase) return { error };
  const { error: e } = await supabase.rpc("set_org_verified", {
    p_org: Number(f.get("org_id")), p_verified: f.get("verified") === "true", p_note: str(f, "note", 300) || null,
  });
  if (e) return { error: e.message };
  refresh();
  return { ok: true, message: f.get("verified") === "true" ? "Verified." : "Verification removed." };
}
