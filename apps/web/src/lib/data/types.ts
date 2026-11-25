export type Solution = { body_md: string; version: number; status: string };

export type PastQuestion = {
  id: number; q_no: number; part: string; is_or: boolean; marks: number | null; unit: number | null; text: string;
  papers: { exam: string; year: number } | null; solutions: Solution[]; repeats: number;
};

export type SyllabusUnit = { no: number; text: string };

export type Syllabus = {
  id: number; branch: string; code: string; name: string; scheme_year: string; ltp: string | null; credits_total: number | null;
  prerequisites: string | null; units: SyllabusUnit[]; source_url: string | null; source_page: string | null; source_note: string | null;
};

/** Everything the library reads for the sections added in the 25 Nov review. One real implementation, one mock. */
export interface DataSource {
  pastQuestions(subjectId: number): Promise<PastQuestion[]>;
  syllabi(codes: string[], collegeId: number): Promise<Syllabus[]>;
}

export type MockMode = "ok" | "empty" | "error" | "slow";
