"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { BRANCH_OPTIONS } from "@/lib/catalog";
import { parseTags, slugify, type HallState } from "./data";

// Every write goes through RLS. Inserts never read back submitted_by (it is not selectable).

async function client() {
  if (!hasSupabase) return { supabase: null, userId: null, error: "Backend not configured yet." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null, error: "Sign in first." };
  return { supabase, userId: data.user.id, error: null };
}

const link = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

export async function submitProject(_: HallState, form: FormData): Promise<HallState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const name = String(form.get("name") ?? "").trim();
  const tagline = String(form.get("tagline") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const builders = String(form.get("builders") ?? "").trim();
  const url = link(form.get("url"));
  const repo = link(form.get("repo_url"));
  const image = link(form.get("image_url"));
  const branch = String(form.get("branch") ?? "") || null;
  const batch = form.get("batch") ? Number(form.get("batch")) : null;

  if (name.length < 2 || name.length > 80) return { error: "Name must be 2 to 80 characters." };
  if (tagline.length > 120) return { error: "Tagline is too long (120 max)." };
  if (description.length > 2000) return { error: "Description is too long (2000 max)." };
  if (builders.length > 200) return { error: "Builders line is too long (200 max)." };
  for (const u of [url, repo, image]) if (u && !/^https?:\/\//.test(u)) return { error: "Links must start with http:// or https://" };
  if (!url && !repo) return { error: "Add a live link or a repo link so people can see it." };
  if (branch && !BRANCH_OPTIONS.some((b) => b.code === branch)) return { error: "Pick a branch from the list." };
  if (batch && !(batch >= 1990 && batch <= 2040)) return { error: "Batch looks wrong." };

  const base = slugify(name) || "project";
  const slug = base.length >= 2 ? base : `${base}-x`;
  const row = {
    name, tagline, description, builders, url, repo_url: repo, image_url: image, branch, batch,
    tags: parseTags(String(form.get("tags") ?? "")),
  };
  let { error: e } = await supabase.from("projects").insert({ ...row, slug });
  if (e?.message.includes("duplicate")) {
    ({ error: e } = await supabase.from("projects").insert({ ...row, slug: `${slug.slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}` }));
  }
  if (e) {
    if (e.message.includes("row-level security")) return { error: "Finish onboarding (branch and batch) before submitting." };
    return { error: e.message };
  }
  revalidatePath("/hall");
  return { ok: true };
}

export async function toggleProjectVote(projectId: number, on: boolean): Promise<HallState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = on
    ? await supabase.from("project_votes").insert({ project_id: projectId })
    : await supabase.from("project_votes").delete().eq("project_id", projectId);
  if (e && !e.message.includes("duplicate")) {
    if (e.message.includes("row-level security")) return { error: "Finish onboarding to vote." };
    return { error: e.message };
  }
  revalidatePath("/hall");
  return { ok: true };
}

export async function reviewProject(projectId: number, status: "approved" | "rejected", note: string): Promise<HallState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.rpc("review_project", { p_id: projectId, p_status: status, p_note: note || null });
  if (e) return { error: e.message };
  revalidatePath("/hall");
  return { ok: true };
}

