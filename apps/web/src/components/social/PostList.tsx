import Link from "next/link";
import { collegeCtx, foreignName } from "./college";
import { db, groupChips, myVotes } from "./data";
import PostCard from "./PostCard";
import { Empty } from "./Notice";
import type { PostRow } from "./types";

type Props = { posts: PostRow[]; signedIn: boolean; empty: string; moreHref?: string | null; showGroup?: boolean };

/** Renders a list of posts with the viewer's votes and group chips filled in. */
export default async function PostList({ posts, signedIn, empty, moreHref, showGroup = true }: Props) {
  if (posts.length === 0) return <Empty>{empty}</Empty>;
  const supabase = await db();
  const ids = posts.map((p) => p.id);
  const ctx = await collegeCtx();
  const [votes, chips] = supabase
    ? await Promise.all([myVotes(supabase, signedIn, "post", ids), showGroup ? groupChips(supabase, posts.map((p) => p.group_id), ctx) : Promise.resolve(new Map())])
    : [new Map(), new Map()];
  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} signedIn={signedIn} myVote={votes.get(p.id)}
          group={p.group_id !== null ? chips.get(p.group_id) : undefined} from={foreignName(ctx, p.college_id)} />
      ))}
      {moreHref && (
        <Link href={moreHref} className="mx-auto rounded-full border border-white/15 px-4 py-2 text-sm text-dim hover:text-fg">
          Load more
        </Link>
      )}
    </div>
  );
}
