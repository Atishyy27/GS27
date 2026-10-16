import Link from "next/link";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { collegeCtx, foreignName, isModHere, type CollegeCtx } from "@/components/social/college";
import { ago } from "@/lib/time";
import ProjectCard from "@/components/hall/ProjectCard";
import ReviewButtons from "@/components/hall/ReviewButtons";
import { PROJECT_COLUMNS, type ProjectRow } from "@/components/hall/data";

export const metadata = { title: "Hall of Fame · GS27", description: "Projects built by college students." };

type Search = { tag?: string; sort?: string; pending?: string; scope?: string };

const detailHref = (ctx: CollegeCtx, p: ProjectRow) => {
  const c = p.college_id !== ctx.college.id ? ctx.slugs.get(p.college_id) : undefined;
  return `/hall/${p.slug}${c ? `?c=${encodeURIComponent(c)}` : ""}`;
};

export default async function Hall({ searchParams }: { searchParams: Promise<Search> }) {
  const { tag, sort = "top", pending, scope } = await searchParams;
  const v = await getViewer();
  const ctx = await collegeCtx(v);
  const everywhere = scope === "all";
  const mod = isModHere(v, ctx.college);
  const showPending = mod && pending === "1";

  let projects: ProjectRow[] = [];
  let queue: ProjectRow[] = [];
  let mine: ProjectRow[] = [];
  let voted = new Set<number>();
  let allTags: string[] = [];

  if (hasSupabase) {
    const supabase = await createClient();
    let q = supabase.from("v_projects").select(PROJECT_COLUMNS).eq("status", "approved");
    if (!everywhere) q = q.eq("college_id", ctx.college.id);
    if (tag) q = q.contains("tags", [tag]);
    q = sort === "new" ? q.order("created_at", { ascending: false }) : q.order("score", { ascending: false }).order("created_at", { ascending: false });
    const [{ data: list }, { data: tagRows }] = await Promise.all([
      q.limit(120),
      everywhere
        ? supabase.from("v_projects").select("tags").eq("status", "approved").limit(500)
        : supabase.from("v_projects").select("tags").eq("status", "approved").eq("college_id", ctx.college.id).limit(500),
    ]);
    projects = (list ?? []) as ProjectRow[];
    allTags = Array.from(new Set((tagRows ?? []).flatMap((r) => (r as { tags: string[] }).tags))).sort();

    if (v) {
      const { data: votes } = await supabase.from("project_votes").select("project_id");
      voted = new Set((votes ?? []).map((r) => (r as { project_id: number }).project_id));
      const { data: own } = await supabase.from("v_projects").select(PROJECT_COLUMNS).eq("is_mine", true).neq("status", "approved")
        .order("created_at", { ascending: false });
      mine = (own ?? []) as ProjectRow[];
    }
    if (showPending) {
      const { data } = await supabase.from("v_projects").select(PROJECT_COLUMNS).eq("status", "pending")
        .eq("college_id", ctx.college.id).order("created_at");
      queue = (data ?? []) as ProjectRow[];
    }
  }

  const href = (p: Partial<Search>) => {
    const s = new URLSearchParams();
    const t = "tag" in p ? p.tag : tag;
    const so = p.sort ?? sort;
    const sc = "scope" in p ? p.scope : scope;
    if (t) s.set("tag", t);
    if (so !== "top") s.set("sort", so);
    if (sc === "all") s.set("scope", "all");
    const qs = s.toString();
    return `/hall${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-24">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] text-accent">HALL OF FAME</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-6xl">{everywhere ? "Built by students." : `Built at ${ctx.college.short_name}.`}</h1>
          <p className="mt-3 text-dim">
            {everywhere ? "Tools, apps and hacks made by students of every college on GS27." : "Tools, apps and hacks made by students of this college."} Use them, star them, and put yours up here.
          </p>
        </div>
        <Link href="/hall/submit" className="self-start rounded-full bg-accent px-5 py-2.5 font-bold text-bg sm:self-auto">
          Submit your project
        </Link>
      </section>

      {!hasSupabase && (
        <p className="mt-8 rounded-2xl border border-accent/40 p-4 text-sm text-accent">
          Backend not configured yet (Supabase keys missing), so there is nothing to show.
        </p>
      )}

      {mod && (
        <div className="mt-6 text-sm">
          <Link href={showPending ? "/hall" : "/hall?pending=1"} className="font-semibold text-accent hover:underline">
            {showPending ? "Hide review queue" : "Review pending submissions"}
          </Link>
        </div>
      )}

      {showPending && (
        <section className="mt-4 rounded-2xl border border-accent/30 p-4">
          <h2 className="font-bold">Waiting for review ({queue.length})</h2>
          {queue.length === 0 && <p className="mt-2 text-sm text-faint">Nothing pending.</p>}
          <ul className="mt-3 flex flex-col gap-3">
            {queue.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-xl bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={detailHref(ctx, p)} className="font-semibold hover:text-accent">{p.name}</Link>
                  <p className="truncate text-sm text-dim">{p.tagline || p.description.slice(0, 120)}</p>
                  <p className="text-xs text-faint">
                    {p.builders ? `by ${p.builders} · ` : ""}{ago(p.created_at)}
                    {p.url && <> · <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-fg">live</a></>}
                    {p.repo_url && <> · <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="hover:text-fg">code</a></>}
                  </p>
                </div>
                <ReviewButtons projectId={p.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length > 0 && (
        <section className="mt-6 rounded-2xl border border-white/10 p-4 text-sm">
          <h2 className="font-semibold">Your submissions</h2>
          <ul className="mt-2 flex flex-col gap-1 text-dim">
            {mine.map((p) => (
              <li key={p.id}>
                {p.name}: {p.status === "pending" ? "waiting for a mod to approve" : "not approved"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {[[undefined, ctx.college.short_name], ["all", "All colleges"]].map(([k, l]) => (
          <Link key={l} href={href({ scope: k })}
            className={`rounded-full px-3 py-1 text-sm ${(k === "all") === everywhere ? "bg-accent font-bold text-bg" : "border border-white/15 text-dim hover:text-fg"}`}>{l}</Link>
        ))}
        <span className="ml-3 mr-1 text-sm text-faint">Sort</span>
        {[["top", "Top"], ["new", "New"]].map(([k, l]) => (
          <Link key={k} href={href({ sort: k })}
            className={`rounded-full px-3 py-1 text-sm ${sort === k ? "bg-fg text-bg" : "border border-white/15 text-dim hover:text-fg"}`}>{l}</Link>
        ))}
        {allTags.length > 0 && <span className="ml-3 mr-1 text-sm text-faint">Tags</span>}
        {tag && (
          <Link href={href({ tag: undefined })} className="rounded-full bg-accent/15 px-3 py-1 text-sm text-accent">#{tag} ✕</Link>
        )}
        {allTags.filter((t) => t !== tag).map((t) => (
          <Link key={t} href={href({ tag: t })} className="rounded-full border border-white/10 px-3 py-1 text-sm text-dim hover:text-fg">#{t}</Link>
        ))}
      </div>

      {hasSupabase && projects.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-faint">
          {tag ? `No projects tagged #${tag} yet.` : "No projects yet. Be the first."}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} voted={voted.has(p.id)} signedIn={Boolean(v)} from={foreignName(ctx, p.college_id)} href={detailHref(ctx, p)} />
        ))}
      </div>
    </main>
  );
}
