import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { GroupChip } from "./types";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Supabase client, or null when the backend is not configured. */
export async function db(): Promise<DB | null> {
  return hasSupabase ? createClient() : null;
}

/** The viewer's own votes on a set of targets, as id -> value. Empty when signed out. */
export async function myVotes(supabase: DB, signedIn: boolean, type: "post" | "comment", ids: number[]) {
  const out = new Map<number, -1 | 1>();
  if (!signedIn || ids.length === 0) return out;
  const { data } = await supabase.from("votes").select("target_id, value").eq("target_type", type).in("target_id", ids);
  for (const r of data ?? []) out.set(Number(r.target_id), r.value as -1 | 1);
  return out;
}

/** Group name and slug for each group id that appears in a list of posts. */
export async function groupChips(supabase: DB, ids: (number | null)[]) {
  const out = new Map<number, GroupChip>();
  const uniq = [...new Set(ids.filter((x): x is number => x !== null))];
  if (uniq.length === 0) return out;
  const { data } = await supabase.from("groups").select("id, slug, name").in("id", uniq);
  for (const g of data ?? []) out.set(g.id, { slug: g.slug, name: g.name });
  return out;
}

/** Group ids the viewer has joined. */
export async function myGroupIds(supabase: DB, userId: string | undefined) {
  if (!userId) return new Set<number>();
  const { data } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => Number(r.group_id)));
}

/** Member count per group id. Fine at college scale; swap for a counter column if it grows. */
export async function memberCounts(supabase: DB) {
  const out = new Map<number, number>();
  const { data } = await supabase.from("group_members").select("group_id");
  for (const r of data ?? []) out.set(Number(r.group_id), (out.get(Number(r.group_id)) ?? 0) + 1);
  return out;
}

/** Reddit-style hot rank. */
export function hot(score: number, createdAt: string, now = Date.now()) {
  const hours = (now - new Date(createdAt).getTime()) / 3_600_000;
  return score / Math.pow(Math.max(0, hours) + 2, 1.5);
}

/** ISO timestamp n days before now. */
export function daysAgoIso(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
