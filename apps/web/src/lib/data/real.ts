import { createClient } from "@/lib/supabase/server";
import type { DataSource, PastQuestion, Syllabus } from "./types";

type Row = Omit<PastQuestion, "repeats">;

export const realSource: DataSource = {
  async pastQuestions(subjectId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("questions")
      .select("id, q_no, part, is_or, marks, unit, text, papers!inner(exam, year, subject_id), solutions(body_md, version, status)")
      .eq("papers.subject_id", subjectId);
    if (error) throw new Error(error.message);
    const qs = ((data ?? []) as unknown as Row[]).slice().sort((a, b) =>
      (a.unit ?? 0) - (b.unit ?? 0) || (b.papers?.year ?? 0) - (a.papers?.year ?? 0) || a.q_no - b.q_no || a.part.localeCompare(b.part));

    const ids = qs.map((q) => q.id);
    const linked = new Map<number, Set<number>>();
    if (ids.length) {
      const { data: links, error: linkError } = await supabase.from("question_links").select("from_id, to_id")
        .or(`from_id.in.(${ids.join(",")}),to_id.in.(${ids.join(",")})`);
      if (linkError) throw new Error(linkError.message);
      for (const l of links ?? []) {
        for (const [a, b] of [[l.from_id, l.to_id], [l.to_id, l.from_id]]) {
          if (!linked.has(a)) linked.set(a, new Set());
          linked.get(a)!.add(b);
        }
      }
    }
    return qs.map((q) => ({ ...q, repeats: linked.get(q.id)?.size ?? 0 }));
  },

  async syllabi(codes, collegeId) {
    if (!codes.length) return [];
    const supabase = await createClient();
    const { data, error } = await supabase.from("subject_syllabus")
      .select("id, branch, code, name, scheme_year, ltp, credits_total, prerequisites, units, source_url, source_page, source_note")
      .eq("college_id", collegeId).in("code", codes).order("scheme_year", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Syllabus[];
  },
};
