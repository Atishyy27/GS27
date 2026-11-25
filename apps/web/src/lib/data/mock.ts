import type { DataSource, MockMode, PastQuestion, Syllabus } from "./types";

// Synthetic fixtures: made-up questions and a made-up syllabus. No real student, file or exam content.
const QUESTIONS: PastQuestion[] = [
  {
    id: 1, q_no: 1, part: "a", is_or: false, marks: 2, unit: 1, text: "Sample question about a vehicle frame (unit 1).",
    papers: { exam: "End-sem Nov-Dec 2025", year: 2025 },
    solutions: [{ body_md: "**What it asks:** a sample.\n\n1. Step one\n\n**Answer:** sample", version: 1, status: "published" }], repeats: 1,
  },
  {
    id: 2, q_no: 1, part: "a", is_or: false, marks: 2, unit: 1, text: "Sample question about a vehicle frame (unit 1), older paper.",
    papers: { exam: "End-sem Nov-Dec 2024", year: 2024 }, solutions: [], repeats: 1,
  },
  {
    id: 3, q_no: 2, part: "c", is_or: true, marks: 7, unit: 2, text: "Sample long question about steering (unit 2).",
    papers: { exam: "End-sem Nov-Dec 2025", year: 2025 },
    solutions: [
      { body_md: "A suggestion that must never show.", version: 2, status: "suggested" },
      { body_md: "**Answer:** sample long answer", version: 1, status: "published" },
    ], repeats: 0,
  },
];

const SYLLABUS: Syllabus = {
  id: 1, branch: "Mech", code: "ME46018", name: "Sample Vehicle Engineering", scheme_year: "2023-24", ltp: "3-0-2", credits_total: 4,
  prerequisites: "ME 26005 and ME 36509",
  units: [1, 2, 3, 4, 5].map((no) => ({ no, text: `Sample topics for unit ${no}: one, two, three.` })),
  source_url: "https://example.org/sample-syllabus.pdf", source_page: "39", source_note: "Synthetic fixture.",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMockSource(mode: MockMode = "ok", delayMs = 1500): DataSource {
  const gate = async () => {
    if (mode === "error") throw new Error("mock 500");
    if (mode === "slow") await wait(delayMs);
  };
  return {
    async pastQuestions() { await gate(); return mode === "empty" ? [] : QUESTIONS; },
    async syllabi(codes) { await gate(); return mode === "empty" ? [] : codes.includes(SYLLABUS.code) ? [SYLLABUS] : []; },
  };
}
