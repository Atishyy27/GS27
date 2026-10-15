-- GS27 core schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Identity model: anyone signs in with Google. An @sgsits.ac.in address is marked verified.
-- The public only ever sees a random handle plus branch/batch badge. Real emails live only in
-- auth.users; admins can reveal who wrote a reported item through reveal_author(), which is logged.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  branch text,
  batch int check (batch between 2020 and 2040),
  verified boolean not null default false,
  verified_at timestamptz,
  role text not null default 'user' check (role in ('user', 'mod', 'admin')),
  bio text check (char_length(bio) <= 160),
  created_at timestamptz not null default now()
);

create or replace function public.random_handle() returns text language plpgsql as $$
declare
  adj text[] := array['quiet','swift','lazy','brave','sleepy','cosmic','salty','fuzzy','clever','rusty',
                      'spicy','silent','lucky','grumpy','witty','mellow','turbo','pixel','neon','chai'];
  noun text[] := array['otter','falcon','panda','gecko','tiger','koala','raven','lynx','yak','mango',
                       'samosa','poha','jalebi','cobra','owl','bison','heron','fox','crane','moth'];
  h text;
begin
  loop
    h := adj[1 + floor(random() * array_length(adj, 1))::int] || '_' ||
         noun[1 + floor(random() * array_length(noun, 1))::int] || '_' ||
         lpad((floor(random() * 1000))::int::text, 3, '0');
    exit when not exists (select 1 from public.profiles where handle = h);
  end loop;
  return h;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, verified, verified_at)
  values (new.id, public.random_handle(),
          lower(coalesce(new.email, '')) like '%@sgsits.ac.in',
          case when lower(coalesce(new.email, '')) like '%@sgsits.ac.in' then now() end);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- "Verify later": a Google-signed-in user links their @sgsits.ac.in Google account
-- (supabase.auth.linkIdentity; needs "Allow manual linking" on in Auth settings). Any linked
-- identity with a college address marks the profile verified.
create or replace function public.verify_from_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.identity_data ->> 'email', '')) like '%@sgsits.ac.in' then
    update public.profiles set verified = true, verified_at = coalesce(verified_at, now()) where id = new.user_id;
  end if;
  return new;
end $$;

create trigger on_identity_linked after insert on auth.identities
  for each row execute function public.verify_from_identity();

create or replace function public.is_mod() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('mod', 'admin'))
$$;

create or replace function public.is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile editable" on public.profiles for update using (id = auth.uid());
-- users may change only these columns; verified and role are set by triggers and admins
revoke update on public.profiles from authenticated, anon;
grant update (branch, batch, bio) on public.profiles to authenticated;

-- ---------- library ----------
create table public.subjects (
  id bigint generated always as identity primary key,
  branch text not null,
  semester int not null check (semester between 1 and 8),
  code text,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (branch, semester, name)
);

create table public.resources (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  kind text not null check (kind in ('syllabus','notes','pyq','assignment','solution','lab','book','video','other')),
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 1000),
  file_path text,          -- object path in the "library" storage bucket
  url text,                -- or an external link
  year int,                -- exam or academic year, for PYQs and assignments
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  anonymous boolean not null default false,
  score int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (file_path is not null or url is not null)
);
create index on public.resources (subject_id, kind, score desc);

-- ---------- groups ----------
create table public.groups (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text check (char_length(description) <= 300),
  kind text not null default 'custom' check (kind in ('branch','batch','subject','placecom','custom')),
  branch text,
  batch int,
  verified_only boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id bigint references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'mod')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ---------- posts and comments ----------
