import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The past-question migration is never applied here, so its row-level-security rules are checked as text.
const sql = readFileSync(new URL("../supabase/migrations/0012_pyq.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");

function policies() {
  const out: { name: string; table: string; op: string; body: string }[] = [];
  const re = /create policy "([^"]+)" on public\.(\w+) for (select|insert|update|delete)([\s\S]*?);\n/g;
  for (const m of sql.matchAll(re)) out.push({ name: m[1], table: m[2], op: m[3], body: m[4].replace(/\s+/g, " ").trim() });
  return out;
}

describe("0012_pyq.sql row-level security", () => {
  const all = policies();
  const inserts = all.filter((p) => p.op === "insert");

  it("has an insert policy on each of the four tables", () => {
    expect(inserts.map((p) => p.table).sort()).toEqual(["papers", "question_links", "questions", "solutions"]);
  });

  it("pins the author to the caller on every insert policy (4 of 4)", () => {
    for (const p of inserts) expect(p.body, `${p.table} insert`).toMatch(/(created_by|author_id) = auth\.uid\(\)/);
  });

  it("keeps inserts inside the caller's own college", () => {
    for (const p of inserts) expect(p.body, `${p.table} insert`).toContain("public.my_college()");
  });

  it("lets a student add only a suggested solution, never a published one", () => {
    const s = inserts.find((p) => p.table === "solutions")!;
    expect(s.body).toContain("status = 'suggested'");
    expect(s.body).not.toContain("published");
    expect(s.body).toContain("score = 0");
  });

  it("makes publish, edit and delete of solutions admin-only", () => {
    const writes = all.filter((p) => p.table === "solutions" && (p.op === "update" || p.op === "delete"));
    expect(writes.length).toBe(2);
    for (const p of writes) {
      expect(p.body).toContain("is_admin_of");
      expect(p.body).not.toContain("is_mod_of");
    }
  });

  it("hides other people's suggestions from readers", () => {
    const read = all.find((p) => p.table === "solutions" && p.op === "select")!;
    expect(read.body).toContain("status = 'published'");
    expect(read.body).toContain("author_id = auth.uid()");
    expect(read.body).not.toMatch(/using \(true\)/);
  });

  it("has no insert policy that only checks is_onboarded()", () => {
    for (const p of inserts) expect(p.body).not.toMatch(/^with check \(public\.is_onboarded\(\)\)$/);
  });
});
