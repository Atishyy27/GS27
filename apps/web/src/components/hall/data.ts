// Row shape of the v_projects view (supabase/migrations/0005_hall.sql).
export type ProjectRow = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  url: string | null;
  repo_url: string | null;
  image_url: string | null;
  tags: string[];
  builders: string;
  batch: number | null;
  branch: string | null;
  status: "pending" | "approved" | "rejected";
  score: number;
  created_at: string;
  is_mine: boolean | null;
};

export type HallState = { ok?: boolean; error?: string; slug?: string } | undefined;

export const PROJECT_COLUMNS =
  "id, slug, name, tagline, description, url, repo_url, image_url, tags, builders, batch, branch, status, score, created_at, is_mine";

/** A stable two-colour gradient per project, for projects without an image. */
export function tileGradient(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = h % 360;
  const b = (a + 40 + (h >> 9) % 80) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 45%), hsl(${b} 75% 30%))`;
}

export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export function parseTags(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,\s]+/).map((t) => slugify(t).slice(0, 24)).filter(Boolean))).slice(0, 6);
}
