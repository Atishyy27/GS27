"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Opt = { slug: string; short_name: string; name: string };

/** Shows the college being viewed; picking another goes through /college/<slug>, which sets the cookie. */
export default function CollegeSwitcher({ current, colleges }: { current: Opt; colleges: Opt[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // group and project slugs are per college, so a deep link may not exist elsewhere: land on the section root
  const section = "/" + (path.split("/")[1] ?? "");
  const next = encodeURIComponent(section === "/" ? "/" : section);

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="whitespace-nowrap rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-dim hover:text-fg">
        {current.short_name} ▾
      </button>
      {open && (
        <ul className="absolute right-0 top-9 z-50 max-h-80 w-64 overflow-auto rounded-xl border border-white/10 bg-card p-1 shadow-xl">
          {colleges.map((c) => (
            <li key={c.slug}>
              <a href={`/college/${c.slug}?next=${next}`}
                className={`block rounded-lg px-3 py-2 text-sm hover:bg-white/5 ${c.slug === current.slug ? "text-accent" : "text-fg"}`}>
                <span className="font-semibold">{c.short_name}</span>
                <span className="block truncate text-xs text-faint">{c.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
