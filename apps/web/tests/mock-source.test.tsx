import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMockSource } from "@/lib/data/mock";
import PastQuestionsView from "@/components/library/PastQuestionsView";
import SyllabusView from "@/components/library/SyllabusView";

describe("mock data source", () => {
  it("ok: returns questions and a syllabus for the sample code only", async () => {
    const src = createMockSource("ok");
    expect((await src.pastQuestions(1)).length).toBe(3);
    expect((await src.syllabi(["ME46018"], 1)).length).toBe(1);
    expect(await src.syllabi(["ZZ00000"], 1)).toEqual([]);
  });

  it("empty: returns nothing", async () => {
    const src = createMockSource("empty");
    expect(await src.pastQuestions(1)).toEqual([]);
    expect(await src.syllabi(["ME46018"], 1)).toEqual([]);
  });

  it("error: rejects like a 500", async () => {
    const src = createMockSource("error");
    await expect(src.pastQuestions(1)).rejects.toThrow("mock 500");
    await expect(src.syllabi(["ME46018"], 1)).rejects.toThrow("mock 500");
  });

  it("slow: resolves only after the delay", async () => {
    const src = createMockSource("slow", 80);
    const t = Date.now();
    await src.pastQuestions(1);
    expect(Date.now() - t).toBeGreaterThanOrEqual(70);
  });
});

describe("PastQuestionsView", () => {
  it("groups by unit, shows the repeat chip and only the published solution", async () => {
    const html = renderToStaticMarkup(<PastQuestionsView questions={await createMockSource("ok").pastQuestions(1)} />);
    expect(html).toContain("Unit 1");
    expect(html).toContain("Unit 2");
    expect(html).toContain("Repeat x2");
    expect(html).toContain("sample long answer");
    expect(html).not.toContain("must never show");
  });

  it("shows the empty state", () => {
    expect(renderToStaticMarkup(<PastQuestionsView questions={[]} />)).toContain("No past questions yet.");
  });

  it("shows an error, not the empty state, when the read failed", () => {
    const html = renderToStaticMarkup(<PastQuestionsView questions={[]} error="mock 500" />);
    expect(html).toContain("Could not load past questions");
    expect(html).not.toContain("No past questions yet.");
  });
});

describe("SyllabusView", () => {
  it("renders every unit with the source link", async () => {
    const html = renderToStaticMarkup(<SyllabusView syllabi={await createMockSource("ok").syllabi(["ME46018"], 1)} />);
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`Unit ${n}`);
    expect(html).toContain("scheme 2023-24");
    expect(html).toContain("Open the PDF");
  });

  it("renders nothing for a subject without a syllabus, and an error line when the read failed", () => {
    expect(renderToStaticMarkup(<SyllabusView syllabi={[]} />)).toBe("");
    expect(renderToStaticMarkup(<SyllabusView syllabi={[]} error="x" />)).toContain("Could not load the syllabus");
  });
});
