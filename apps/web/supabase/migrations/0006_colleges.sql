-- Multi-college. Every content row belongs to one college; SGSITS is college #1.
-- A user belongs to one college. Sign-in with a college email domain sets the college and the verified
-- badge. Anyone else picks a college at onboarding and stays unverified until they link a college account.
-- Roles in profiles.role (mod, admin) now act only inside the user's own college; platform_admin is global.
-- college_id on content is always set by a trigger from the writer's profile, so it cannot be spoofed.

create table public.colleges (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,30}$'),
  name text not null,
  short_name text not null,
  city text,
  state text,
  email_domains text[] not null default '{}',
  branches text[] not null default array['CSE','IT','ECE','EI','EE','Mech','Civil','IP','BME','Other'],
  status text not null default 'active' check (status in ('pending', 'active', 'suspended')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now()
);

insert into public.colleges (slug, name, short_name, city, state, email_domains)
values ('sgsits', 'Shri G. S. Institute of Technology and Science', 'SGSITS', 'Indore', 'Madhya Pradesh', array['sgsits.ac.in']);

alter table public.colleges enable row level security;
create policy "colleges read" on public.colleges for select using (status <> 'suspended' or public.is_admin());

-- ---------- profiles ----------
alter table public.profiles add column college_id bigint references public.colleges(id);
alter table public.profiles add column platform_admin boolean not null default false;
update public.profiles set college_id = (select id from public.colleges where slug = 'sgsits');
grant update (college_id) on public.profiles to authenticated;

create or replace function public.college_for_email(p_email text) returns bigint language sql stable security definer
set search_path = public as $$
  select id from colleges
  where status = 'active' and split_part(lower(coalesce(p_email, '')), '@', 2) = any (email_domains)
  limit 1
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c bigint := public.college_for_email(new.email);
begin
  insert into public.profiles (id, handle, college_id, verified, verified_at)
  values (new.id, public.random_handle(), c, c is not null, case when c is not null then now() end);
  return new;
end $$;

create or replace function public.verify_from_identity() returns trigger
language plpgsql security definer set search_path = public as $$
declare c bigint := public.college_for_email(new.identity_data ->> 'email');
begin
  if c is not null then
    update public.profiles set verified = true, verified_at = coalesce(verified_at, now()), college_id = c
    where id = new.user_id;
  end if;
  return new;
end $$;

-- A verified user cannot move to another college (that would carry the badge across).
create or replace function public.guard_profile_college() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.college_id is distinct from old.college_id and old.verified
     and current_setting('gs27.trusted', true) is distinct from 'on' then
    raise exception 'Verified accounts cannot change college';
  end if;
  if new.college_id is distinct from old.college_id and not exists (
       select 1 from colleges where id = new.college_id and status = 'active') then
    raise exception 'Unknown college';
  end if;
  return new;
end $$;
create trigger profiles_college_guard before update of college_id on public.profiles
  for each row when (auth.uid() is not null) execute function public.guard_profile_college();

-- verify_from_identity runs as a trigger with no auth.uid() in a Supabase auth flow; the guard only fires
-- for user sessions, and the identity trigger updates through security definer, so it is not blocked.

-- ---------- helpers ----------
create or replace function public.my_college() returns bigint language sql stable security definer
set search_path = public as $$ select college_id from profiles where id = auth.uid() $$;

create or replace function public.is_platform_admin() returns boolean language sql stable security definer
set search_path = public as $$ select coalesce((select platform_admin from profiles where id = auth.uid()), false) $$;

create or replace function public.is_mod_of(c bigint) returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()
                 and (platform_admin or (role in ('mod', 'admin') and college_id = c)))
$$;

create or replace function public.is_admin_of(c bigint) returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()
                 and (platform_admin or (role = 'admin' and college_id = c)))
$$;

create or replace function public.is_onboarded() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()
                 and branch is not null and batch is not null and college_id is not null)
$$;

-- ---------- college_id on content ----------
do $$
declare t text;
begin
  foreach t in array array['resources','groups','posts','comments','projects','reports','mod_actions'] loop
    execute format('alter table public.%I add column college_id bigint references public.colleges(id)', t);
    execute format('update public.%I set college_id = (select id from public.colleges where slug = ''sgsits'')', t);
    execute format('alter table public.%I alter column college_id set not null', t);
    execute format('create index on public.%I (college_id)', t);
  end loop;
