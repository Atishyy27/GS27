import { redirect } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  handle: string;
  branch: string | null;
  batch: number | null;
  verified: boolean;
  role: "user" | "mod" | "admin";
  bio: string | null;
};

export type Viewer = { userId: string; email: string | null; profile: Profile | null } | null;

/** The signed-in user and their profile, or null. Never throws when the backend is not configured. */
export async function getViewer(): Promise<Viewer> {
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, handle, branch, batch, verified, role, bio")
    .eq("id", data.user.id).maybeSingle();
  return { userId: data.user.id, email: data.user.email ?? null, profile: (profile as Profile) ?? null };
}

/** For pages that need a signed-in, onboarded user. */
export async function requireOnboarded(next: string) {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!v.profile?.branch || !v.profile?.batch) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return v as NonNullable<Viewer> & { profile: Profile };
}

export const isMod = (v: Viewer) => v?.profile?.role === "mod" || v?.profile?.role === "admin";
