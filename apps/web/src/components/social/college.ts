import { getCollege, listColleges, type College } from "@/lib/college";
import type { Viewer } from "@/lib/viewer";

export type CollegeCtx = {
  /** The college this page is about (subdomain, switcher cookie, the viewer's own, or SGSITS). */
  college: College;
  /** college id -> short name and slug, for "from X" chips and cross-college links. */
  names: Map<number, string>;
  slugs: Map<number, string>;
  /** The viewer's own college, or null when signed out or not picked yet. */
  ownId: number | null;
  /** True when a signed-in viewer is looking at a college that is not their own: read only. */
  elsewhere: boolean;
};

export async function collegeCtx(v: Viewer = null): Promise<CollegeCtx> {
  const [college, list] = await Promise.all([getCollege(), listColleges()]);
  const all = list.some((c) => c.id === college.id) ? list : [...list, college];
  const ownId = v?.profile?.college_id ?? null;
  return {
    college,
    names: new Map(all.map((c) => [c.id, c.short_name])),
    slugs: new Map(all.map((c) => [c.id, c.slug])),
    ownId,
    elsewhere: Boolean(v && ownId !== null && ownId !== college.id),
  };
}

/** Link to a group; groups of another college carry ?c=<college slug> since slugs are unique per college. */
export function groupHref(ctx: CollegeCtx, slug: string, collegeId: number | null | undefined) {
  if (collegeId == null || collegeId === ctx.college.id) return `/g/${slug}`;
  const c = ctx.slugs.get(collegeId);
  return c ? `/g/${slug}?c=${encodeURIComponent(c)}` : `/g/${slug}`;
}

/** Short name of another college, or null when the row belongs to the college being viewed. */
export function foreignName(ctx: CollegeCtx, collegeId: number | null | undefined) {
  if (collegeId == null || collegeId === ctx.college.id) return null;
  return ctx.names.get(collegeId) ?? "another college";
}

/** Mod or admin of this college (role is per college), or a platform admin. */
export function isModHere(v: Viewer, college: College) {
  const p = v?.profile;
  if (!p) return false;
  return p.platform_admin || ((p.role === "mod" || p.role === "admin") && p.college_id === college.id);
}

export function isAdminHere(v: Viewer, college: College) {
  const p = v?.profile;
  if (!p) return false;
  return p.platform_admin || (p.role === "admin" && p.college_id === college.id);
}
