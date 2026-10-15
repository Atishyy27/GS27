import Link from "next/link";
import { notFound } from "next/navigation";
import { Handle } from "@/components/Badge";
import ModActions from "@/components/mod/ModActions";
import { createClient } from "@/lib/supabase/server";
import { ago } from "@/lib/time";
import { getViewer, isMod } from "@/lib/viewer";

export const metadata = { title: "Moderation · GS27" };

type Report = { id: number; target_type: string; target_id: string; reason: string; created_at: string };
type Item = {
  id: number; title?: string | null; body?: string; description?: string | null; post_id?: number; subject_id?: number; kind?: string;
  hidden: boolean; anonymous: boolean; author_handle: string; author_verified: boolean | null; author_branch: string | null; author_batch: number | null; created_at: string;
};
type LogRow = { id: number; actor_id: string; action: string; target_type: string; target_id: string; note: string | null; created_at: string };

export default async function Mod({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const v = await getViewer();
  if (!isMod(v)) notFound();
  const isAdmin = v?.profile?.role === "admin";
  const { tab } = await searchParams;
  const showLog = tab === "log";
  const supabase = await createClient();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-20">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">MODERATION</p>
      <h1 className="mt-2 text-3xl font-extrabold">{showLog ? "Mod log" : "Reports"}</h1>
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/mod" className={`rounded-full px-3 py-1 ${!showLog ? "bg-accent font-bold text-bg" : "border border-white/15 text-dim"}`}>Queue</Link>
        <Link href="/mod?tab=log" className={`rounded-full px-3 py-1 ${showLog ? "bg-accent font-bold text-bg" : "border border-white/15 text-dim"}`}>Log</Link>
      </div>
      {showLog ? <ModLog supabase={supabase} /> : <Queue supabase={supabase} isAdmin={isAdmin} />}
    </main>
  );
}

type Supa = Awaited<ReturnType<typeof createClient>>;

async function Queue({ supabase, isAdmin }: { supabase: Supa; isAdmin: boolean }) {
  const { data } = await supabase.from("reports").select("id, target_type, target_id, reason, created_at")
    .eq("status", "open").order("created_at", { ascending: true }).limit(500);
  const reports = (data as Report[] | null) ?? [];

  // group reports by target
  const groups = new Map<string, Report[]>();
  for (const r of reports) {
    const k = `${r.target_type}:${r.target_id}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const idsOf = (t: string) => [...new Set(reports.filter((r) => r.target_type === t).map((r) => Number(r.target_id)).filter(Number.isInteger))];
  const authorCols = "anonymous, hidden, created_at, author_handle, author_verified, author_branch, author_batch";
  const [posts, comments, resources, profiles] = await Promise.all([
    idsOf("post").length ? supabase.from("v_posts").select(`id, title, body, ${authorCols}`).in("id", idsOf("post")) : null,
    idsOf("comment").length ? supabase.from("v_comments").select(`id, post_id, body, ${authorCols}`).in("id", idsOf("comment")) : null,
    idsOf("resource").length ? supabase.from("v_resources").select(`id, subject_id, kind, title, description, ${authorCols}`).in("id", idsOf("resource")) : null,
    reports.some((r) => r.target_type === "profile")
      ? supabase.from("profiles").select("id, handle, verified, branch, batch, bio").in("id", reports.filter((r) => r.target_type === "profile").map((r) => r.target_id))
      : null,
  ]);
  const byId = (rows: unknown) => new Map(((rows as Item[] | null) ?? []).map((x) => [String(x.id), x]));
  const items: Record<string, Map<string, Item>> = { post: byId(posts?.data), comment: byId(comments?.data), resource: byId(resources?.data) };
  const profs = new Map(((profiles?.data as { id: string; handle: string; verified: boolean; branch: string | null; batch: number | null; bio: string | null }[] | null) ?? []).map((x) => [x.id, x]));

  // most-reported first
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  if (!ordered.length) return <p className="mt-8 text-sm text-faint">No open reports.</p>;

  return (
    <ul className="mt-6 flex flex-col gap-4">
      {ordered.map(([key, rs]) => {
        const [type, id] = [rs[0].target_type, rs[0].target_id];
        const item = items[type]?.get(id);
        const prof = type === "profile" ? profs.get(id) : undefined;
        return (
          <li key={key} className="rounded-2xl border border-white/10 bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
              <span className="font-bold uppercase tracking-wide text-accent">{type} #{type === "profile" ? "" : id}</span>
              <span>{rs.length} report{rs.length > 1 ? "s" : ""} · first {ago(rs[0].created_at)}</span>
            </div>

            {item ? (
              <div className="mt-2">
                <Handle handle={item.author_handle} verified={item.author_verified} branch={item.author_branch} batch={item.author_batch} />
                {item.hidden && <span className="ml-2 text-xs text-accent">currently hidden</span>}
                {item.title && <p className="mt-2 font-semibold">{item.title}</p>}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-dim">{item.body ?? item.description ?? ""}</p>
                {type === "post" && <Link href={`/p/${item.id}`} className="mt-1 inline-block text-xs text-faint underline">open post</Link>}
                {type === "comment" && item.post_id && <Link href={`/p/${item.post_id}`} className="mt-1 inline-block text-xs text-faint underline">open thread</Link>}
                {type === "resource" && <p className="mt-1 text-xs text-faint">{item.kind} · subject #{item.subject_id}</p>}
              </div>
            ) : prof ? (
              <div className="mt-2">
                <Handle handle={prof.handle} verified={prof.verified} branch={prof.branch} batch={prof.batch} />
                {prof.bio && <p className="mt-1 text-sm text-dim">{prof.bio}</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-faint">Item no longer exists (deleted by its author).</p>
            )}

            <ul className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
              {rs.map((r) => <li key={r.id} className="text-xs text-dim">“{r.reason}” <span className="text-faint">· {ago(r.created_at)}</span></li>)}
            </ul>
            <ModActions type={type} id={id} hidden={item ? item.hidden : null} isAdmin={isAdmin} />
          </li>
        );
      })}
    </ul>
  );
}

async function ModLog({ supabase }: { supabase: Supa }) {
  const { data } = await supabase.from("mod_actions").select("id, actor_id, action, target_type, target_id, note, created_at")
    .order("created_at", { ascending: false }).limit(200);
  const rows = (data as LogRow[] | null) ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, handle").in("id", actorIds) : { data: [] };
  const handle = new Map(((actors as { id: string; handle: string }[] | null) ?? []).map((a) => [a.id, a.handle]));
  if (!rows.length) return <p className="mt-8 text-sm text-faint">No mod actions yet.</p>;
  return (
    <ul className="mt-6 flex flex-col divide-y divide-white/10 rounded-2xl border border-white/10 bg-card">
      {rows.map((r) => (
        <li key={r.id} className="p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${r.action === "reveal_author" ? "bg-accent/20 text-accent" : "bg-white/10 text-dim"}`}>{r.action.replace("_", " ")}</span>
            <span className="text-dim">{r.target_type} #{r.target_type === "profile" ? "" : r.target_id}</span>
            <span className="ml-auto text-xs text-faint">@{handle.get(r.actor_id) ?? "unknown"} · {ago(r.created_at)}</span>
          </div>
          {r.note && <p className="mt-1 text-xs text-faint">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}
