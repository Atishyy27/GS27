"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { ActionState } from "./types";

// Every write goes through RLS: the database decides who may post, join or delete.
// Inserts never read back author_id (it is not selectable on the base tables).

async function client() {
  if (!hasSupabase) return { supabase: null, userId: null, error: "Backend not configured yet." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null, error: "Sign in first." };
  return { supabase, userId: data.user.id, error: null };
}

const refresh = () => revalidatePath("/", "layout");

export async function createPost(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const body = String(form.get("body") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const groupId = form.get("group_id") ? Number(form.get("group_id")) : null;
  if (!body) return { error: "Write something first." };
  if (body.length > 5000) return { error: "Keep it under 5000 characters." };
  if (title.length > 200) return { error: "Title is too long (200 max)." };
  const { error: e } = await supabase.from("posts").insert({
    body, title: title || null, group_id: groupId, anonymous: form.get("anonymous") === "on",
  });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function createComment(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const body = String(form.get("body") ?? "").trim();
  const postId = Number(form.get("post_id"));
  const parentId = form.get("parent_id") ? Number(form.get("parent_id")) : null;
  if (!body) return { error: "Write something first." };
  if (body.length > 3000) return { error: "Keep it under 3000 characters." };
  const { error: e } = await supabase.from("comments").insert({
    post_id: postId, parent_id: parentId, body, anonymous: form.get("anonymous") === "on",
  });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function deletePost(postId: number): Promise<ActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("posts").delete().eq("id", postId);
  if (e) return { error: e.message };
  refresh();
  redirect("/feed");
}

export async function deleteComment(commentId: number): Promise<ActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("comments").delete().eq("id", commentId);
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function joinGroup(groupId: number): Promise<ActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("group_members").insert({ group_id: groupId, user_id: userId });
  if (e) {
    if (e.message.includes("row-level security")) return { error: "You cannot join this group yet. Finish onboarding, or verify with your college account for verified-only groups." };
    if (e.message.includes("another college")) return { error: "This group belongs to another college. You can read it, and join groups of your own college." };
    if (e.message.includes("duplicate")) return { ok: true };
    return { error: e.message };
  }
  refresh();
  return { ok: true };
}

export async function leaveGroup(groupId: number): Promise<ActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("group_members").delete().match({ group_id: groupId, user_id: userId });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function createGroup(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const name = String(form.get("name") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const description = String(form.get("description") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { error: "Name must be 2 to 60 characters." };
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return { error: "Link name: 2 to 40 lowercase letters, digits or dashes." };
  if (description.length > 300) return { error: "Description is too long (300 max)." };
  const { data, error: e } = await supabase.from("groups").insert({
    name, slug, description: description || null, kind: "custom", verified_only: form.get("verified_only") === "on",
  }).select("id").single();
  if (e) return { error: e.message.includes("duplicate") ? "That link name is taken." : e.message };
  await supabase.from("group_members").insert({ group_id: data.id, user_id: userId });
  refresh();
  redirect(`/g/${slug}`); // new groups belong to the creator's college, which is the one they post in
}

export async function follow(profileId: string): Promise<ActionState> {
  const { supabase, error } = await client();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("follows").insert({ followee_id: profileId });
  if (e && !e.message.includes("duplicate")) return { error: e.message };
  refresh();
  return { ok: true };
}

export async function unfollow(profileId: string): Promise<ActionState> {
  const { supabase, userId, error } = await client();
  if (!supabase || !userId || error) return { error: error ?? "Sign in first." };
  const { error: e } = await supabase.from("follows").delete().match({ follower_id: userId, followee_id: profileId });
  if (e) return { error: e.message };
  refresh();
  return { ok: true };
}
