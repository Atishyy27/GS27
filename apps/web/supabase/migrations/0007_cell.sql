-- Placement-cell console (B2S). Replaces the cell's Google Sheets: company information, poll forms,
-- interview tracking, results. Everything is per college.
-- Privacy: a student's placement identity (name, enrollment number, marks) lives only in
-- placement_profiles, readable by the student and by their own college's cell. It is never joined to
-- the anonymous handle anywhere public. Public numbers come only from count functions below.

-- ---------- cell members ----------
create table public.cell_members (
  college_id bigint not null references public.colleges(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'coordinator' check (role in ('head', 'manager', 'coordinator')),
  created_at timestamptz not null default now(),
  primary key (college_id, user_id)
);

create or replace function public.is_cell_of(c bigint) returns boolean language sql stable security definer
set search_path = public as $$
  select public.is_admin_of(c) or exists (
    select 1 from cell_members m join profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.college_id = c and p.college_id = c)
$$;

create or replace function public.is_cell_head_of(c bigint) returns boolean language sql stable security definer
set search_path = public as $$
  select public.is_admin_of(c) or exists (
    select 1 from cell_members m join profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.college_id = c and m.role = 'head' and p.college_id = c)
$$;

alter table public.cell_members enable row level security;
create policy "cell members read" on public.cell_members for select using (public.is_cell_of(college_id));
-- heads (or the college admin) add members, and only people of that college
create policy "cell members add" on public.cell_members for insert with check (
  public.is_cell_head_of(college_id) and
  exists (select 1 from public.profiles p where p.id = user_id and p.college_id = cell_members.college_id));
create policy "cell members edit" on public.cell_members for update using (public.is_cell_head_of(college_id));
create policy "cell members remove" on public.cell_members for delete using (public.is_cell_head_of(college_id));

-- ---------- placement profiles (private) ----------
create table public.placement_profiles (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  college_id bigint not null references public.colleges(id),
  full_name text not null check (char_length(full_name) between 2 and 100),
  enrollment_no text not null check (enrollment_no ~ '^[A-Za-z0-9]{6,20}$'),
  phone text check (phone ~ '^[0-9+ -]{8,16}$'),
  cgpa numeric(4, 2) check (cgpa between 0 and 10),
  pct_10 numeric(5, 2) check (pct_10 between 0 and 100),
  pct_12 numeric(5, 2) check (pct_12 between 0 and 100),
  backlogs int not null default 0 check (backlogs >= 0),
  resume_url text,
  consent_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (college_id, enrollment_no)
);

-- college_id always follows the student's own profile; enrollment numbers are stored upper case
create or replace function public.stamp_placement_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.user_id <> auth.uid() then raise exception 'You can only edit your own placement profile'; end if;
    new.college_id := public.my_college();
    if new.college_id is null then raise exception 'Pick your college first'; end if;
  end if;
  new.enrollment_no := upper(new.enrollment_no);
  new.updated_at := now();
  return new;
end $$;
create trigger placement_profiles_stamp before insert or update on public.placement_profiles
  for each row execute function public.stamp_placement_profile();

alter table public.placement_profiles enable row level security;
revoke all on public.placement_profiles from anon;
create policy "placement profile read" on public.placement_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_cell_of(college_id));
create policy "placement profile add" on public.placement_profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy "placement profile edit" on public.placement_profiles for update to authenticated
  using (user_id = auth.uid());
create policy "placement profile delete" on public.placement_profiles for delete to authenticated
  using (user_id = auth.uid());

-- ---------- drives ----------
create table public.drives (
  id bigint generated always as identity primary key,
  college_id bigint not null references public.colleges(id),
  code text check (char_length(code) <= 40),
  company text not null check (char_length(company) between 2 and 120),
  kind text not null check (kind in ('internship', 'intern_fte', 'job')),
  ctc_lpa numeric(6, 2) check (ctc_lpa >= 0),
  stipend_month int check (stipend_month >= 0),
  branches text[] not null default '{}',
  all_branches boolean not null default false,
  min_cgpa numeric(4, 2) check (min_cgpa between 0 and 10),
  min_pct_10 numeric(5, 2) check (min_pct_10 between 0 and 100),
  min_pct_12 numeric(5, 2) check (min_pct_12 between 0 and 100),
  max_backlogs int check (max_backlogs >= 0),
  bond text check (char_length(bond) <= 300),
  location text check (char_length(location) <= 200),
  drive_date date,
  deadline timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'completed')),
  description text check (char_length(description) <= 5000),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.drives (college_id, status, created_at desc);
