import Link from "next/link";
import Badge from "@/components/Badge";
import GoogleButton from "@/components/GoogleButton";
import { BATCH_OPTIONS, BRANCH_OPTIONS } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { ago } from "@/lib/time";
import { requireOnboarded } from "@/lib/viewer";
import { deleteMine, saveProfile } from "./actions";

export const metadata = { title: "Me · GS27" };

type MyPost = { id: number; title: string | null; body: string; anonymous: boolean; hidden: boolean; score: number; comment_count: number; created_at: string };
type MyComment = { id: number; post_id: number; body: string; anonymous: boolean; hidden: boolean; score: number; created_at: string };

export default async function Me() {
  const v = await requireOnboarded("/me");
  const p = v.profile;
  const supabase = await createClient();
  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase.from("v_posts").select("id, title, body, anonymous, hidden, score, comment_count, created_at")
      .eq("is_mine", true).order("created_at", { ascending: false }).limit(50),
    supabase.from("v_comments").select("id, post_id, body, anonymous, hidden, score, created_at")
      .eq("is_mine", true).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">YOU</p>
      <h1 className="mt-2 break-all text-3xl font-extrabold">@{p.handle}</h1>
      <div className="mt-2"><Badge verified={p.verified} branch={p.branch} batch={p.batch} /></div>
      {p.role !== "user" && <p className="mt-2 text-xs text-accent">Role: {p.role}. <Link href="/mod" className="underline">Open mod tools</Link></p>}

      {!p.verified && (
        <section className="mt-8 rounded-2xl border border-good/30 bg-good/5 p-5">
          <h2 className="font-bold">Verify with your @sgsits.ac.in account</h2>
          <p className="mt-2 text-sm text-dim">
            Link your college Google account once and you get the ✓ SGSITS badge, plus entry to verified-only groups.
            Your college email is never shown to anyone. Your handle stays the same.
          </p>
          <div className="mt-4 max-w-sm">
            <GoogleButton link college next="/me">Link college account</GoogleButton>
          </div>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-card p-5">
        <h2 className="font-bold">Profile</h2>
        <form action={saveProfile} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-dim">Branch
              <select name="branch" defaultValue={p.branch ?? ""} required className="rounded-xl border border-white/15 bg-bg px-3 py-3 text-base text-fg">
                {BRANCH_OPTIONS.map((b) => <option key={b.code} value={b.code}>{b.code} · {b.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-dim">Batch
              <select name="batch" defaultValue={p.batch ?? ""} required className="rounded-xl border border-white/15 bg-bg px-3 py-3 text-base text-fg">
                {BATCH_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm text-dim">Bio (160 characters, optional)
            <textarea name="bio" defaultValue={p.bio ?? ""} maxLength={160} rows={2} className="rounded-xl border border-white/15 bg-bg px-3 py-2 text-base text-fg" />
          </label>
          <button className="self-start rounded-xl bg-accent px-4 py-2 font-bold text-bg">Save</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-bold">My posts <span className="text-sm font-normal text-faint">({posts?.length ?? 0})</span></h2>
        <p className="mt-1 text-xs text-faint">Includes your anonymous posts. Only you can see they are yours.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {(posts as MyPost[] | null ?? []).map((x) => (
            <li key={x.id} className="rounded-xl border border-white/10 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/p/${x.id}`} className="min-w-0 flex-1 hover:text-accent">
                  {x.title && <p className="font-semibold">{x.title}</p>}
                  <p className="line-clamp-2 text-sm text-dim">{x.body}</p>
                </Link>
                <DeleteButton kind="post" id={x.id} />
              </div>
              <Meta anonymous={x.anonymous} hidden={x.hidden} score={x.score} created={x.created_at} extra={`${x.comment_count} comments`} />
            </li>
          ))}
          {!posts?.length && <li className="text-sm text-faint">Nothing yet.</li>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-bold">My comments <span className="text-sm font-normal text-faint">({comments?.length ?? 0})</span></h2>
        <ul className="mt-3 flex flex-col gap-2">
          {(comments as MyComment[] | null ?? []).map((x) => (
            <li key={x.id} className="rounded-xl border border-white/10 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/p/${x.post_id}`} className="line-clamp-2 min-w-0 flex-1 text-sm text-dim hover:text-accent">{x.body}</Link>
                <DeleteButton kind="comment" id={x.id} />
              </div>
              <Meta anonymous={x.anonymous} hidden={x.hidden} score={x.score} created={x.created_at} />
            </li>
          ))}
          {!comments?.length && <li className="text-sm text-faint">Nothing yet.</li>}
        </ul>
      </section>

      <form action="/auth/signout" method="post" className="mt-10">
        <button className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:border-accent hover:text-accent">Sign out</button>
      </form>
    </main>
  );
}

function DeleteButton({ kind, id }: { kind: "post" | "comment"; id: number }) {
  return (
    <form action={deleteMine}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-faint hover:text-accent">delete</button>
    </form>
  );
}

function Meta({ anonymous, hidden, score, created, extra }: { anonymous: boolean; hidden: boolean; score: number; created: string; extra?: string }) {
  return (
    <p className="mt-2 flex flex-wrap gap-3 text-xs text-faint">
      <span>{ago(created)}</span>
      <span>{score} points</span>
      {extra && <span>{extra}</span>}
      {anonymous && <span className="italic">posted anonymously</span>}
      {hidden && <span className="text-accent">hidden by a moderator</span>}
    </p>
  );
}
