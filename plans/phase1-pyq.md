# GS27 phase 1: past questions on the subject page (plan for Haiku, reviewed by Opus)

Goal: a subject page shows every past question of that subject, grouped by unit, with marks, repeat chips and the
canonical solution, seeded from the ME46018 pack. Local only: no deploy, no git push, no Supabase dashboard work.
Repo: <repo>/apps/web (Next 16, React 19, Supabase, pnpm), branch `revamp`.
Source data: <cnc>/college/auto/packs/ME46018/
  (pyq-source.json = 83 questions; units/uN/pyq-solutions.json = solutions; unit.json = unit titles).

## Step 0: setup (stop if it fails)
- `cd apps/web && pnpm install` then `pnpm build`. Record whether the build passed BEFORE any change (baseline).
- Read node_modules/next/dist/docs/ for any API you use (AGENTS.md: this Next version differs from training data).

## Step 1: migration `supabase/migrations/0012_pyq.sql` (new file only)
Tables (all `bigint generated always as identity primary key`, `created_at timestamptz default now()`):
- `papers`: subject_id -> subjects(id) on delete cascade, college_id -> colleges(id), exam text not null (e.g. 'End-sem Nov-Dec 2025'),
  year int not null, paper_code text, source_url text, created_by uuid default auth.uid() references profiles(id) on delete set null.
  unique (subject_id, exam).
- `questions`: paper_id -> papers(id) on delete cascade, ext_id text unique not null (e.g. '25-3e'), q_no int not null (1-5),
  part text not null ('a'..'e'), is_or boolean not null default false, marks int (null allowed), unit int, text text not null,
  created_by uuid default auth.uid() references profiles(id) on delete set null.
- `question_links`: from_id -> questions(id) on delete cascade, to_id -> questions(id) on delete cascade,
  kind text not null check (kind in ('exact','concept','related','covered')), unique (from_id, to_id).
- `solutions`: question_id -> questions(id) on delete cascade, version int not null default 1, body_md text not null,
  status text not null default 'published' check (status in ('published','suggested','rejected','archived')),
  author_id uuid default auth.uid() references profiles(id) on delete set null, score int not null default 0.
  unique (question_id, version).
RLS, copying the style of 0006_colleges.sql: enable RLS on all four; `select using (true)` on all;
insert with check `public.is_onboarded()` on papers/questions/question_links/solutions;
update/delete only `public.is_mod_of(college_id)` (for questions/solutions/links join through papers to get college_id;
if that is awkward, use a helper function `public.college_of_paper(paper_id)` defined in the same file).
Check: the file parses: run `python -c "import sqlparse"` only if installed; otherwise re-read it and confirm every
statement ends with `;` and every referenced table/function exists in 0001-0011.

## Step 2: seed generator `cnc/college/placecom-data/gen_pyq_seed.py` (new) -> `supabase/migrations/0013_seed_me46018.sql`
- Read pyq-source.json and all units/uN/pyq-solutions.json.
- Subject: ME46018 Automobile Engineering, branch 'ME' (match the branch code style used in 0010_seed_sgsits.sql; read it),
  semester 7. Insert the subject if missing (`insert ... on conflict (branch, semester, name) do nothing`) and its subject_offering for sgsits.
- One `papers` row per distinct exam string; year from the exam string; paper_code from `code`.
- One `questions` row per pyq-source item: ext_id = id, q_no and part parsed from label (e.g. 'Q3(e) OR' -> 3, 'e', is_or true;
  mid-sem labels like 'Q1' -> part 'a'), marks, unit from slotUnit ('u3' -> 3), text.
- `question_links` from each solution's repeat {type, of}: type exact/concept -> kind same; 'related'/'none' skip unless 'of' exists (then 'related').
- `solutions` version 1 per question: body_md built from the solution: '**What it asks:** ' + asks, then Given / To find lists if present,
  then numbered steps (say + latex on its own line), then '**Answer:** ' + answer text, then '**Exam tip:** ' + examTip. Keep $...$ LaTeX as is.
- SQL escaping: single quotes doubled; use dollar-quoting $q$...$q$ for long text if simpler. Use subselects on ext_id for foreign keys
  (e.g. `(select id from questions where ext_id='25-3e')`), so the seed has no hard-coded ids.
- Print counts. Check: 83 questions, papers = number of distinct exams, links > 0, 83 solutions.

## Step 3: subject page section (UI, read-only)
- Find the subject page under src/app/library/s/[id]/ and add a "Past questions" section below what exists. Do not remove anything.
- Server component: fetch questions for this subject (join papers), order by unit, then year desc, then q_no, part.
- Render: unit heading ("Unit 3"), each question as a card: year + label + marks chip, text, a "Repeat xN" chip when it has links
  (count of linked questions + 1), and a collapsible "Solution" showing body_md as plain text with line breaks for now
  (markdown/LaTeX rendering is phase 2). Mobile first, Tailwind classes consistent with the existing page.
- Empty state: "No past questions yet."

## Checks (all must pass; paste outputs in the progress log)
1. `pnpm build` passes (and if it failed at baseline, it fails with the SAME errors only).
2. `pnpm lint` shows no new errors in files you touched.
3. Seed generator prints the expected counts (step 2).
4. `git diff --stat` touches only: the 2 new migrations, the generator, and files under src/app/library/s/[id]/.
5. No `git commit`, no `git push`, no deploy, no edits to .env*.

## Progress log
Write <repo>/plans/phase1-pyq.LOG.md: one line per step with result and command output tails.
Stop and report if any step fails twice.