-- group_id null = the open timeline (X-style); otherwise a group post (Reddit-style)
create table public.posts (
  id bigint generated always as identity primary key,
  group_id bigint references public.groups(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  anonymous boolean not null default false,
  title text check (char_length(title) <= 200),
  body text not null check (char_length(body) between 1 and 5000),
  resource_id bigint references public.resources(id) on delete set null,
  score int not null default 0,
  comment_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.posts (group_id, created_at desc);
create index on public.posts (author_id, created_at desc);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  anonymous boolean not null default false,
  body text not null check (char_length(body) between 1 and 3000),
  score int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.comments (post_id, created_at);

create table public.votes (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'resource')),
  target_id bigint not null,
  value smallint not null check (value in (-1, 1)),
  primary key (user_id, target_type, target_id)
);

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ---------- moderation ----------
create table public.reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post', 'comment', 'resource', 'profile')),
  target_id text not null,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table public.mod_actions (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- counters ----------
create or replace function public.apply_vote() returns trigger language plpgsql security definer
set search_path = public as $$
declare d int; t text; i bigint;
begin
  if tg_op = 'INSERT' then d := new.value; t := new.target_type; i := new.target_id;
  elsif tg_op = 'DELETE' then d := -old.value; t := old.target_type; i := old.target_id;
  else d := new.value - old.value; t := new.target_type; i := new.target_id; end if;
  if t = 'post' then update posts set score = score + d where id = i;
  elsif t = 'comment' then update comments set score = score + d where id = i;
  else update resources set score = score + d where id = i; end if;
  return null;
end $$;
create trigger votes_apply after insert or update or delete on public.votes
  for each row execute function public.apply_vote();

create or replace function public.count_comments() returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'INSERT' then update posts set comment_count = comment_count + 1 where id = new.post_id;
  else update posts set comment_count = comment_count - 1 where id = old.post_id; end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.count_comments();

-- ---------- rate limits (per user, per table) ----------
create or replace function public.rate_limit() returns trigger language plpgsql security definer
set search_path = public as $$
declare n int; lim int := tg_argv[0]::int;
begin
  execute format('select count(*) from %I.%I where author_id = $1 and created_at > now() - interval ''10 minutes''',
                 tg_table_schema, tg_table_name) into n using new.author_id;
  if n >= lim then raise exception 'Slow down: at most % in 10 minutes', lim; end if;
  return new;
end $$;
create trigger posts_rate before insert on public.posts for each row execute function public.rate_limit('10');
create trigger comments_rate before insert on public.comments for each row execute function public.rate_limit('30');
create trigger resources_rate before insert on public.resources for each row execute function public.rate_limit('20');

-- ---------- row level security ----------
alter table public.subjects enable row level security;
alter table public.resources enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;
alter table public.mod_actions enable row level security;

-- Onboarded = has branch and batch. Writing anything needs a signed-in, onboarded user.
create or replace function public.is_onboarded() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and branch is not null and batch is not null)
$$;

create policy "subjects read" on public.subjects for select using (true);
create policy "subjects add" on public.subjects for insert with check (public.is_onboarded() and created_by = auth.uid());
create policy "subjects mod" on public.subjects for update using (public.is_mod());

create policy "resources read" on public.resources for select using (not hidden or author_id = auth.uid() or public.is_mod());
create policy "resources add" on public.resources for insert with check (public.is_onboarded() and author_id = auth.uid());
create policy "resources own edit" on public.resources for update using (author_id = auth.uid() or public.is_mod());
create policy "resources own delete" on public.resources for delete using (author_id = auth.uid() or public.is_mod());

create policy "groups read" on public.groups for select using (true);
create policy "groups add" on public.groups for insert with check (public.is_onboarded() and created_by = auth.uid());
create policy "groups edit" on public.groups for update using (created_by = auth.uid() or public.is_mod());

create policy "members read" on public.group_members for select using (true);
create policy "join" on public.group_members for insert with check (
  user_id = auth.uid() and role = 'member' and public.is_onboarded() and
  (not (select verified_only from public.groups g where g.id = group_id)
   or (select verified from public.profiles p where p.id = auth.uid())));
create policy "leave" on public.group_members for delete using (user_id = auth.uid() or public.is_mod());

create policy "posts read" on public.posts for select using (not hidden or author_id = auth.uid() or public.is_mod());
create policy "posts add" on public.posts for insert with check (
  author_id = auth.uid() and public.is_onboarded() and
  (group_id is null or exists (select 1 from public.group_members m where m.group_id = posts.group_id and m.user_id = auth.uid())));
create policy "posts edit" on public.posts for update using (author_id = auth.uid() or public.is_mod());
create policy "posts delete" on public.posts for delete using (author_id = auth.uid() or public.is_mod());

create policy "comments read" on public.comments for select using (not hidden or author_id = auth.uid() or public.is_mod());
create policy "comments add" on public.comments for insert with check (author_id = auth.uid() and public.is_onboarded());
create policy "comments edit" on public.comments for update using (author_id = auth.uid() or public.is_mod());
create policy "comments delete" on public.comments for delete using (author_id = auth.uid() or public.is_mod());

create policy "votes own" on public.votes for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_onboarded());
create policy "follows read" on public.follows for select using (true);
create policy "follows own" on public.follows for insert with check (follower_id = auth.uid());
create policy "unfollow" on public.follows for delete using (follower_id = auth.uid());

create policy "reports add" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports mod read" on public.reports for select using (public.is_mod() or reporter_id = auth.uid());
create policy "reports mod edit" on public.reports for update using (public.is_mod());
create policy "mod log read" on public.mod_actions for select using (public.is_mod());

-- Anonymous items: author_id is hidden from other users through these views.
-- Views are granted to anon and authenticated by Supabase defaults.
-- The app reads posts, comments and resources through the views, never the base tables.
create or replace view public.v_posts as
select p.id, p.group_id, p.title, p.body, p.resource_id, p.score, p.comment_count, p.hidden, p.created_at, p.anonymous,
       case when p.anonymous and p.author_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then null else p.author_id end as author_id,
       case when p.anonymous then 'anonymous' else a.handle end as author_handle,
       case when p.anonymous then null else a.branch end as author_branch,
       case when p.anonymous then null else a.batch end as author_batch,
       a.verified as author_verified,
       (p.author_id = auth.uid()) as is_mine
