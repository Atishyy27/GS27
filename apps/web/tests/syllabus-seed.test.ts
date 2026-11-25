import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Unit = { no: number; text: string };
type Subject = { code: string; name: string; page: string; ltp: string; credits_total: number; prerequisites: string | null; units: Unit[] };
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const data = JSON.parse(read("../supabase/seed-data/syllabus-mech-2023-24-pilot.json")) as { meta: Record<string, string>; subjects: Subject[] };
const sql = read("../supabase/migrations/0016_seed_syllabus_mech_pilot.sql");

describe("syllabus pilot data (10 Mechanical subjects, scheme 2023-24)", () => {
  it("has 10 unique subjects with SGSITS-style codes", () => {
    expect(data.subjects).toHaveLength(10);
    expect(new Set(data.subjects.map((s) => s.code)).size).toBe(10);
    for (const s of data.subjects) expect(s.code).toMatch(/^ME46\d{3}$/);
  });

  it("has 5 numbered units per subject, none empty", () => {
    for (const s of data.subjects) {
      expect(s.units.map((u) => u.no), s.code).toEqual([1, 2, 3, 4, 5]);
      for (const u of s.units) expect(u.text.trim().length, `${s.code} unit ${u.no}`).toBeGreaterThan(20);
    }
  });

  it("keeps credits and L-T-P consistent: practical hours mean 4 credits, otherwise 3", () => {
    for (const s of data.subjects) {
      const practical = Number(s.ltp.split("-")[2]) > 0;
      expect(s.credits_total, s.code).toBe(practical ? 4 : 3);
    }
  });

  it("does not reuse ME46020, whose meaning differs between schemes", () => {
    expect(data.subjects.some((s) => s.code === "ME46020")).toBe(false);
  });

  it("is the Internet Archive copy of the official PDF and never stores the PDF", () => {
    expect(data.meta.source_url).toMatch(/^https:\/\/web\.archive\.org\/web\/\d{14}\/https:\/\/www\.sgsits\.ac\.in\/files\//);
  });
});

describe("0016_seed_syllabus_mech_pilot.sql (generated)", () => {
  it("has one row per subject and carries every code and every unit", () => {
    expect((sql.match(/\$u\$\[/g) ?? []).length).toBe(10);
    for (const s of data.subjects) expect(sql).toContain(`'${s.code}'`);
    expect((sql.match(/"no":\d/g) ?? []).length).toBe(50);
  });

  it("is re-runnable and creates no subject or offering", () => {
    expect(sql).toContain("on conflict (college_id, branch, code, scheme_year) do nothing;");
    expect(sql).not.toMatch(/insert into public\.(subjects|subject_offerings)/);
  });
});

describe("0015_subject_syllabus.sql", () => {
  it("lets only an admin of the college write", () => {
    const m = read("../supabase/migrations/0015_subject_syllabus.sql");
    const writes = [...m.matchAll(/create policy "([^"]+)" on public\.subject_syllabus for (insert|update|delete)[^;]*;/g)];
    expect(writes).toHaveLength(3);
    for (const w of writes) expect(w[0]).toContain("is_admin_of(college_id)");
  });
});

describe("0014_seed_me46020.sql", () => {
  it("adds only the subject and its offering", () => {
    const m = read("../supabase/migrations/0014_seed_me46020.sql");
    expect((m.match(/insert into /g) ?? []).length).toBe(2);
    expect(m).toContain("'ME46020'");
  });
});
