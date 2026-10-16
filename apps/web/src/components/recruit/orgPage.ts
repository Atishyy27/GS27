import { notFound, redirect } from "next/navigation";
import { hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { memberOrg } from "./data";

/** Resolve /recruit/o/[id]: signed in, and a member of that org, else 404 (do not reveal it exists). */
export async function requireOrg(idParam: string, path: string) {
  if (!hasSupabase) redirect("/recruit");
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`);
  const org = await memberOrg(id);
  if (!org) notFound();
  return org;
}