create trigger drives_stamp_college before insert on public.drives
  for each row execute function public.stamp_college();

-- a drive cannot move to another college after creation
create or replace function public.lock_college() returns trigger language plpgsql as $$
begin
  if new.college_id is distinct from old.college_id then raise exception 'college_id cannot change'; end if;
  return new;
end $$;
create trigger drives_lock_college before update on public.drives for each row execute function public.lock_college();

alter table public.drives enable row level security;
create policy "drives read" on public.drives for select using (
  public.is_cell_of(college_id) or (status <> 'draft' and college_id = public.my_college()));
create policy "drives add" on public.drives for insert with check (public.is_cell_of(college_id));
create policy "drives edit" on public.drives for update using (public.is_cell_of(college_id));
create policy "drives delete" on public.drives for delete using (public.is_cell_of(college_id));

-- ---------- registrations (the poll form) ----------
create table public.drive_registrations (
  id bigint generated always as identity primary key,
  drive_id bigint not null references public.drives(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  college_id bigint not null references public.colleges(id),
  status text not null default 'registered' check (status in ('registered', 'eligible', 'ineligible', 'withdrawn')),
  reason text,
  created_at timestamptz not null default now(),
  unique (drive_id, user_id)
);
create index on public.drive_registrations (drive_id, status);

-- Eligibility for one student against one drive: null when eligible, else the reasons.
create or replace function public.eligibility_reason(p_drive bigint, p_user uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare d drives; pp placement_profiles; br text; r text[] := '{}';
begin
  select * into d from drives where id = p_drive;
  select * into pp from placement_profiles where user_id = p_user;
  select branch into br from profiles where id = p_user;
  if pp.user_id is null then return 'No placement profile yet'; end if;
  if not d.all_branches and not (coalesce(br, '') = any (d.branches)) then r := r || ('Branch ' || coalesce(br, '?') || ' not eligible'); end if;
  if d.min_cgpa is not null and coalesce(pp.cgpa, 0) < d.min_cgpa then r := r || ('CGPA below ' || d.min_cgpa); end if;
  if d.min_pct_10 is not null and coalesce(pp.pct_10, 0) < d.min_pct_10 then r := r || ('10th below ' || d.min_pct_10 || '%'); end if;
  if d.min_pct_12 is not null and coalesce(pp.pct_12, 0) < d.min_pct_12 then r := r || ('12th below ' || d.min_pct_12 || '%'); end if;
  if d.max_backlogs is not null and pp.backlogs > d.max_backlogs then r := r || ('More than ' || d.max_backlogs || ' backlogs'); end if;
  return case when cardinality(r) = 0 then null else array_to_string(r, '; ') end;
end $$;

create or replace function public.register_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare d drives; why text;
begin
  select * into d from drives where id = new.drive_id;
  if d.id is null then raise exception 'No such drive'; end if;
  new.college_id := d.college_id;
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      if new.user_id <> auth.uid() then raise exception 'You can only register yourself'; end if;
      if d.college_id is distinct from public.my_college() then raise exception 'That drive belongs to another college'; end if;
      if d.status <> 'open' then raise exception 'This drive is not open for registration'; end if;
      if d.deadline is not null and d.deadline < now() then raise exception 'The registration deadline has passed'; end if;
      if not exists (select 1 from placement_profiles where user_id = new.user_id) then
        raise exception 'Fill your placement profile first';
      end if;
    end if;
    why := public.eligibility_reason(new.drive_id, new.user_id);
    new.status := case when why is null then 'eligible' else 'ineligible' end;
    new.reason := why;
    new.created_at := now();
  else
    -- students may only withdraw, or re-register a withdrawn row while the drive is open
    if new.drive_id <> old.drive_id or new.user_id <> old.user_id then raise exception 'Cannot move a registration'; end if;
    if auth.uid() is not null and not public.is_cell_of(d.college_id) then
      if new.status = 'withdrawn' then
        if d.status = 'completed' then raise exception 'This drive is already completed'; end if;
        new.reason := old.reason;
      elsif old.status = 'withdrawn' then
        if d.status <> 'open' or (d.deadline is not null and d.deadline < now()) then
          raise exception 'Registration is closed';
        end if;
        why := public.eligibility_reason(new.drive_id, new.user_id);
        new.status := case when why is null then 'eligible' else 'ineligible' end;
        new.reason := why;
      else
        raise exception 'You can only withdraw';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger drive_registrations_guard before insert or update on public.drive_registrations
  for each row execute function public.register_guard();

alter table public.drive_registrations enable row level security;
revoke all on public.drive_registrations from anon;
create policy "registrations read" on public.drive_registrations for select to authenticated
  using (user_id = auth.uid() or public.is_cell_of(college_id));
create policy "registrations add" on public.drive_registrations for insert to authenticated
  with check (user_id = auth.uid() and public.is_onboarded());
create policy "registrations edit" on public.drive_registrations for update to authenticated
  using (user_id = auth.uid() or public.is_cell_of(college_id));
create policy "registrations cell delete" on public.drive_registrations for delete to authenticated
  using (public.is_cell_of(college_id));

-- ---------- stages and outcomes ----------
create table public.drive_stages (
  id bigint generated always as identity primary key,
  drive_id bigint not null references public.drives(id) on delete cascade,
  college_id bigint not null references public.colleges(id),
  name text not null check (char_length(name) between 1 and 60),
  position int not null default 1,
  stage_date date,
  created_at timestamptz not null default now()
);
create index on public.drive_stages (drive_id, position);

create or replace function public.stamp_from_drive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select college_id into new.college_id from drives where id = new.drive_id;
  if new.college_id is null then raise exception 'No such drive'; end if;
  return new;
end $$;
create trigger drive_stages_stamp before insert or update on public.drive_stages
  for each row execute function public.stamp_from_drive();

alter table public.drive_stages enable row level security;
create policy "stages read" on public.drive_stages for select using (
  public.is_cell_of(college_id) or exists (
    select 1 from public.drives d where d.id = drive_id and d.status <> 'draft' and d.college_id = public.my_college()));
create policy "stages write" on public.drive_stages for all
  using (public.is_cell_of(college_id)) with check (public.is_cell_of(college_id));

create table public.stage_results (
  stage_id bigint not null references public.drive_stages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  college_id bigint not null references public.colleges(id),
  outcome text not null check (outcome in ('cleared', 'not_cleared', 'absent')),
  updated_at timestamptz not null default now(),
  primary key (stage_id, user_id)
);

create or replace function public.stage_result_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare dr bigint;
begin
  select college_id, drive_id into new.college_id, dr from drive_stages where id = new.stage_id;
  if new.college_id is null then raise exception 'No such stage'; end if;
  if not exists (select 1 from drive_registrations r where r.drive_id = dr and r.user_id = new.user_id) then
    raise exception 'That student is not registered for this drive';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger stage_results_guard before insert or update on public.stage_results
  for each row execute function public.stage_result_guard();

alter table public.stage_results enable row level security;
revoke all on public.stage_results from anon;
create policy "results read" on public.stage_results for select to authenticated
  using (user_id = auth.uid() or public.is_cell_of(college_id));
create policy "results write" on public.stage_results for all to authenticated
  using (public.is_cell_of(college_id)) with check (public.is_cell_of(college_id));

-- Bulk outcomes: the cell pastes enrollment numbers. Returns how many matched and which did not.
create or replace function public.set_stage_outcomes(p_stage bigint, p_enrollments text[], p_outcome text)
returns table (matched int, unmatched text[]) language plpgsql security definer set search_path = public as $$
declare c bigint; dr bigint; e text; uid uuid; n int := 0; miss text[] := '{}';
begin
  select college_id, drive_id into c, dr from drive_stages where id = p_stage;
  if c is null or not public.is_cell_of(c) then raise exception 'cell members only'; end if;
  if p_outcome not in ('cleared', 'not_cleared', 'absent') then raise exception 'bad outcome'; end if;
  foreach e in array p_enrollments loop
    e := upper(trim(e));
    continue when e = '';
    select pp.user_id into uid from placement_profiles pp
      join drive_registrations r on r.user_id = pp.user_id and r.drive_id = dr
      where pp.college_id = c and pp.enrollment_no = e;
    if uid is null then
      miss := miss || e;
    else
      insert into stage_results (stage_id, user_id, college_id, outcome) values (p_stage, uid, c, p_outcome)
      on conflict (stage_id, user_id) do update set outcome = excluded.outcome;
      n := n + 1;
    end if;
    uid := null;
  end loop;
  return query select n, miss;
end $$;

-- ---------- counts only: funnel and season stats ----------
-- Readable by anyone who can see the drive. No names, no enrollment numbers.
create or replace function public.drive_funnel(p_drive bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d drives;
begin
  select * into d from drives where id = p_drive;
  if d.id is null or (d.status = 'draft' and not public.is_cell_of(d.college_id)) then return null; end if;
  return jsonb_build_object(
    'registered', (select count(*) from drive_registrations where drive_id = p_drive and status <> 'withdrawn'),
    'eligible', (select count(*) from drive_registrations where drive_id = p_drive and status = 'eligible'),
    'stages', coalesce((select jsonb_agg(jsonb_build_object(
        'name', s.name, 'position', s.position,
        'cleared', (select count(*) from stage_results r where r.stage_id = s.id and r.outcome = 'cleared'),
        'appeared', (select count(*) from stage_results r where r.stage_id = s.id and r.outcome <> 'absent'))
        order by s.position) from drive_stages s where s.drive_id = p_drive), '[]'::jsonb));
end $$;

-- Season dashboard for a college. Branch rates are suppressed (null) when fewer than 5 students
-- registered, so a rate can never point at one person.
create or replace function public.college_season_stats(p_college bigint, p_from date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare br text[];
begin
  select branches into br from colleges where id = p_college;
  return (with d as (
      select * from drives where college_id = p_college and status <> 'draft'
        and coalesce(drive_date, created_at::date) >= p_from)
    select jsonb_build_object(
      'drives', (select count(*) from d),
      'by_kind', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from d group by kind) x), '{}'::jsonb),
      'by_month', coalesce((select jsonb_object_agg(m, n) from (
          select to_char(coalesce(drive_date, created_at::date), 'YYYY-MM') m, count(*) n from d group by 1) x), '{}'::jsonb),
      'ctc_median', (select percentile_cont(0.5) within group (order by ctc_lpa) from d where ctc_lpa > 0),
      'ctc_n', (select count(*) from d where ctc_lpa > 0),
      'ctc_min', (select min(ctc_lpa) from d where ctc_lpa > 0),
      'ctc_max', (select max(ctc_lpa) from d where ctc_lpa > 0),
      'stipend_median', (select percentile_cont(0.5) within group (order by stipend_month) from d where stipend_month > 0),
      'stipend_n', (select count(*) from d where stipend_month > 0),
      'open_per_branch', coalesce((select jsonb_object_agg(b, (select count(*) from d where all_branches or b = any (branches)))
          from unnest(br) b), '{}'::jsonb),
      'branch_rates', coalesce((select jsonb_object_agg(b, jsonb_build_object(
            'registered', x.reg,
            'cleared_any', case when x.reg >= 5 then x.clr end,
            'rate', case when x.reg >= 5 then round(100.0 * x.clr / x.reg) end))
          from (select p.branch b,
                       count(distinct r.user_id) reg,
                       count(distinct r.user_id) filter (where exists (
                         select 1 from stage_results sr join drive_stages s on s.id = sr.stage_id
                         where s.drive_id = r.drive_id and sr.user_id = r.user_id and sr.outcome = 'cleared')) clr
                from drive_registrations r join d on d.id = r.drive_id join profiles p on p.id = r.user_id
                where r.status <> 'withdrawn' and p.branch is not null
                group by p.branch) x), '{}'::jsonb)
    ));
end $$;

-- eligibility_reason takes any user id, so it must not be callable directly (it would let anyone probe
-- another student's marks against a cut-off). Triggers still use it as the owner.
revoke execute on function public.eligibility_reason(bigint, uuid) from public, anon, authenticated;

-- The signed-in student's own eligibility for a drive they can see. null = eligible.
create or replace function public.my_eligibility(p_drive bigint) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'Sign in first'; end if;
  if not exists (select 1 from drives where id = p_drive and status <> 'draft' and college_id = public.my_college()) then
    return 'Drive not found';
  end if;
  return public.eligibility_reason(p_drive, auth.uid());
end $$;