end $$;

-- ---------- shared syllabus ----------
-- Colleges change, the syllabus mostly does not (about 80% overlap). A subject is shared by every college;
-- a college "offers" it in a branch and semester, with its own subject code. Notes attach to the subject,
-- so an upload at one college helps every college teaching that subject.
alter table public.subjects drop constraint subjects_branch_semester_name_key;
create unique index subjects_name_key on public.subjects (lower(name));
comment on column public.subjects.branch is 'branch where the subject was first added; offerings hold the real mapping';

create table public.subject_offerings (
  id bigint generated always as identity primary key,
  college_id bigint not null references public.colleges(id),
  subject_id bigint not null references public.subjects(id) on delete cascade,
  branch text not null,
  semester int not null check (semester between 1 and 8),
  code text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (college_id, branch, semester, subject_id)
);
create index on public.subject_offerings (college_id, branch, semester);
insert into public.subject_offerings (college_id, subject_id, branch, semester, code, created_by)
select (select id from public.colleges where slug = 'sgsits'), id, branch, semester, code, created_by from public.subjects;

alter table public.subject_offerings enable row level security;
create policy "offerings read" on public.subject_offerings for select using (true);
create policy "offerings add" on public.subject_offerings for insert with check (public.is_onboarded() and created_by = auth.uid());
create policy "offerings mod" on public.subject_offerings for update using (public.is_mod_of(college_id));
create policy "offerings mod delete" on public.subject_offerings for delete using (public.is_mod_of(college_id));

-- Stamp college_id from the writer, and refuse writes that point at another college's parent row.
create or replace function public.stamp_college() returns trigger
language plpgsql security definer set search_path = public as $$
declare mine bigint := public.my_college(); parent bigint;
begin
  if auth.uid() is null then
    if new.college_id is null then raise exception 'college_id required'; end if;
    return new;  -- service role and SQL editor seeds set it themselves
  end if;
  if mine is null then raise exception 'Pick your college first'; end if;
  new.college_id := mine;
  -- to_jsonb: plpgsql cannot name a column the row type lacks, so read parent ids generically
  if tg_table_name = 'posts' and (to_jsonb(new) ->> 'group_id') is not null then
    select college_id into parent from groups where id = (to_jsonb(new) ->> 'group_id')::bigint;
  elsif tg_table_name = 'comments' then
    select college_id into parent from posts where id = (to_jsonb(new) ->> 'post_id')::bigint;
  elsif tg_table_name = 'subject_offerings' then
    parent := null;  -- subjects are shared by every college
  end if;
  if parent is not null and parent <> mine then raise exception 'That belongs to another college'; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['resources','groups','posts','comments','projects','reports','subject_offerings'] loop
    execute format('create trigger %I before insert on public.%I for each row execute function public.stamp_college()',
                   t || '_stamp_college', t);
  end loop;
end $$;

-- Joining a group of another college is refused.
create or replace function public.guard_member_college() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select college_id from groups where id = new.group_id) is distinct from public.my_college() then
    raise exception 'That group belongs to another college';
  end if;
  return new;
end $$;
create trigger group_members_college before insert on public.group_members
  for each row when (auth.uid() is not null) execute function public.guard_member_college();

-- Uniqueness is now per college.
-- (subjects are shared; see the shared syllabus section above)
alter table public.groups drop constraint groups_slug_key;
alter table public.groups add constraint groups_college_slug_key unique (college_id, slug);
alter table public.projects drop constraint projects_slug_key;
alter table public.projects add constraint projects_college_slug_key unique (college_id, slug);

-- Column grants: college_id is public on the tables that hide author_id.
grant select (college_id) on public.posts, public.comments, public.resources, public.projects to anon, authenticated;

-- ---------- policies: mods act only inside their college ----------
drop policy "subjects mod" on public.subjects;
create policy "subjects mod" on public.subjects for update using (public.is_platform_admin());

drop policy "resources read" on public.resources;
create policy "resources read" on public.resources for select using (not hidden or author_id = auth.uid() or public.is_mod_of(college_id));
drop policy "resources own edit" on public.resources;
create policy "resources own edit" on public.resources for update using (author_id = auth.uid() or public.is_mod_of(college_id));
drop policy "resources own delete" on public.resources;
create policy "resources own delete" on public.resources for delete using (author_id = auth.uid() or public.is_mod_of(college_id));

