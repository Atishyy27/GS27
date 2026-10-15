"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Handle } from "@/components/Badge";
import ReportButton from "@/components/shared/ReportButton";
import VoteButtons from "@/components/shared/VoteButtons";
import { ago } from "@/lib/time";
import ActionButton from "./ActionButton";
import { createComment, deleteComment } from "./actions";
import type { ActionState, CommentRow } from "./types";

export type CommentNode = CommentRow & { children: CommentNode[]; myVote?: -1 | 1 };

type Ctx = { postId: number; signedIn: boolean; canWrite: boolean };

export function CommentForm({ postId, parentId, onDone, autoFocus }: { postId: number; parentId?: number; onDone?: () => void; autoFocus?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createComment, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) { form.current?.reset(); onDone?.(); }
  }, [state, onDone]);
  return (
    <form ref={form} action={action} className="mt-2 rounded-xl border border-white/10 bg-bg/60 p-3">
      <input type="hidden" name="post_id" value={postId} />
      {parentId !== undefined && <input type="hidden" name="parent_id" value={parentId} />}
      <textarea name="body" required maxLength={3000} rows={parentId ? 2 : 3} autoFocus={autoFocus}
        placeholder={parentId ? "Reply" : "Add a comment"}
        className="w-full resize-y bg-transparent outline-none placeholder:text-faint" />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-dim">
          <input type="checkbox" name="anonymous" className="accent-[#ff5a36]" /> Anonymous
        </label>
        <button disabled={pending} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-bg disabled:opacity-50">
          {pending ? "Sending..." : parentId ? "Reply" : "Comment"}
        </button>
      </div>
      {state?.error && <p className="mt-1 text-xs text-accent">{state.error}</p>}
    </form>
  );
}

function Comment({ c, ctx, depth }: { c: CommentNode; ctx: Ctx; depth: number }) {
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const author = c.author_handle;
  const handle = <Handle handle={author} verified={c.author_verified} branch={c.author_branch} batch={c.author_batch} />;
  return (
    <li className={depth > 0 ? "border-l border-white/10 pl-3 sm:pl-4" : ""}>
      <div className="py-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <button onClick={() => setCollapsed(!collapsed)} className="text-faint hover:text-fg" aria-label={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? "[+]" : "[-]"}
          </button>
          {author === "anonymous" ? handle : <Link href={`/u/${author}`} className="hover:underline">{handle}</Link>}
          <span className="text-faint">· {ago(c.created_at)}</span>
          {c.hidden && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">hidden by mods</span>}
        </div>
        {!collapsed && (
          <>
            <p className="mt-1 whitespace-pre-wrap break-words text-fg/90">{c.body}</p>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <VoteButtons targetType="comment" targetId={c.id} score={c.score} myVote={c.myVote ?? 0} signedIn={ctx.signedIn} />
              {ctx.canWrite && <button onClick={() => setReplying(!replying)} className="text-xs text-dim hover:text-fg">reply</button>}
              {c.is_mine && (
                <ActionButton run={() => deleteComment(c.id)} confirm="Delete this comment?" className="text-xs text-faint hover:text-accent">
                  delete
                </ActionButton>
              )}
              <ReportButton targetType="comment" targetId={c.id} signedIn={ctx.signedIn} />
            </div>
            {replying && <CommentForm postId={ctx.postId} parentId={c.id} onDone={() => setReplying(false)} autoFocus />}
          </>
        )}
      </div>
      {!collapsed && c.children.length > 0 && (
        <ul>{c.children.map((k) => <Comment key={k.id} c={k} ctx={ctx} depth={depth + 1} />)}</ul>
      )}
    </li>
  );
}

export default function CommentTree({ nodes, postId, signedIn, canWrite }: { nodes: CommentNode[] } & Ctx) {
  const ctx = { postId, signedIn, canWrite };
  return <ul className="mt-2">{nodes.map((c) => <Comment key={c.id} c={c} ctx={ctx} depth={0} />)}</ul>;
}
