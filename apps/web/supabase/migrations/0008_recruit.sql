-- Recruiters (B2B): organizations, jobs, opt-in talent profiles, applications.
--
-- Hard rule: the anonymous social identity (handle, posts) and the recruiter-facing talent profile never
-- meet. A talent profile has its own random id; its user_id is never selectable by anyone (column grants),
-- and applications point at the talent id, not the user id. profiles.id would reveal the handle, so no
-- recruiter-facing table or view exposes a user id. Org member lists go through a function that returns
-- emails, never ids.

-- ---------- organizations ----------
create table public.organizations (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  website text check (char_length(website) <= 200),
  logo_url text check (char_length(logo_url) <= 500),
  verified boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id bigint not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'recruiter' check (role in ('owner', 'recruiter')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create or replace function public.is_org_member(o bigint) returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from org_members where org_id = o and user_id = auth.uid())
$$;

create or replace function public.is_org_owner(o bigint) returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from org_members where org_id = o and user_id = auth.uid() and role = 'owner')
$$;

-- Member of at least one verified organization: the only people who can read visible talent profiles.
create or replace function public.is_verified_recruiter() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from org_members m join organizations o on o.id = m.org_id
                 where m.user_id = auth.uid() and o.verified)
$$;

-- The creator becomes owner.
create or replace function public.org_add_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into org_members (org_id, user_id, role) values (new.id, new.created_by, 'owner');
  end if;
  return null;
end $$;
create trigger organizations_add_creator after insert on public.organizations
  for each row execute function public.org_add_creator();

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

create policy "orgs read" on public.organizations for select using (verified or public.is_org_member(id) or public.is_platform_admin());
create policy "orgs create" on public.organizations for insert
  with check (auth.uid() is not null and created_by = auth.uid() and not verified);
create policy "orgs owner edit" on public.organizations for update using (public.is_org_owner(id));
revoke update on public.organizations from anon, authenticated;
grant update (name, website, logo_url) on public.organizations to authenticated;
-- created_by is a user id: keep it closed
revoke select on public.organizations from anon, authenticated;
grant select (id, slug, name, website, logo_url, verified, created_at) on public.organizations to anon, authenticated;

-- A member sees only their own membership rows; lists go through org_member_list().
create policy "members own read" on public.org_members for select using (user_id = auth.uid());
create policy "members leave" on public.org_members for delete using (user_id = auth.uid() and role <> 'owner');

