"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getCollege } from "@/lib/college";
import { getViewer } from "@/lib/viewer";
import { isAdminHere, isModHere } from "@/components/social/college";

type ItemType = "post" | "comment" | "resource";
const ITEM_TYPES: ItemType[] = ["post", "comment", "resource"];

async function modClient() {
  if (!hasSupabase) return null;
  const [v, college] = await Promise.all([getViewer(), getCollege()]);
  if (!isModHere(v, college)) return null;
  return createClient(); // the SQL functions re-check the item's college
}

/** Hide or restore a post, comment or resource. The moderate() function logs it and closes open reports. */
export async function moderateItem(type: string, id: number, hide: boolean, note: string): Promise<{ error?: string }> {
  const supabase = await modClient();
  if (!supabase) return { error: "Mods only." };
  if (!ITEM_TYPES.includes(type as ItemType) || !Number.isInteger(id)) return { error: "Bad target." };
  const { error } = await supabase.rpc("moderate", { p_type: type, p_id: id, p_hide: hide, p_note: note.trim() || null });
  revalidatePath("/mod");
  return error ? { error: error.message } : {};
}

/** Close the open reports on a target without acting on it. Logged by dismiss_reports(). */
export async function dismissItem(type: string, id: string, note: string): Promise<{ error?: string }> {
  const supabase = await modClient();
  if (!supabase) return { error: "Mods only." };
  const { error } = await supabase.rpc("dismiss_reports", { p_type: type, p_id: id, p_note: note.trim() || null });
  revalidatePath("/mod");
  return error ? { error: error.message } : {};
}

/** Admins only. Returns the author's email and handle; reveal_author() writes the log entry. */
export async function revealAuthor(type: string, id: number, reason: string): Promise<{ email?: string; handle?: string; error?: string }> {
  if (!hasSupabase) return { error: "Backend not configured." };
  const [v, college] = await Promise.all([getViewer(), getCollege()]);
  if (!isAdminHere(v, college)) return { error: "Admins only." };
  if (reason.trim().length < 10) return { error: "Give a reason of at least 10 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_author", { p_type: type, p_id: id, p_note: reason.trim() });
  revalidatePath("/mod");
  if (error) return { error: error.message };
  const row = (data as { email: string; handle: string }[] | null)?.[0];
  return row ? { email: row.email, handle: row.handle } : { error: "Author not found (account deleted?)." };
}
