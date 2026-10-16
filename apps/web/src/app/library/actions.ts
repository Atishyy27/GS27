"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCollege, listColleges } from "@/lib/college";

export type SubjectHit = {
  id: number;
  name: string;
  offerings: { college: string; branch: string; semester: number; code: string | null }[];
};

/** Search the shared subject list, so people pick an existing subject before creating a new one. */
export async function searchSubjects(q: string): Promise<SubjectHit[]> {
  const term = q.trim().replace(/[%_,()]/g, " ").trim();
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data: subs } = await supabase.from("subjects").select("id, name").ilike("name", `%${term}%`).order("name").limit(8);
  if (!subs?.length) return [];
  const [{ data: offs }, colleges] = await Promise.all([
    supabase.from("subject_offerings").select("subject_id, college_id, branch, semester, code").in("subject_id", subs.map((s) => s.id)),
    listColleges(),
  ]);
  const short = new Map(colleges.map((c) => [c.id, c.short_name]));
  return subs.map((s) => ({
    id: s.id,
    name: s.name,
    offerings: (offs ?? []).filter((o) => o.subject_id === s.id)
      .map((o) => ({ college: short.get(o.college_id) ?? "?", branch: o.branch, semester: o.semester, code: o.code })),
  }));
}

export type OfferState = { error?: string; ok?: boolean; existing?: { id: number; name: string } };

/**
 * Add a subject to this college's branch and semester. With subject_id, reuse a shared subject;
 * otherwise create the shared subject first. The offering's college comes from the user's profile (DB trigger).
 */
export async function offerSubject(_prev: OfferState, formData: FormData): Promise<OfferState> {
  const branch = String(formData.get("branch") ?? "");
  const semester = Number(formData.get("semester"));
  const subjectIdRaw = String(formData.get("subject_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const college = await getCollege();
  if (!college.branches.includes(branch)) return { error: "Unknown branch for this college." };
  if (!(semester >= 1 && semester <= 8)) return { error: "Semester must be 1 to 8." };
  if (code && code.length > 20) return { error: "Code is too long." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/library/${branch}/${semester}`)}`);
  const userId = auth.user.id;

  let subjectId = subjectIdRaw ? Number(subjectIdRaw) : null;
  if (!subjectId) {
    if (name.length < 2 || name.length > 120) return { error: "Subject name must be 2 to 120 characters." };
    const { data: created, error } = await supabase.from("subjects")
      .insert({ branch, semester, name, code, created_by: userId }).select("id").single();
    if (error) {
      if (error.code === "23505") {
        const { data: ex } = await supabase.from("subjects").select("id, name").ilike("name", name.replace(/[%_]/g, "")).maybeSingle();
        return { error: "That subject already exists in the shared list. Use it instead:", existing: ex ?? undefined };
      }
      return { error: error.message };
    }
    subjectId = created.id;
  }

  const { error } = await supabase.from("subject_offerings")
    .insert({ subject_id: subjectId, branch, semester, code, created_by: userId });
  if (error) {
    if (error.code === "23505") return { error: "That subject is already listed in this semester." };
    return { error: error.message };
  }
  revalidatePath(`/library/${branch}/${semester}`);
  revalidatePath("/library");
  return { ok: true };
}
