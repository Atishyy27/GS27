import Link from "next/link";

/** Full-page notice for the cell console and drives pages when something is missing. */
export default function Gate({ title, children, next }: { title: string; children: React.ReactNode; next?: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">PLACEMENT CELL</p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <div className="mt-4 text-dim">{children}</div>
      {next && (
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-6 inline-block rounded-full bg-accent px-5 py-2 font-bold text-bg">
          Sign in
        </Link>
      )}
    </main>
  );
}

export const NOT_CONFIGURED = "Backend not configured yet (Supabase keys missing), so there is nothing to show.";

export function CellTabs({ active }: { active: "drives" | "members" | "stats" }) {
  const tabs = [
    { key: "drives", href: "/cell", label: "Drives" },
    { key: "members", href: "/cell?tab=members", label: "Members" },
    { key: "stats", href: "/cell/stats", label: "Season stats" },
  ] as const;
  return (
    <div className="mt-6 flex gap-2 border-b border-white/10">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active === t.key ? "border-accent text-fg" : "border-transparent text-dim hover:text-fg"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
