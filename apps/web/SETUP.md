# GS27: going live

Steps for Atishay. About 20 minutes. Dashboard paths marked (docs) were checked against the Supabase
docs on 15 Oct 2026; ones marked (unverified) were not, so the label on screen may differ.

## 1. Supabase project

1. Sign in at supabase.com with the Atishyy27 GitHub account and create a new project on the free plan.
   Name it `gs27`, region Mumbai (ap-south-1), and save the database password somewhere safe.
2. Open SQL Editor and run every file in `supabase/migrations/` in number order (0001 first), one at a
   time, pasting the whole file and pressing Run. Each must finish with "Success. No rows returned".
3. Settings > API Keys (docs): copy the Project URL and the **publishable** key (`sb_publishable_...`).
   If the project only shows legacy keys, the `anon` key works the same. Never use the secret or
   `service_role` key anywhere in this app.

## 2. Google sign-in

1. Google Cloud console > Google Auth Platform > Clients (docs) > Create client, type **Web application**.
2. Authorised JavaScript origins: `http://localhost:3027` and, after step 4, the Vercel URL.
3. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. The exact value is
   shown in Supabase under Authentication > Sign In / Providers > Google (docs).
4. Copy the Client ID and Client Secret into that Supabase Google provider page and enable it.
5. If Google asks for a consent screen, set it to External with app name GS27 (unverified wording).
   Personal Google accounts and @sgsits.ac.in accounts both need to sign in, so do not restrict it
   to one domain.

## 3. Supabase auth settings

1. Authentication > URL Configuration (docs): Site URL `http://localhost:3027` for now (switch to the
   Vercel URL once deployed). Redirect URLs: `http://localhost:3027/**` and `https://<vercel-url>/**`.
2. Authentication > Sign In / Providers: turn on **Allow manual linking** (docs; exact toggle position
   unverified). Without it, "Link college account" on /me fails, so nobody can verify later.

## 4. Run it locally

Create `apps/web/.env.local` (git-ignored) with:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<publishable or anon key>
```

Then from `apps/web`: `pnpm install` and `pnpm dev -p 3027`, open http://localhost:3027 and sign in.

## 5. Make yourself admin

Sign in once, note your handle on /me, then run in the SQL Editor:

```sql
update public.profiles set role = 'admin' where handle = 'your_handle_here';
```

Moderators (hide, restore, dismiss; no author reveal) the same way with `role = 'mod'`. To remove a
role, set it back to `'user'`. Roles cannot be changed from the site on purpose: users have no
write access to that column.

## 6. Deploy on Vercel

1. vercel.com > Add New > Project > import `Atishyy27/GS27`, branch `revamp` until it is merged.
2. Root Directory: `apps/web`. Framework preset: Next.js (detected).
3. Environment variables: the same two from step 4.
4. Deploy, then add the Vercel URL to Google (step 2.2) and Supabase (step 3.1).

## What admins and mods can see

- Mods: the report queue and log at /mod, hidden items, and the reporter's reasons. Not who wrote
  anything anonymous.
- Admins: also "Reveal author" on a reported item. It needs a reason of 10+ characters, shows the
  email and handle once, and writes a `reveal_author` row to the mod log that every mod can read.