from public.posts p join public.profiles a on a.id = p.author_id
where not p.hidden or p.author_id = auth.uid() or public.is_mod();

create or replace view public.v_comments as
select c.id, c.post_id, c.parent_id, c.body, c.score, c.hidden, c.created_at, c.anonymous,
       case when c.anonymous and c.author_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then null else c.author_id end as author_id,
       case when c.anonymous then 'anonymous' else a.handle end as author_handle,
       case when c.anonymous then null else a.branch end as author_branch,
       case when c.anonymous then null else a.batch end as author_batch,
       a.verified as author_verified,
       (c.author_id = auth.uid()) as is_mine
from public.comments c join public.profiles a on a.id = c.author_id
where not c.hidden or c.author_id = auth.uid() or public.is_mod();

create or replace view public.v_resources as
select r.id, r.subject_id, r.kind, r.title, r.description, r.file_path, r.url, r.year, r.score, r.hidden, r.created_at, r.anonymous,
       case when r.anonymous and r.author_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then null else r.author_id end as author_id,
       case when r.anonymous then 'anonymous' else a.handle end as author_handle,
       case when r.anonymous then null else a.branch end as author_branch,
       case when r.anonymous then null else a.batch end as author_batch,
       a.verified as author_verified,
       (r.author_id = auth.uid()) as is_mine
from public.resources r join public.profiles a on a.id = r.author_id
where not r.hidden or r.author_id = auth.uid() or public.is_mod();

-- The views run as their owner and repeat the "hidden" rule from RLS themselves. On the base
-- tables, author_id is closed to normal users, so an anonymous author cannot be read directly.
-- App rule: never select or filter on author_id from posts, comments or resources; use the views.
-- A column revoke does not beat a table-wide grant, so drop the table grant and list the columns.
revoke select on public.posts, public.comments, public.resources from anon, authenticated;
grant select (id, group_id, anonymous, title, body, resource_id, score, comment_count, hidden, created_at)
  on public.posts to anon, authenticated;
grant select (id, post_id, parent_id, anonymous, body, score, hidden, created_at)
  on public.comments to anon, authenticated;
grant select (id, subject_id, kind, title, description, file_path, url, year, anonymous, score, hidden, created_at)
  on public.resources to anon, authenticated;

-- ---------- admin reveal (logged) ----------
create or replace function public.reveal_author(p_type text, p_id bigint, p_note text)
returns table (email text, handle text) language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_note is null or char_length(p_note) < 10 then raise exception 'give a reason (10+ chars)'; end if;
  if p_type = 'post' then select author_id into uid from posts where id = p_id;
  elsif p_type = 'comment' then select author_id into uid from comments where id = p_id;
  elsif p_type = 'resource' then select author_id into uid from resources where id = p_id;
  else raise exception 'bad type'; end if;
  insert into mod_actions (actor_id, action, target_type, target_id, note)
  values (auth.uid(), 'reveal_author', p_type, p_id::text, p_note);
  return query select u.email::text, pr.handle from auth.users u join profiles pr on pr.id = u.id where u.id = uid;
end $$;

-- Mods hide or restore an item; every action is logged.
create or replace function public.moderate(p_type text, p_id bigint, p_hide boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  if p_type = 'post' then update posts set hidden = p_hide where id = p_id;
  elsif p_type = 'comment' then update comments set hidden = p_hide where id = p_id;
  elsif p_type = 'resource' then update resources set hidden = p_hide where id = p_id;
  else raise exception 'bad type'; end if;
  update reports set status = 'actioned' where target_type = p_type and target_id = p_id::text and status = 'open';
  insert into mod_actions (actor_id, action, target_type, target_id, note)
  values (auth.uid(), case when p_hide then 'hide' else 'restore' end, p_type, p_id::text, p_note);
end $$;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library', 'library', true, 26214400,
        array['application/pdf','image/png','image/jpeg','image/webp',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/zip','text/plain'])
on conflict (id) do nothing;

create policy "library upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text and public.is_onboarded());
create policy "library own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'library' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_mod()));

-- ---------- seed groups ----------
insert into public.groups (slug, name, description, kind) values
  ('placecom', 'Placecom', 'Placements and internships. Ask anything, anonymously if you want.', 'placecom'),
  ('general', 'General', 'Anything SGSITS.', 'custom');
insert into public.groups (slug, name, kind, branch)
select lower(b), b || ' (all batches)', 'branch', b
from unnest(array['CSE','IT','ECE','EI','EE','Mech','Civil','IP','BME']) as b;