drop policy "groups edit" on public.groups;
create policy "groups edit" on public.groups for update using (created_by = auth.uid() or public.is_mod_of(college_id));
drop policy "leave" on public.group_members;
create policy "leave" on public.group_members for delete using (
  user_id = auth.uid() or public.is_mod_of((select college_id from public.groups g where g.id = group_id)));

drop policy "posts read" on public.posts;
create policy "posts read" on public.posts for select using (not hidden or author_id = auth.uid() or public.is_mod_of(college_id));
drop policy "posts edit" on public.posts;
create policy "posts edit" on public.posts for update using (author_id = auth.uid() or public.is_mod_of(college_id));
drop policy "posts delete" on public.posts;
create policy "posts delete" on public.posts for delete using (author_id = auth.uid() or public.is_mod_of(college_id));

drop policy "comments read" on public.comments;
create policy "comments read" on public.comments for select using (not hidden or author_id = auth.uid() or public.is_mod_of(college_id));
drop policy "comments edit" on public.comments;
create policy "comments edit" on public.comments for update using (author_id = auth.uid() or public.is_mod_of(college_id));
drop policy "comments delete" on public.comments;
create policy "comments delete" on public.comments for delete using (author_id = auth.uid() or public.is_mod_of(college_id));

drop policy "reports mod read" on public.reports;
create policy "reports mod read" on public.reports for select using (public.is_mod_of(college_id) or reporter_id = auth.uid());
drop policy "reports mod edit" on public.reports;
create policy "reports mod edit" on public.reports for update using (public.is_mod_of(college_id));
drop policy "mod log read" on public.mod_actions;
create policy "mod log read" on public.mod_actions for select using (public.is_mod_of(college_id));

drop policy "projects read" on public.projects;
create policy "projects read" on public.projects for select
  using (status = 'approved' or submitted_by = auth.uid() or public.is_mod_of(college_id));
drop policy "projects mod edit" on public.projects;
create policy "projects mod edit" on public.projects for update using (public.is_mod_of(college_id));
drop policy "projects mod delete" on public.projects;
create policy "projects mod delete" on public.projects for delete using (public.is_mod_of(college_id));

-- ---------- views: add college_id (appended, so create or replace works) ----------
create or replace view public.v_posts as
select p.id, p.group_id, p.title, p.body, p.resource_id, p.score, p.comment_count, p.hidden, p.created_at, p.anonymous,
       case when p.anonymous and p.author_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then null else p.author_id end as author_id,
       case when p.anonymous then 'anonymous' else a.handle end as author_handle,
       case when p.anonymous then null else a.branch end as author_branch,
       case when p.anonymous then null else a.batch end as author_batch,
       a.verified as author_verified,
       (p.author_id = auth.uid()) as is_mine,
       p.college_id
from public.posts p join public.profiles a on a.id = p.author_id
where not p.hidden or p.author_id = auth.uid() or public.is_mod_of(p.college_id);

create or replace view public.v_comments as
select c.id, c.post_id, c.parent_id, c.body, c.score, c.hidden, c.created_at, c.anonymous,
       case when c.anonymous and c.author_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then null else c.author_id end as author_id,
       case when c.anonymous then 'anonymous' else a.handle end as author_handle,
       case when c.anonymous then null else a.branch end as author_branch,
       case when c.anonymous then null else a.batch end as author_batch,
       a.verified as author_verified,
       (c.author_id = auth.uid()) as is_mine,
       c.college_id
from public.comments c join public.profiles a on a.id = c.author_id
where not c.hidden or c.author_id = auth.uid() or public.is_mod_of(c.college_id);

create or replace view public.v_resources as
select r.id, r.subject_id, r.kind, r.title, r.description, r.file_path, r.url, r.year, r.score, r.hidden, r.created_at, r.anonymous,
       case when r.anonymous and r.author_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then null else r.author_id end as author_id,
       case when r.anonymous then 'anonymous' else a.handle end as author_handle,
       case when r.anonymous then null else a.branch end as author_branch,
       case when r.anonymous then null else a.batch end as author_batch,
       a.verified as author_verified,
       (r.author_id = auth.uid()) as is_mine,
       r.college_id
