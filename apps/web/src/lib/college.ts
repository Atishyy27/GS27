import { cookies, headers } from "next/headers";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export type College = {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  city: string | null;
  state: string | null;
  email_domains: string[];
  branches: string[];
  status: "pending" | "active" | "suspended";
  plan: "free" | "pro" | "enterprise";
};

export const DEFAULT_COLLEGE_SLUG = "sgsits";
export const COLLEGE_COOKIE = "gs27_college";

// Used when the backend is not configured, so pages still render.
export const FALLBACK_COLLEGE: College = {
  id: 1, slug: "sgsits", name: "Shri G. S. Institute of Technology and Science", short_name: "SGSITS",
  city: "Indore", state: "Madhya Pradesh", email_domains: ["sgsits.ac.in"],
  branches: ["CSE", "IT", "ECE", "EI", "EE", "Mech", "Civil", "IP", "BME", "Other"], status: "active", plan: "free",
};

/**
 * The college this request is about. Order: subdomain (sgsits.gs27.app, via the x-gs27-college header set
 * in proxy.ts), then the college cookie (set by the switcher), then the signed-in user's college, then SGSITS.
 * Every college-scoped query filters on the returned id.
 */
export async function getCollege(): Promise<College> {
  if (!hasSupabase) return FALLBACK_COLLEGE;
  const h = await headers();
  const c = await cookies();
  let slug = h.get("x-gs27-college") || c.get(COLLEGE_COOKIE)?.value || null;
  const supabase = await createClient();
  if (!slug) {
    const v = await getViewer();
    const cid = v?.profile?.college_id;
    if (cid) {
      const { data } = await supabase.from("colleges").select("*").eq("id", cid).maybeSingle();
      if (data) return data as College;
    }
    slug = DEFAULT_COLLEGE_SLUG;
  }
  const { data } = await supabase.from("colleges").select("*").eq("slug", slug).maybeSingle();
  return (data as College) ?? FALLBACK_COLLEGE;
}

export async function listColleges(): Promise<College[]> {
  if (!hasSupabase) return [FALLBACK_COLLEGE];
  const supabase = await createClient();
  const { data } = await supabase.from("colleges").select("*").eq("status", "active").order("short_name");
  return (data as College[]) ?? [];
}