create or replace function public.org_member_list(p_org bigint)
returns table (email text, role text, joined_at timestamptz, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_org_member(p_org) then raise exception 'members only'; end if;
  return query select u.email::text, m.role, m.joined_at, m.user_id = auth.uid()
    from org_members m join auth.users u on u.id = m.user_id where m.org_id = p_org order by m.joined_at;
end $$;

-- Owners add a recruiter by the email they signed in with (they must have signed in to GS27 once).
create or replace function public.org_add_member(p_org bigint, p_email text, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_org_owner(p_org) then raise exception 'owners only'; end if;
  if p_role not in ('owner', 'recruiter') then raise exception 'bad role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'No GS27 account with that email. Ask them to sign in once first.'; end if;
  insert into org_members (org_id, user_id, role) values (p_org, uid, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
end $$;

create or replace function public.org_remove_member(p_org bigint, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_org_owner(p_org) then raise exception 'owners only'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  delete from org_members where org_id = p_org and user_id = uid;
end $$;

-- Platform admins verify organizations; logged with the platform marker (college of the admin).
create or replace function public.set_org_verified(p_org bigint, p_verified boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
  update organizations set verified = p_verified where id = p_org;
  insert into mod_actions (actor_id, action, target_type, target_id, note, college_id)
  values (auth.uid(), case when p_verified then 'org_verify' else 'org_unverify' end, 'organization', p_org::text,
          p_note, coalesce(public.my_college(), (select id from colleges where slug = 'sgsits')));
end $$;

-- ---------- jobs ----------
create table public.jobs (
  id bigint generated always as identity primary key,
  org_id bigint not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  kind text not null check (kind in ('internship', 'job', 'contract')),
  ctc_lpa numeric(6, 2) check (ctc_lpa >= 0),
  stipend_month int check (stipend_month >= 0),
  location text check (char_length(location) <= 120),
  remote boolean not null default false,
  description text check (char_length(description) <= 8000),
  skills text[] not null default '{}',
  colleges bigint[] not null default '{}',   -- empty = all colleges
  branches text[] not null default '{}',     -- empty = all branches
  batches int[] not null default '{}',       -- empty = all batches
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  deadline date,
  created_at timestamptz not null default now()
);
create index on public.jobs (status, created_at desc);

-- Unverified organizations can draft but not publish.
create or replace function public.guard_job_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and not (select verified from organizations where id = new.org_id) then
    raise exception 'Your organization is not verified yet, so jobs stay in draft';
  end if;
  return new;
end $$;
create trigger jobs_publish_guard before insert or update on public.jobs
  for each row execute function public.guard_job_publish();

alter table public.jobs enable row level security;
create policy "jobs read" on public.jobs for select using (
  (status in ('published', 'closed') and exists (select 1 from organizations o where o.id = org_id and o.verified))
  or public.is_org_member(org_id));
create policy "jobs add" on public.jobs for insert with check (public.is_org_member(org_id));
create policy "jobs edit" on public.jobs for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "jobs delete" on public.jobs for delete using (public.is_org_member(org_id));

-- ---------- talent profiles ----------
create table public.talent_profiles (
  id uuid primary key default gen_random_uuid(),          -- the only id recruiters ever see
  user_id uuid not null unique default auth.uid() references public.profiles(id) on delete cascade,
  visible boolean not null default false,
  display_name text not null check (char_length(display_name) between 2 and 80),
  headline text check (char_length(headline) <= 140),
  college_id bigint references public.colleges(id),
  branch text,
  batch int,
  skills text[] not null default '{}',
  links jsonb not null default '{}'::jsonb,
  leetcode_handle text check (char_length(leetcode_handle) <= 40),
  codeforces_handle text check (char_length(codeforces_handle) <= 40),
  resume_url text check (char_length(resume_url) <= 500),
  updated_at timestamptz not null default now()
);

-- college, branch and batch are copied from the student's profile on every write: not editable here.
create or replace function public.talent_copy_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.user_id := auth.uid(); end if;
  select college_id, branch, batch into new.college_id, new.branch, new.batch from profiles where id = new.user_id;
  if new.college_id is null or new.branch is null or new.batch is null then
    raise exception 'Finish your GS27 profile (college, branch, batch) first';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger talent_profiles_copy before insert or update on public.talent_profiles
  for each row execute function public.talent_copy_profile();

alter table public.talent_profiles enable row level security;
create policy "talent read" on public.talent_profiles for select using (
  user_id = auth.uid() or (visible and public.is_verified_recruiter()));
create policy "talent own add" on public.talent_profiles for insert with check (user_id = auth.uid());
create policy "talent own edit" on public.talent_profiles for update using (user_id = auth.uid());
create policy "talent own delete" on public.talent_profiles for delete using (user_id = auth.uid());
revoke select on public.talent_profiles from anon, authenticated;
grant select (id, visible, display_name, headline, college_id, branch, batch, skills, links, leetcode_handle,
              codeforces_handle, resume_url, updated_at) on public.talent_profiles to authenticated;

-- The student's own row, found without touching user_id.
create or replace function public.my_talent_id() returns uuid language sql stable security definer
set search_path = public as $$ select id from talent_profiles where user_id = auth.uid() $$;

-- ---------- applications ----------
create table public.applications (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  talent_id uuid not null references public.talent_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  note text check (char_length(note) <= 1000),
  status text not null default 'applied' check (status in ('applied', 'shortlisted', 'rejected', 'hired', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, user_id)
);

create or replace function public.guard_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare t talent_profiles; j jobs; v boolean;
begin
  new.user_id := auth.uid();
  new.status := 'applied';
  select * into t from talent_profiles where user_id = auth.uid();
  if t.id is null then raise exception 'Create your talent profile first'; end if;
  if not t.visible then raise exception 'Turn on your talent profile so the recruiter can see it'; end if;
  new.talent_id := t.id;
  select * into j from jobs where id = new.job_id;
  select verified into v from organizations where id = j.org_id;
  if j.id is null or j.status <> 'published' or not coalesce(v, false) then raise exception 'This job is not open'; end if;
  if j.deadline is not null and j.deadline < current_date then raise exception 'The deadline has passed'; end if;
  if cardinality(j.colleges) > 0 and not (t.college_id = any (j.colleges)) then raise exception 'This job is not open to your college'; end if;
  if cardinality(j.branches) > 0 and not (t.branch = any (j.branches)) then raise exception 'This job is not open to your branch'; end if;
  if cardinality(j.batches) > 0 and not (t.batch = any (j.batches)) then raise exception 'This job is not open to your batch'; end if;
  return new;
end $$;
create trigger applications_guard before insert on public.applications
  for each row execute function public.guard_application();

alter table public.applications enable row level security;
create policy "applications read" on public.applications for select using (
  user_id = auth.uid() or public.is_org_member((select org_id from public.jobs j where j.id = job_id)));
create policy "applications add" on public.applications for insert with check (auth.uid() is not null);
revoke select on public.applications from anon, authenticated;
grant select (id, job_id, talent_id, note, status, created_at, updated_at) on public.applications to authenticated;
revoke update, delete on public.applications from anon, authenticated;

-- Status changes go through functions: recruiters move applied/shortlisted/rejected/hired, students withdraw.
create or replace function public.set_application_status(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare o bigint;
begin
  select j.org_id into o from applications a join jobs j on j.id = a.job_id where a.id = p_id;
  if o is null or not public.is_org_member(o) then raise exception 'recruiters of this job only'; end if;
  if p_status not in ('applied', 'shortlisted', 'rejected', 'hired') then raise exception 'bad status'; end if;
  update applications set status = p_status, updated_at = now() where id = p_id and status <> 'withdrawn';
end $$;

create or replace function public.withdraw_application(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update applications set status = 'withdrawn', updated_at = now() where id = p_id and user_id = auth.uid();
  if not found then raise exception 'not your application'; end if;
end $$;

-- The student's own applications, found without touching user_id.
create or replace function public.my_applications()
returns table (id bigint, job_id bigint, status text, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, job_id, status, note, created_at from applications where user_id = auth.uid() order by created_at desc
$$;

-- ---------- public counts ----------
create or replace function public.public_recruit_stats()
returns table (verified_orgs bigint, published_jobs bigint, visible_talent bigint)
language sql stable security definer set search_path = public as $$
  select (select count(*) from organizations where verified),
         (select count(*) from jobs j join organizations o on o.id = j.org_id where j.status = 'published' and o.verified),
         (select count(*) from talent_profiles where visible)
$$;
