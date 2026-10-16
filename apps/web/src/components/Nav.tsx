import Link from "next/link";
import { cookies } from "next/headers";
import CollegeSwitcher from "@/components/CollegeSwitcher";
import TnpEgg from "@/components/TnpEgg";
import { isModHere } from "@/components/social/college";
import { getCollege, listColleges } from "@/lib/college";
import { TNP_COOKIE } from "@/lib/tnp";
import { getViewer } from "@/lib/viewer";

const LINKS = [
  { href: "/library", label: "Library" },
  { href: "/feed", label: "Feed" },
  { href: "/g", label: "Groups" },
  { href: "/jobs", label: "Jobs" },
  { href: "/hall", label: "Hall of Fame" },
  { href: "/placecom", label: "Placecom" },
];

export default async function Nav() {
  const [v, college, colleges, jar] = await Promise.all([getViewer(), getCollege(), listColleges(), cookies()]);
  const tnp = jar.get(TNP_COOKIE)?.value === "1";
  const guest = !v && jar.get("gs27_guest")?.value === "1";
  const pick = ({ slug, short_name, name }: { slug: string; short_name: string; name: string }) => ({ slug, short_name, name });
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight">GS<span className="text-accent">27</span></Link>
        <div className="flex flex-1 items-center gap-4 overflow-x-auto text-sm text-dim">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-fg">{l.label}</Link>)}
          {tnp && <Link href="/drives" title="T&P suite" className="whitespace-nowrap text-faint hover:text-accent">T&amp;P</Link>}
          {isModHere(v, college) && <Link href="/mod" className="whitespace-nowrap text-accent">Mod</Link>}
        </div>
        <CollegeSwitcher current={pick(college)} colleges={(colleges.length ? colleges : [college]).map(pick)} />
        {v ? (
          <Link href="/me" className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1 text-sm hover:border-white/40">
            @{v.profile?.handle ?? "me"}
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            {guest && <span title="Read-only. Sign in to post, upload, vote or join." className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-dim">guest</span>}
            <Link href="/login" className="whitespace-nowrap rounded-full bg-accent px-3 py-1 text-sm font-bold text-bg">Sign in</Link>
          </span>
        )}
      </nav>
      <TnpEgg unlocked={tnp} />
    </header>
  );
}
