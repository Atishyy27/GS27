import Link from "next/link";
import { notFound } from "next/navigation";
import ActionButton from "@/components/social/ActionButton";
import { deletePost } from "@/components/social/actions";
import CommentTree, { CommentForm, type CommentNode } from "@/components/social/CommentTree";
import { db, groupChips, myVotes } from "@/components/social/data";
import { BackendMissing, Empty, SignInPrompt } from "@/components/social/Notice";
import PostCard from "@/components/social/PostCard";
import { COMMENT_COLS, POST_COLS, type CommentRow, type PostRow } from "@/components/social/types";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Post ${id} · GS27` };
}

function buildTree(rows: CommentRow[], votes: Map<number, -1 | 1>): CommentNode[] {
  const byId = new Map<number, CommentNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [], myVote: votes.get(r.id) });
  const roots: CommentNode[] = [];
  for (const n of byId.values()) {
    const parent = n.parent_id !== null ? byId.get(n.parent_id) : undefined;
    (parent ? parent.children : roots).push(n);
  }
  return roots;
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const supabase = await db();
  if (!supabase) {
    return <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20"><BackendMissing /></main>;
  }

  const v = await getViewer();
  const signedIn = Boolean(v);
  const onboarded = Boolean(v?.profile?.branch && v.profile.batch);
  const { data: p } = await supabase.from("v_posts").select(POST_COLS).eq("id", id).maybeSingle();
  if (!p) notFound();
  const post = p as PostRow;

  const { data: c } = await supabase.from("v_comments").select(COMMENT_COLS).eq("post_id", id).order("created_at", { ascending: true });
  const comments = (c ?? []) as CommentRow[];
  const [postVotes, commentVotes, chips] = await Promise.all([
    myVotes(supabase, signedIn, "post", [id]),
    myVotes(supabase, signedIn, "comment", comments.map((x) => x.id)),
    groupChips(supabase, [post.group_id]),
  ]);
  const tree = buildTree(comments, commentVotes);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20">
      <Link href={post.group_id !== null && chips.get(post.group_id) ? `/g/${chips.get(post.group_id)!.slug}` : "/feed"}
        className="text-sm text-dim hover:text-fg">
        ← Back
      </Link>
      <div className="mt-3">
        <PostCard post={post} signedIn={signedIn} myVote={postVotes.get(id)} full
          group={post.group_id !== null ? chips.get(post.group_id) : undefined} />
      </div>
      {post.is_mine && (
        <div className="mt-2 text-right">
          <ActionButton run={deletePost.bind(null, id)} confirm="Delete this post and all its comments?"
            className="text-xs text-faint hover:text-accent">
            delete post
          </ActionButton>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dim">{comments.length} {comments.length === 1 ? "comment" : "comments"}</h2>
        <div className="mt-2">
          {!v ? <SignInPrompt next={`/p/${id}`} /> : !onboarded ? <SignInPrompt next={`/p/${id}`} onboard /> : <CommentForm postId={id} />}
        </div>
        <div className="mt-4">
          {tree.length ? <CommentTree nodes={tree} postId={id} signedIn={signedIn} canWrite={onboarded} /> : <Empty>No comments yet.</Empty>}
        </div>
      </section>
    </main>
  );
}
