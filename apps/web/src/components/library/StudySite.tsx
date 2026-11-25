"use client";

import { useEffect, useState } from "react";
import type { StudySiteInfo } from "@/data/study-sites";

const SLOW_MS = 12_000;

export default function StudySite({ site }: { site: StudySiteInfo }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [open, loaded]);

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-card p-4" aria-label="Study site">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">{site.title}</h2>
          <p className="text-xs text-dim">Notes, solved past questions and a timer, built for this course.</p>
        </div>
        <a href={site.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3 py-1 text-sm text-accent hover:border-white/40">
          Open in new tab ↗
        </a>
      </div>
      {site.frame && (
        <details className="mt-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary className="cursor-pointer text-sm text-accent">Study here</summary>
          {open && (
            <div className="mt-3">
              <iframe
                src={site.url}
                title={site.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups"
                onLoad={() => setLoaded(true)}
                className="h-[75vh] w-full rounded-xl border border-white/10 bg-white"
              />
              {slow && !loaded && (
                <p className="mt-2 text-xs text-dim">Taking long to load. Use &ldquo;Open in new tab&rdquo; above.</p>
              )}
            </div>
          )}
        </details>
      )}
    </section>
  );
}
