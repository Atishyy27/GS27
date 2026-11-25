-- Official syllabus per subject code. It is keyed by college, branch and code (not by subject) because subject names are shared
-- across the whole app (0006: unique on lower(name)) while a syllabus belongs to one branch and one scheme year.
-- The subject page shows the rows whose code matches one of the college's offerings of that subject.
-- Read by everyone; only an admin of the college writes.

create table public.subject_syllabus (
  id bigint generated always as identity primary key,
  college_id bigint not null references public.colleges(id),
  branch text not null,
  code text not null,
  name text not null,
  scheme_year text not null,
  ltp text,
  credits_total int,
  prerequisites text,
  units jsonb not null default '[]'::jsonb check (jsonb_typeof(units) = 'array'),
  source_url text,
  source_page text,
  source_note text,
  created_at timestamptz not null default now(),
  unique (college_id, branch, code, scheme_year)
);
create index on public.subject_syllabus (college_id, code);

alter table public.subject_syllabus enable row level security;
create policy "syllabus read" on public.subject_syllabus for select using (true);
create policy "syllabus admin add" on public.subject_syllabus for insert with check (public.is_admin_of(college_id));
create policy "syllabus admin edit" on public.subject_syllabus for update using (public.is_admin_of(college_id));
create policy "syllabus admin delete" on public.subject_syllabus for delete using (public.is_admin_of(college_id));
