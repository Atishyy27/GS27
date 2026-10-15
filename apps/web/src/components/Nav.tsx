import Link from "next/link";
import { getViewer, isMod } from "@/lib/viewer";

const LINKS = [
  { href: "/library", label: "Library" },
  { href: "/feed", label: "Feed" },
  { href: "/g", label: "Groups" },
  { href: "/g/placecom", label: "Placecom" },
];

export default async function Nav() {
  const v = await getViewer();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight">GS<span className="text-accent">27</span></Link>
        <div className="flex flex-1 items-center gap-4 overflow-x-auto text-sm text-dim">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-fg">{l.label}</Link>)}
          {isMod(v) && <Link href="/mod" className="whitespace-nowrap text-accent">Mod</Link>}
        </div>
        {v ? (
          <Link href="/me" className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1 text-sm hover:border-white/40">
            @{v.profile?.handle ?? "me"}
          </Link>
        ) : (
          <Link href="/login" className="whitespace-nowrap rounded-full bg-accent px-3 py-1 text-sm font-bold text-bg">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
