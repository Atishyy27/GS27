import Link from "next/link";
import HeartButton from "./HeartButton";
import { tileGradient, type ProjectRow } from "./data";

export function ProjectTile({ p, className = "" }: { p: ProjectRow; className?: string }) {
  return p.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-supplied external images, any host
    <img src={p.image_url} alt="" className={`w-full object-cover ${className}`} />
  ) : (
    <div className={`flex w-full items-end p-4 ${className}`} style={{ background: tileGradient(p.slug) }}>
      <span className="text-3xl font-extrabold leading-none text-white/90 drop-shadow">{p.name}</span>
    </div>
  );
}

export function Chips({ p }: { p: ProjectRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(p.branch || p.batch) && (
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-dim">
          {[p.branch, p.batch].filter(Boolean).join(" · ")}
        </span>
      )}
      {p.tags.map((t) => (
        <Link key={t} href={`/hall?tag=${encodeURIComponent(t)}`} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-dim hover:text-fg">
          #{t}
        </Link>
      ))}
    </div>
  );
}

export default function ProjectCard({ p, voted, signedIn }: { p: ProjectRow; voted: boolean; signedIn: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card transition hover:border-white/25">
      <Link href={`/hall/${p.slug}`} className="block">
        <ProjectTile p={p} className="h-36" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Link href={`/hall/${p.slug}`} className="text-lg font-bold hover:text-accent">{p.name}</Link>
          {p.tagline && <p className="mt-1 text-sm text-dim">{p.tagline}</p>}
        </div>
        <Chips p={p} />
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="truncate text-xs text-faint">{p.builders ? `by ${p.builders}` : "builders not added yet"}</p>
          <HeartButton projectId={p.id} score={p.score} voted={voted} signedIn={signedIn} />
        </div>
        {(p.url || p.repo_url) && (
          <div className="flex gap-3 text-sm">
            {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Open ↗</a>}
            {p.repo_url && <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-fg">Code ↗</a>}
          </div>
        )}
      </div>
    </article>
  );
}
