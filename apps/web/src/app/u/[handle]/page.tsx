import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import ActionButton from "@/components/social/ActionButton";
import { follow, unfollow } from "@/components/social/actions";
import { collegeCtx } from "@/components/social/college";
import { db } from "@/components/social/data";
import { BackendMissing } from "@/components/social/Notice";
import PostList from "@/components/social/PostList";
import { PAGE_SIZE, POST_COLS, type PostRow } from "@/components/social/types";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)} · GS27` };
}

export default async function UserPage({ params, searchParams }: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const handle = decodeURIComponent((await params).handle);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await db();
  if (!supabase) {
    return <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20"><BackendMissing /></main>;
  }
  const { data: prof } = await supabase.from("profiles").select("id, handle, branch, batch, verified, bio, created_at, college_id")
    .eq("handle", handle).maybeSingle();
  if (!prof) notFound();

  const v = await getViewer();
  const ctx = await collegeCtx(v);
  const collegeName = prof.college_id ? ctx.names.get(prof.college_id) ?? null : null;
  const isMe = v?.userId === prof.id;
  const [followers, following, amFollowing, postsRes] = await Promise.all([
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("followee_id", prof.id),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", prof.id),
    v && !isMe
      ? supabase.from("follows").select("followee_id").match({ follower_id: v.userId, followee_id: prof.id }).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("v_posts").select(POST_COLS).eq("author_id", prof.id).eq("anonymous", false)
      .order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  ]);
  const rows = (postsRes.data ?? []) as PostRow[];
  const posts = rows.slice(0, PAGE_SIZE);
  const joined = new Date(prof.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20">
      <header className="rounded-2xl border border-white/10 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-all text-2xl font-extrabold">@{prof.handle}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge verified={prof.verified} branch={prof.branch} batch={prof.batch} />
              {collegeName && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-dim">{collegeName}</span>}
            </div>
          </div>
          {v && !isMe && (amFollowing.data ? (
            <ActionButton run={unfollow.bind(null, prof.id)} className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-dim hover:border-white/50">
              Following
            </ActionButton>
          ) : (
            <ActionButton run={follow.bind(null, prof.id)} className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-bg">
              Follow
            </ActionButton>
          ))}
        </div>
        {prof.bio && <p className="mt-3 whitespace-pre-wrap text-sm text-fg/90">{prof.bio}</p>}
        <p className="mt-3 text-sm text-dim">
          <b className="text-fg">{followers.count ?? 0}</b> followers · <b className="text-fg">{following.count ?? 0}</b> following · joined {joined}
        </p>
      </header>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-dim">Posts</h2>
      <p className="mt-1 text-xs text-faint">Anonymous posts never show up here.</p>
      <div className="mt-3">
        <PostList posts={posts} signedIn={Boolean(v)} empty="No public posts yet."
          moreHref={rows.length > PAGE_SIZE ? `/u/${encodeURIComponent(prof.handle)}?page=${page + 1}` : null} />
      </div>
    </main>
  );
}
