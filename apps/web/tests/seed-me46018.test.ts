import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../supabase/migrations/0013_seed_me46018.sql", import.meta.url), "utf8");
const count = (re: RegExp) => (sql.match(re) ?? []).length;

describe("0013_seed_me46018.sql (generated)", () => {
  it("carries the counts the generator printed: 83 questions, 6 papers, 37 links, 83 solutions", () => {
    expect(count(/insert into public\.questions /g)).toBe(83);
    expect(count(/insert into public\.papers /g)).toBe(6);
    expect(count(/insert into public\.question_links /g)).toBe(37);
    expect(count(/insert into public\.solutions /g)).toBe(83);
  });

  it("creates the subject and one offering with the ME46018 code", () => {
    expect(count(/insert into public\.subjects /g)).toBe(1);
    expect(sql).toMatch(/insert into public\.subject_offerings .*'ME46018'/);
  });

  it("is re-runnable: every insert ends in on conflict do nothing", () => {
    const inserts = count(/^\s*insert into /gm);
    expect(count(/on conflict[^;]*do nothing;/g)).toBe(inserts);
  });

  it("points at the generator that now lives in this repo", () => {
    expect(sql.split("\n")[0]).toContain("apps/web/supabase/gen/gen_pyq_seed.py");
  });
});
