-- Hall of Fame: projects built by SGSITS students.
-- Anyone onboarded can submit; a mod approves before it shows. The submitter's account
-- (submitted_by) is never readable by other users; the public credit line is `builders`,
-- written by the submitter because builders want credit.

create table public.projects (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  tagline text not null default '' check (char_length(tagline) <= 120),
  description text not null default '' check (char_length(description) <= 2000),
  url text check (url is null or url ~ '^https?://'),
  repo_url text check (repo_url is null or repo_url ~ '^https?://'),
  image_url text check (image_url is null or image_url ~ '^https?://'),
  tags text[] not null default '{}' check (cardinality(tags) <= 6),
  builders text not null default '' check (char_length(builders) <= 200),
  batch int check (batch between 1990 and 2040),
  branch text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid default auth.uid() references public.profiles(id) on delete set null,
  score int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.projects (status, score desc);

create table public.project_votes (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  value smallint not null default 1 check (value = 1),
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

-- score counter
create or replace function public.apply_project_vote() returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'INSERT' then update projects set score = score + 1 where id = new.project_id;
  else update projects set score = score - 1 where id = old.project_id; end if;
  return null;
end $$;
create trigger project_votes_apply after insert or delete on public.project_votes
  for each row execute function public.apply_project_vote();

-- 5 submissions per user per 10 minutes (public.rate_limit counts author_id, so a small own one)
create or replace function public.projects_rate_limit() returns trigger language plpgsql security definer
set search_path = public as $$
declare n int;
begin
  select count(*) into n from projects where submitted_by = new.submitted_by and created_at > now() - interval '10 minutes';
  if n >= 5 then raise exception 'Slow down: at most 5 project submissions in 10 minutes'; end if;
  return new;
end $$;
create trigger projects_rate before insert on public.projects
  for each row execute function public.projects_rate_limit();

alter table public.projects enable row level security;
alter table public.project_votes enable row level security;

create policy "projects read" on public.projects for select
  using (status = 'approved' or submitted_by = auth.uid() or public.is_mod());
create policy "projects submit" on public.projects for insert
  with check (public.is_onboarded() and submitted_by = auth.uid() and status = 'pending' and score = 0);
create policy "projects mod edit" on public.projects for update using (public.is_mod());
create policy "projects mod delete" on public.projects for delete using (public.is_mod());

create policy "project votes own read" on public.project_votes for select using (user_id = auth.uid());
create policy "project votes add" on public.project_votes for insert with check (
  user_id = auth.uid() and public.is_onboarded() and
  exists (select 1 from public.projects p where p.id = project_id and p.status = 'approved'));
create policy "project votes remove" on public.project_votes for delete using (user_id = auth.uid());

-- submitted_by is closed to normal users (same pattern as posts in 0001)
revoke select on public.projects from anon, authenticated;
grant select (id, slug, name, tagline, description, url, repo_url, image_url, tags, builders, batch, branch, status, score, created_at)
  on public.projects to anon, authenticated;

-- The app reads through this view: it adds is_mine without exposing submitted_by.
create or replace view public.v_projects as
select p.id, p.slug, p.name, p.tagline, p.description, p.url, p.repo_url, p.image_url, p.tags, p.builders,
       p.batch, p.branch, p.status, p.score, p.created_at,
       (p.submitted_by = auth.uid()) as is_mine
from public.projects p
where p.status = 'approved' or p.submitted_by = auth.uid() or public.is_mod();

-- Mods approve or reject; logged like every other mod action.
create or replace function public.review_project(p_id bigint, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'bad status'; end if;
  update projects set status = p_status where id = p_id;
  insert into mod_actions (actor_id, action, target_type, target_id, note)
  values (auth.uid(), 'project_' || p_status, 'project', p_id::text, p_note);
end $$;

-- ---------- SEED ROWS: edit freely ----------
-- SEED 1: his own project (store link from his portfolio, src/content/site.ts).
insert into public.projects (slug, name, tagline, description, tags, builders, batch, branch, status, submitted_by, url)
values ('prd-helper', 'PRD Helper',
        'Chrome extension that takes the pain out of placement registration',
        'Built for the SGSITS placement registration (PRD) process: names files the way the cell wants them, auto-fills the registration form, and converts documents to the required format. Tested with the TPO in January 2026.',
        array['chrome-extension', 'placements', 'automation'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null,
        'https://chromewebstore.google.com/detail/prd-verification-tool/lhebknliliiigghklkdkljobkkmbhaoj');
-- SEED 2: a batchmate's tool. Builders and details left blank until they confirm.
insert into public.projects (slug, name, tagline, tags, builders, status, submitted_by)
values ('leadgs', 'leadgs', 'Details coming soon', array['tool'], '', 'approved', null);
