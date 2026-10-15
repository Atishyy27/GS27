"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BRANCH_OPTIONS } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

export type AddSubjectState = { error?: string; ok?: boolean };

export async function addSubject(_prev: AddSubjectState, formData: FormData): Promise<AddSubjectState> {
  const branch = String(formData.get("branch") ?? "");
  const semester = Number(formData.get("semester"));
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  if (!BRANCH_OPTIONS.some((b) => b.code === branch)) return { error: "Unknown branch." };
  if (!(semester >= 1 && semester <= 8)) return { error: "Semester must be 1 to 8." };
  if (name.length < 2 || name.length > 120) return { error: "Subject name must be 2 to 120 characters." };
  if (code && code.length > 20) return { error: "Code is too long." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/library/${branch}/${semester}`)}`);
  const { error } = await supabase.from("subjects").insert({ branch, semester, name, code, created_by: data.user.id });
  if (error) {
    if (error.code === "23505") return { error: "That subject already exists here." };
    return { error: error.message };
  }
  revalidatePath(`/library/${branch}/${semester}`);
  return { ok: true };
}
