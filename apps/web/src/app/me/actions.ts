"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BATCH_OPTIONS, BRANCH_OPTIONS } from "@/lib/catalog";
import { listColleges } from "@/lib/college";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  if (!hasSupabase) return;
  const branch = String(formData.get("branch") ?? "");
  const batch = Number(formData.get("batch"));
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  if (!BATCH_OPTIONS.includes(batch)) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/me");
  // branch must be one of the user's own college's branches (fallback: the default list)
  const { data: prof } = await supabase.from("profiles").select("college_id").eq("id", data.user.id).maybeSingle();
  const college = (await listColleges()).find((c) => c.id === prof?.college_id);
  const allowed = college?.branches.length ? college.branches : BRANCH_OPTIONS.map((b) => b.code as string);
  if (!allowed.includes(branch)) return;
  // only branch, batch and bio are updatable by users (column grants in 0001_init.sql)
  await supabase.from("profiles").update({ branch, batch, bio: bio || null }).eq("id", data.user.id);
  revalidatePath("/me");
}

/** Deletes one of the viewer's own posts or comments. RLS rejects anything that is not theirs. */
export async function deleteMine(formData: FormData) {
  if (!hasSupabase) return;
  const kind = String(formData.get("kind"));
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || (kind !== "post" && kind !== "comment")) return;
  const supabase = await createClient();
  await supabase.from(kind === "post" ? "posts" : "comments").delete().eq("id", id);
  revalidatePath("/me");
}
