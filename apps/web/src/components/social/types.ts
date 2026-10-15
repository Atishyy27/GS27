// Row shapes of the v_posts and v_comments views (supabase/migrations/0001_init.sql).
export type PostRow = {
  id: number;
  group_id: number | null;
  title: string | null;
  body: string;
  resource_id: number | null;
  score: number;
  comment_count: number;
  hidden: boolean;
  created_at: string;
  anonymous: boolean;
  author_id: string | null;
  author_handle: string;
  author_branch: string | null;
  author_batch: number | null;
  author_verified: boolean | null;
  is_mine: boolean | null;
};

export type CommentRow = {
  id: number;
  post_id: number;
  parent_id: number | null;
  body: string;
  score: number;
  hidden: boolean;
  created_at: string;
  anonymous: boolean;
  author_id: string | null;
  author_handle: string;
  author_branch: string | null;
  author_batch: number | null;
  author_verified: boolean | null;
  is_mine: boolean | null;
};

export type GroupRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  branch: string | null;
  batch: number | null;
  verified_only: boolean;
  created_at: string;
};

export type GroupChip = { slug: string; name: string };

export type ActionState = { error?: string; ok?: boolean } | undefined;

export const POST_COLS =
  "id, group_id, title, body, resource_id, score, comment_count, hidden, created_at, anonymous, author_id, author_handle, author_branch, author_batch, author_verified, is_mine";

export const COMMENT_COLS =
  "id, post_id, parent_id, body, score, hidden, created_at, anonymous, author_id, author_handle, author_branch, author_batch, author_verified, is_mine";

export const PAGE_SIZE = 20;
