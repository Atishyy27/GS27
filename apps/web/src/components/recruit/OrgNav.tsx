import Link from "next/link";
import type { Org } from "./data";

const TABS = [
  { key: "jobs", label: "Jobs", path: "" },
  { key: "talent", label: "Talent search", path: "/talent" },
  { key: "members", label: "Members", path: "/members" },
  { key: "settings", label: "Settings", path: "/settings" },
] as const;

export default function OrgNav({ org, active }: { org: Org; active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="mb-8">
      <Link href="/recruit" className="text-sm text-dim hover:text-fg">← Recruit</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">{org.name}</h1>
        {org.verified
          ? <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">✓ verified</span>
          : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-dim">awaiting verification: jobs stay in draft</span>}
      </div>
      <nav className="mt-4 flex gap-4 overflow-x-auto border-b border-white/10 text-sm">
        {TABS.map((t) => (
          <Link key={t.key} href={`/recruit/o/${org.id}${t.path}`}
            className={`whitespace-nowrap border-b-2 pb-2 ${active === t.key ? "border-accent text-fg" : "border-transparent text-dim hover:text-fg"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
