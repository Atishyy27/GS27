-- Past questions. A paper is one exam sitting of one subject at one college; each question belongs to a paper.
-- question_links record repeats across papers (kind says how close the match is).
-- solutions are versioned; the app shows only status = 'published'.

create table public.papers (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  college_id bigint references public.colleges(id),
  exam text not null,
  year int not null,
  paper_code text,
  source_url text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (subject_id, exam)
);

create table public.questions (
  id bigint generated always as identity primary key,
  paper_id bigint not null references public.papers(id) on delete cascade,
  ext_id text not null unique,
  q_no int not null check (q_no between 1 and 5),
  part text not null check (part in ('a', 'b', 'c', 'd', 'e')),
  is_or boolean not null default false,
  marks int,
  unit int,
  text text not null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.questions (paper_id);

create table public.question_links (
  id bigint generated always as identity primary key,
  from_id bigint not null references public.questions(id) on delete cascade,
  to_id bigint not null references public.questions(id) on delete cascade,
  kind text not null check (kind in ('exact', 'concept', 'related', 'covered')),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create table public.solutions (
  id bigint generated always as identity primary key,
  question_id bigint not null references public.questions(id) on delete cascade,
  version int not null default 1,
  body_md text not null,
  status text not null default 'published' check (status in ('published', 'suggested', 'rejected', 'archived')),
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  score int not null default 0,
  created_at timestamptz not null default now(),
  unique (question_id, version)
);

create or replace function public.college_of_paper(p_id bigint) returns bigint language sql stable security definer
set search_path = public as $$
  select college_id from papers where id = p_id
$$;

create or replace function public.college_of_question(q_id bigint) returns bigint language sql stable security definer
set search_path = public as $$
  select p.college_id from questions q join papers p on p.id = q.paper_id where q.id = q_id
$$;

alter table public.papers enable row level security;
alter table public.questions enable row level security;
alter table public.question_links enable row level security;
alter table public.solutions enable row level security;

create policy "papers read" on public.papers for select using (true);
-- Every insert policy pins the author to the caller. Students can only add papers for their own college.
create policy "papers add" on public.papers for insert
  with check (public.is_onboarded() and created_by = auth.uid() and college_id = public.my_college());
create policy "papers mod" on public.papers for update using (public.is_mod_of(college_id));
create policy "papers mod delete" on public.papers for delete using (public.is_mod_of(college_id));

create policy "questions read" on public.questions for select using (true);
create policy "questions add" on public.questions for insert
  with check (public.is_onboarded() and created_by = auth.uid() and public.college_of_paper(paper_id) = public.my_college());
create policy "questions mod" on public.questions for update using (public.is_mod_of(public.college_of_paper(paper_id)));
create policy "questions mod delete" on public.questions for delete using (public.is_mod_of(public.college_of_paper(paper_id)));

create policy "links read" on public.question_links for select using (true);
create policy "links add" on public.question_links for insert
  with check (public.is_onboarded() and created_by = auth.uid() and public.college_of_question(from_id) = public.my_college());
create policy "links mod" on public.question_links for update using (public.is_mod_of(public.college_of_question(from_id)));
create policy "links mod delete" on public.question_links for delete using (public.is_mod_of(public.college_of_question(from_id)));

-- A student can only ever add a suggestion. Publishing, rejecting and archiving are admin-only, so nobody can replace a
-- published solution by inserting a higher version. Suggestions are visible to their author and to admins only.
create policy "solutions read" on public.solutions for select
  using (status = 'published' or author_id = auth.uid() or public.is_admin_of(public.college_of_question(question_id)));
create policy "solutions add" on public.solutions for insert
  with check (public.is_onboarded() and author_id = auth.uid() and status = 'suggested' and score = 0
              and public.college_of_question(question_id) = public.my_college());
create policy "solutions admin" on public.solutions for update using (public.is_admin_of(public.college_of_question(question_id)));
create policy "solutions admin delete" on public.solutions for delete using (public.is_admin_of(public.college_of_question(question_id)));
