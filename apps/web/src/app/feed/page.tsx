import Link from "next/link";
import Composer from "@/components/social/Composer";
import { daysAgoIso, db, myGroupIds } from "@/components/social/data";
import { BackendMissing, SignInPrompt } from "@/components/social/Notice";
import PostList from "@/components/social/PostList";
import { PAGE_SIZE, POST_COLS, type PostRow } from "@/components/social/types";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Feed · GS27" };

const TABS = [
  { key: "latest", label: "Latest" },
  { key: "following", label: "Following" },
  { key: "groups", label: "My groups" },
  { key: "top", label: "Top this week" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function Feed({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "latest";
  const page = Math.max(1, Number(sp.page) || 1);
  const v = await getViewer();
  const onboarded = Boolean(v?.profile?.branch && v.profile.batch);
  const supabase = await db();

  let posts: PostRow[] = [];
  let note: string | null = null;
  if (supabase) {
    const to = page * PAGE_SIZE; // fetch one extra to know if there is more
    let q = supabase.from("v_posts").select(POST_COLS);
    if (tab === "following") {
      if (!v) note = "Sign in to see posts from handles you follow.";
      else {
        const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", v.userId);
        const ids = (data ?? []).map((r) => r.followee_id as string);
        if (ids.length === 0) note = "You do not follow anyone yet. Open a handle and tap Follow.";
        else q = q.in("author_id", ids);
      }
    } else if (tab === "groups") {
      if (!v) note = "Sign in to see posts from your groups.";
      else {
        const ids = [...(await myGroupIds(supabase, v.userId))];
        if (ids.length === 0) note = "You have not joined any group yet.";
        else q = q.in("group_id", ids);
      }
    } else if (tab === "top") {
      q = q.gte("created_at", daysAgoIso(7));
    }
    if (!note) {
      q = tab === "top" ? q.order("score", { ascending: false }).order("created_at", { ascending: false }) : q.order("created_at", { ascending: false });
      const { data } = await q.range((page - 1) * PAGE_SIZE, to);
      posts = (data ?? []) as PostRow[];
    }
  }
  const hasMore = posts.length > PAGE_SIZE;
  posts = posts.slice(0, PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20">
      <h1 className="text-2xl font-extrabold">Feed</h1>
      <div className="mt-4">
        {!supabase ? <BackendMissing /> : !v ? <SignInPrompt next="/feed" /> : !onboarded ? <SignInPrompt next="/feed" onboard /> : <Composer />}
      </div>
      <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-2 text-sm">
        {TABS.map((t) => (
          <Link key={t.key} href={`/feed?tab=${t.key}`}
            className={`whitespace-nowrap rounded-full px-3 py-1 ${t.key === tab ? "bg-white/10 font-semibold text-fg" : "text-dim hover:text-fg"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        {supabase && (
          <PostList posts={posts} signedIn={Boolean(v)} empty={note ?? "Nothing here yet. Be the first to post."}
            moreHref={hasMore ? `/feed?tab=${tab}&page=${page + 1}` : null} />
        )}
      </div>
    </main>
  );
}
