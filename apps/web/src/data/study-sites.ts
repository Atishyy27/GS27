// Course study sites built outside GS27, keyed by subject code (an offering's code). Both allowed framing on 25 Nov 2026
// (no X-Frame-Options, no Content-Security-Policy). Set frame: false if an owner ever adds a header: the card then shows only the link.
export type StudySiteInfo = { code: string; title: string; url: string; frame: boolean };

export const STUDY_SITES: StudySiteInfo[] = [
  { code: "ME46018", title: "Automobile Engineering study site", url: "https://me46018-x7k2q.vercel.app", frame: true },
  { code: "ME46020", title: "Finite Element Analysis study site", url: "https://me46020-fea9q.vercel.app", frame: true },
];

/** The first code of the subject that has a study site. */
export function studySiteFor(codes: (string | null | undefined)[]): StudySiteInfo | null {
  for (const raw of codes) {
    const code = raw?.replace(/\s+/g, "").toUpperCase();
    const hit = STUDY_SITES.find((s) => s.code === code);
    if (hit) return hit;
  }
  return null;
}
