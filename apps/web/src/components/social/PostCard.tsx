import Link from "next/link";
import { Handle } from "@/components/Badge";
import ReportButton from "@/components/shared/ReportButton";
import VoteButtons from "@/components/shared/VoteButtons";
import { ago } from "@/lib/time";
import type { GroupChip, PostRow } from "./types";

type Props = { post: PostRow; group?: GroupChip; myVote?: -1 | 1; signedIn: boolean; full?: boolean; from?: string | null };

export default function PostCard({ post, group, myVote, signedIn, full, from }: Props) {
  const author = post.author_handle;
  const handle = <Handle handle={author} verified={post.author_verified} branch={post.author_branch} batch={post.author_batch} />;
  return (
    <article className="rounded-2xl border border-white/10 bg-card p-4">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {author === "anonymous" ? handle : <Link href={`/u/${author}`} className="hover:underline">{handle}</Link>}
        <span className="text-faint">· {ago(post.created_at)}</span>
        {group && (
          <Link href={group.href} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-dim hover:text-fg">
            g/{group.slug}
          </Link>
        )}
        {from && <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-dim">from {from}</span>}
        {post.hidden && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">hidden by mods</span>}
      </header>
      <Link href={`/p/${post.id}`} className="mt-2 block">
        {post.title && <h2 className="text-lg font-bold leading-snug">{post.title}</h2>}
        <p className={`mt-1 whitespace-pre-wrap break-words text-fg/90 ${full ? "" : "line-clamp-6"}`}>{post.body}</p>
      </Link>
      <footer className="mt-3 flex items-center gap-5">
        <VoteButtons targetType="post" targetId={post.id} score={post.score} myVote={myVote ?? 0} signedIn={signedIn} />
        <Link href={`/p/${post.id}`} className="text-sm text-dim hover:text-fg">
          {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
        </Link>
        <span className="ml-auto"><ReportButton targetType="post" targetId={post.id} signedIn={signedIn} /></span>
      </footer>
    </article>
  );
}
