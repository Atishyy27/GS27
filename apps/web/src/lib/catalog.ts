// SGSITS B.Tech branches as used across the site. Codes match src/data/branches.ts.
export const BRANCH_OPTIONS = [
  { code: "CSE", name: "Computer Engineering" },
  { code: "IT", name: "Information Technology" },
  { code: "ECE", name: "Electronics & Telecom" },
  { code: "EI", name: "Electronics & Instrumentation" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "Mech", name: "Mechanical Engineering" },
  { code: "Civil", name: "Civil Engineering" },
  { code: "IP", name: "Industrial & Production" },
  { code: "BME", name: "Biomedical Engineering" },
  { code: "Other", name: "Other programme" },
] as const;

/** Batch = graduation year. */
export const BATCH_OPTIONS = [2026, 2027, 2028, 2029, 2030, 2031];

export const RESOURCE_KINDS = [
  { kind: "syllabus", label: "Syllabus" },
  { kind: "notes", label: "Notes" },
  { kind: "pyq", label: "Past papers" },
  { kind: "assignment", label: "Assignments" },
  { kind: "solution", label: "Solutions" },
  { kind: "lab", label: "Lab files" },
  { kind: "book", label: "Books" },
  { kind: "video", label: "Videos" },
  { kind: "other", label: "Other" },
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number]["kind"];

/** Current semester for a batch, from today's date (odd sem Jul-Dec, even Jan-Jun). */
export function currentSemester(batch: number, now = new Date()): number | null {
  const y = now.getFullYear();
  const startYear = batch - 4;
  const sem = (y - startYear) * 2 + (now.getMonth() >= 6 ? 1 : 0);
  return sem >= 1 && sem <= 8 ? sem : null;
}
