import type { Talent } from "./data";
import { chip } from "./styles";

/** What a verified recruiter sees. Never shows a GS27 handle: there is none on this record. */
export default function TalentCard({ t, college }: { t: Talent; college?: string }) {
  const links = Object.entries(t.links ?? {}).filter(([, v]) => v) as [string, string][];
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold">{t.display_name}</h3>
        <span className="text-xs text-dim">{[college, t.branch, t.batch].filter(Boolean).join(" · ")}</span>
      </div>
      {t.headline && <p className="mt-1 text-sm text-dim">{t.headline}</p>}
      {t.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">{t.skills.map((s) => <span key={s} className={chip}>{s}</span>)}</div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {t.leetcode_handle && (
          <a className="text-accent hover:underline" href={`https://leetcode.com/u/${encodeURIComponent(t.leetcode_handle)}`} target="_blank" rel="noreferrer">LeetCode</a>
        )}
        {t.codeforces_handle && (
          <a className="text-accent hover:underline" href={`https://codeforces.com/profile/${encodeURIComponent(t.codeforces_handle)}`} target="_blank" rel="noreferrer">Codeforces</a>
        )}
        {links.map(([k, v]) => <a key={k} className="capitalize text-accent hover:underline" href={v} target="_blank" rel="noreferrer">{k}</a>)}
        {t.resume_url && <a className="font-semibold text-good hover:underline" href={t.resume_url} target="_blank" rel="noreferrer">Resume</a>}
      </div>
    </div>
  );
}
