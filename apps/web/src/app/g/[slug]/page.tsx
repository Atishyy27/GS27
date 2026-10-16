import Link from "next/link";
import { notFound } from "next/navigation";
import Composer from "@/components/social/Composer";
import { collegeCtx } from "@/components/social/college";
import { db, hot, myGroupIds } from "@/components/social/data";
import JoinButton from "@/components/social/JoinButton";
import { BackendMissing, SignInPrompt, ViewingElsewhere } from "@/components/social/Notice";
import PostList from "@/components/social/PostList";
import { GROUP_COLS, PAGE_SIZE, POST_COLS, type GroupRow, type PostRow } from "@/components/social/types";
import { getViewer } from "@/lib/viewer";

const SORTS = [
  { key: "hot", label: "Hot" },
  { key: "new", label: "New" },
  { key: "top", label: "Top" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `g/${slug} · GS27` };
}

export default async function GroupPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string; c?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort: Sort = SORTS.some((s) => s.key === sp.sort) ? (sp.sort as Sort) : "hot";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await db();
  if (!supabase) {
    return <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20"><h1 className="mb-4 text-2xl font-extrabold">g/{slug}</h1><BackendMissing /></main>;
  }

  const v = await getViewer();
  const onboarded = Boolean(v?.profile?.branch && v.profile.batch && v.profile.college_id);
  const ctx = await collegeCtx(v);
  // slugs are unique per college: ?c=<college slug> opens a group of another college (read only)
  const cid = sp.c ? [...ctx.slugs.entries()].find(([, s]) => s === sp.c)?.[0] : ctx.college.id;
  if (cid === undefined) notFound();
  const { data: g } = await supabase.from("groups").select(GROUP_COLS).eq("college_id", cid).eq("slug", slug).maybeSingle();
  if (!g) notFound();
  const group = g as GroupRow;
  const foreign = group.college_id !== ctx.college.id ? ctx.names.get(group.college_id) ?? "another college" : null;
  // writing needs the viewer's own college; the DB refuses everything else anyway
  const readOnly = Boolean(v && v.profile?.college_id !== group.college_id);
  const qs = sp.c ? `c=${encodeURIComponent(sp.c)}&` : "";
  const path = `/g/${slug}${sp.c ? `?c=${encodeURIComponent(sp.c)}` : ""}`;

  const [{ count }, mine] = await Promise.all([
    supabase.from("group_members").select("group_id", { count: "exact", head: true }).eq("group_id", group.id),
    myGroupIds(supabase, v?.userId),
  ]);
  const joined = mine.has(group.id);

  let posts: PostRow[];
  let hasMore = false;
  const base = () => supabase.from("v_posts").select(POST_COLS).eq("group_id", group.id);
  if (sort === "hot") {
    const { data } = await base().order("created_at", { ascending: false }).limit(200);
    const all = ((data ?? []) as PostRow[]).sort((a, b) => hot(b.score, b.created_at) - hot(a.score, a.created_at));
    posts = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    hasMore = all.length > page * PAGE_SIZE;
  } else {
    const q = sort === "top"
      ? base().order("score", { ascending: false }).order("created_at", { ascending: false })
      : base().order("created_at", { ascending: false });
    const { data } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const rows = (data ?? []) as PostRow[];
    hasMore = rows.length > PAGE_SIZE;
    posts = rows.slice(0, PAGE_SIZE);
  }

  const blockedByVerify = group.verified_only && v?.profile && !v.profile.verified && !readOnly;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20">
      <header className="rounded-2xl border border-white/10 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-faint">g/{group.slug}{foreign && <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-dim">from {foreign}</span>}</p>
            <h1 className="text-2xl font-extrabold">{group.name}</h1>
          </div>
          {!blockedByVerify && !readOnly && <JoinButton groupId={group.id} joined={joined} signedIn={Boolean(v)} next={path} />}
        </div>
        {group.description && <p className="mt-2 text-sm text-dim">{group.description}</p>}
        <p className="mt-2 text-xs text-faint">
          {count ?? 0} members{group.verified_only ? " · verified only" : ""}
        </p>
        {blockedByVerify && (
          <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-dim">
            Only accounts verified with a {ctx.names.get(group.college_id) ?? "college"} email can join this group. You can still read it.{" "}
            <Link href="/me" className="font-semibold text-accent hover:underline">Verify your account</Link>
          </p>
        )}
      </header>

      <div className="mt-4">
        {!v ? <SignInPrompt next={path} /> : !onboarded ? <SignInPrompt next={path} onboard /> : readOnly ? (
          <ViewingElsewhere name={foreign ?? ctx.college.short_name} />
        ) : joined ? (
          <Composer groupId={group.id} withTitle placeholder={`Post to g/${group.slug}`} />
        ) : !blockedByVerify ? (
          <p className="rounded-2xl border border-white/10 bg-card p-4 text-sm text-dim">Join this group to post in it.</p>
        ) : null}
      </div>

      <nav className="mt-6 flex gap-2 border-b border-white/10 pb-2 text-sm">
        {SORTS.map((s) => (
          <Link key={s.key} href={`/g/${slug}?${qs}sort=${s.key}`}
            className={`rounded-full px-3 py-1 ${s.key === sort ? "bg-white/10 font-semibold text-fg" : "text-dim hover:text-fg"}`}>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        <PostList posts={posts} signedIn={Boolean(v)} showGroup={false} empty="No posts here yet."
          moreHref={hasMore ? `/g/${slug}?${qs}sort=${sort}&page=${page + 1}` : null} />
      </div>
    </main>
  );
}
