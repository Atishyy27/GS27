"use server";

import { redirect } from "next/navigation";
import { BATCH_OPTIONS, BRANCH_OPTIONS } from "@/lib/catalog";
import { listColleges } from "@/lib/college";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export type OnboardState = { error?: string } | undefined;

export async function saveOnboarding(_: OnboardState, formData: FormData): Promise<OnboardState> {
  if (!hasSupabase) return { error: "Backend not configured yet." };
  const branch = String(formData.get("branch") ?? "");
  const batch = Number(formData.get("batch"));
  const collegeId = Number(formData.get("college_id"));
  const next = String(formData.get("next") ?? "/feed");
  if (!BATCH_OPTIONS.includes(batch)) return { error: "Pick your batch." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/onboarding");
  const { data: prof } = await supabase.from("profiles").select("college_id, verified").eq("id", data.user.id).maybeSingle();

  // A verified account keeps the college its email proved; everyone else picks one.
  const target = prof?.verified && prof.college_id ? prof.college_id : collegeId;
  const college = (await listColleges()).find((c) => c.id === target);
  if (!college) return { error: "Pick your college." };
  const allowed = college.branches.length ? college.branches : BRANCH_OPTIONS.map((b) => b.code as string);
  if (!allowed.includes(branch)) return { error: "Pick a branch from the list." };

  const update: { branch: string; batch: number; college_id?: number } = { branch, batch };
  if (prof?.college_id !== college.id) update.college_id = college.id;
  const { error } = await supabase.from("profiles").update(update).eq("id", data.user.id);
  // the guard trigger refuses a college change for verified accounts; show its message as is
  if (error) return { error: error.message };
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/feed");
}