from public.resources r join public.profiles a on a.id = r.author_id
where not r.hidden or r.author_id = auth.uid() or public.is_mod_of(r.college_id);

create or replace view public.v_projects as
select p.id, p.slug, p.name, p.tagline, p.description, p.url, p.repo_url, p.image_url, p.tags, p.builders,
       p.batch, p.branch, p.status, p.score, p.created_at,
       (p.submitted_by = auth.uid()) as is_mine,
       p.college_id
from public.projects p
where p.status = 'approved' or p.submitted_by = auth.uid() or public.is_mod_of(p.college_id);

-- ---------- mod functions: scoped to the item's college ----------
create or replace function public.item_college(p_type text, p_id bigint) returns bigint language plpgsql stable
security definer set search_path = public as $$
declare c bigint;
begin
  if p_type = 'post' then select college_id into c from posts where id = p_id;
  elsif p_type = 'comment' then select college_id into c from comments where id = p_id;
  elsif p_type = 'resource' then select college_id into c from resources where id = p_id;
  elsif p_type = 'project' then select college_id into c from projects where id = p_id;
  else raise exception 'bad type'; end if;
  return c;
end $$;

create or replace function public.moderate(p_type text, p_id bigint, p_hide boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare c bigint := public.item_college(p_type, p_id);
begin
  if not public.is_mod_of(c) then raise exception 'mods only'; end if;
  if p_type = 'post' then update posts set hidden = p_hide where id = p_id;
  elsif p_type = 'comment' then update comments set hidden = p_hide where id = p_id;
  elsif p_type = 'resource' then update resources set hidden = p_hide where id = p_id;
  else raise exception 'bad type'; end if;
  update reports set status = 'actioned' where target_type = p_type and target_id = p_id::text and status = 'open';
  insert into mod_actions (actor_id, action, target_type, target_id, note, college_id)
  values (auth.uid(), case when p_hide then 'hide' else 'restore' end, p_type, p_id::text, p_note, c);
end $$;

create or replace function public.reveal_author(p_type text, p_id bigint, p_note text)
returns table (email text, handle text) language plpgsql security definer set search_path = public as $$
declare uid uuid; c bigint := public.item_college(p_type, p_id);
begin
  if not public.is_admin_of(c) then raise exception 'admins only'; end if;
  if p_note is null or char_length(p_note) < 10 then raise exception 'give a reason (10+ chars)'; end if;
  if p_type = 'post' then select author_id into uid from posts where id = p_id;
  elsif p_type = 'comment' then select author_id into uid from comments where id = p_id;
  elsif p_type = 'resource' then select author_id into uid from resources where id = p_id;
  else raise exception 'bad type'; end if;
  insert into mod_actions (actor_id, action, target_type, target_id, note, college_id)
  values (auth.uid(), 'reveal_author', p_type, p_id::text, p_note, c);
  return query select u.email::text, pr.handle from auth.users u join profiles pr on pr.id = u.id where u.id = uid;
end $$;

create or replace function public.dismiss_reports(p_type text, p_id text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare c bigint;
begin
  select college_id into c from reports where target_type = p_type and target_id = p_id limit 1;
  if c is null or not public.is_mod_of(c) then raise exception 'mods only'; end if;
  update reports set status = 'dismissed' where target_type = p_type and target_id = p_id and status = 'open' and college_id = c;
  insert into mod_actions (actor_id, action, target_type, target_id, note, college_id)
  values (auth.uid(), 'dismiss', p_type, p_id, p_note, c);
end $$;

create or replace function public.review_project(p_id bigint, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare c bigint := public.item_college('project', p_id);
begin
  if not public.is_mod_of(c) then raise exception 'mods only'; end if;
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'bad status'; end if;
  update projects set status = p_status where id = p_id;
  insert into mod_actions (actor_id, action, target_type, target_id, note, college_id)
  values (auth.uid(), 'project_' || p_status, 'project', p_id::text, p_note, c);
end $$;

-- Old global helpers stay for any caller not yet moved; they now mean "mod or admin of my own college".
create or replace function public.is_mod() returns boolean language sql stable security definer
set search_path = public as $$ select public.is_mod_of(public.my_college()) $$;
create or replace function public.is_admin() returns boolean language sql stable security definer
set search_path = public as $$ select public.is_admin_of(public.my_college()) $$;
