import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer, isMod } from "@/lib/viewer";
import { ago } from "@/lib/time";
import HeartButton from "@/components/hall/HeartButton";
import ReviewButtons from "@/components/hall/ReviewButtons";
import { Chips, ProjectTile } from "@/components/hall/ProjectCard";
import { PROJECT_COLUMNS, type ProjectRow } from "@/components/hall/data";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!hasSupabase) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-24">
        <Link href="/hall" className="text-sm text-dim hover:text-fg">← Hall of Fame</Link>
        <p className="mt-6 rounded-2xl border border-accent/40 p-4 text-sm text-accent">Backend not configured yet (Supabase keys missing).</p>
      </main>
    );
  }

  const supabase = await createClient();
  const v = await getViewer();
  const { data } = await supabase.from("v_projects").select(PROJECT_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const p = data as ProjectRow;

  let voted = false;
  if (v) {
    const { data: vote } = await supabase.from("project_votes").select("project_id").eq("project_id", p.id).maybeSingle();
    voted = Boolean(vote);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-24">
      <Link href="/hall" className="text-sm text-dim hover:text-fg">← Hall of Fame</Link>

      {p.status !== "approved" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 p-4 text-sm">
          <span className="text-accent">{p.status === "pending" ? "Waiting for a mod to approve." : "Not approved."} Only you and the mods can see this page.</span>
          {isMod(v) && p.status === "pending" && <ReviewButtons projectId={p.id} />}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <ProjectTile p={p} className="h-56 sm:h-72" />
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">{p.name}</h1>
          {p.tagline && <p className="mt-2 text-lg text-dim">{p.tagline}</p>}
        </div>
        {p.status === "approved" && <HeartButton projectId={p.id} score={p.score} voted={voted} signedIn={Boolean(v)} />}
      </div>

      <div className="mt-4"><Chips p={p} /></div>

      <p className="mt-4 text-sm text-faint">
        {p.builders ? <>Built by <span className="text-fg">{p.builders}</span></> : "Builders not added yet"} · added {ago(p.created_at)}
      </p>

      {(p.url || p.repo_url) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-accent px-4 py-2 font-bold text-bg">Open it ↗</a>}
          {p.repo_url && <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-4 py-2 font-semibold hover:border-white/50">See the code ↗</a>}
        </div>
      )}

      {p.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-fg/90">{p.description}</p>}
    </main>
  );
}
