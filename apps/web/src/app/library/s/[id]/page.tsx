import Link from "next/link";
import { notFound } from "next/navigation";
import { RESOURCE_KINDS } from "@/lib/catalog";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { ago } from "@/lib/time";
import { Handle } from "@/components/Badge";
import VoteButtons from "@/components/shared/VoteButtons";
import ReportButton from "@/components/shared/ReportButton";
import NotConfigured from "@/components/library/NotConfigured";
import UploadForm from "@/components/library/UploadForm";

type Resource = {
  id: number; kind: string; title: string; description: string | null; file_path: string | null; url: string | null;
  year: number | null; score: number; created_at: string; hidden: boolean;
  author_handle: string; author_branch: string | null; author_batch: number | null; author_verified: boolean | null;
};

export default async function SubjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }>;
}) {
  const id = Number((await params).id);
  const { kind } = await searchParams;
  if (!Number.isInteger(id) || id < 1) notFound();
  if (!hasSupabase) {
    return <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-24"><h1 className="text-3xl font-extrabold">Subject</h1><NotConfigured /></main>;
  }

  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("id, branch, semester, name, code").eq("id", id).maybeSingle();
  if (!subject) notFound();

  const v = await getViewer();
  const onboarded = Boolean(v?.profile?.branch && v?.profile?.batch);
  const { data } = await supabase.from("v_resources")
    .select("id, kind, title, description, file_path, url, year, score, created_at, hidden, author_handle, author_branch, author_batch, author_verified")
    .eq("subject_id", id).order("score", { ascending: false }).order("created_at", { ascending: false });
  const all = (data ?? []) as Resource[];

  const myVotes = new Map<number, -1 | 1>();
  if (v && all.length) {
    const { data: votes } = await supabase.from("votes").select("target_id, value")
      .eq("target_type", "resource").in("target_id", all.map((r) => r.id));
    for (const x of votes ?? []) myVotes.set(x.target_id, x.value as -1 | 1);
  }

  const activeKind = RESOURCE_KINDS.some((k) => k.kind === kind) ? kind : undefined;
  const shown = activeKind ? all.filter((r) => r.kind === activeKind) : all;
  const countOf = (k: string) => all.filter((r) => r.kind === k).length;
  const linkFor = (r: Resource) => r.file_path ? supabase.storage.from("library").getPublicUrl(r.file_path).data.publicUrl : r.url!;
  const label = (k: string) => RESOURCE_KINDS.find((x) => x.kind === k)?.label ?? k;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
      <nav className="text-xs text-dim">
        <Link href={`/library?branch=${subject.branch}`} className="hover:text-fg">Library</Link> /{" "}
        <Link href={`/library/${subject.branch}/${subject.semester}`} className="hover:text-fg">{subject.branch} Sem {subject.semester}</Link>
      </nav>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{subject.name}</h1>
        {subject.code && <span className="text-sm text-faint">{subject.code}</span>}
      </div>

      <div className="mt-6">
        {onboarded ? <UploadForm subjectId={id} userId={v!.userId} /> : (
          <p className="text-sm text-dim">
            <Link href={v ? `/onboarding?next=/library/s/${id}` : `/login?next=/library/s/${id}`} className="text-accent hover:underline">
              {v ? "Finish your profile" : "Sign in"}
            </Link>{" "}to upload notes, papers or solutions.
          </p>
        )}
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        <Link href={`/library/s/${id}`} className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${!activeKind ? "border-accent text-accent" : "border-white/15 text-dim hover:text-fg"}`}>
          All {all.length}
        </Link>
        {RESOURCE_KINDS.map((k) => (
          <Link key={k.kind} href={`/library/s/${id}?kind=${k.kind}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${activeKind === k.kind ? "border-accent text-accent" : "border-white/15 text-dim hover:text-fg"}`}>
            {k.label} {countOf(k.kind)}
          </Link>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className={`flex gap-4 rounded-2xl border border-white/10 bg-card p-4 ${r.hidden ? "opacity-50" : ""}`}>
            <div className="flex flex-col items-center pt-1">
              <VoteButtons targetType="resource" targetId={r.id} score={r.score} myVote={myVotes.get(r.id) ?? 0} signedIn={Boolean(v)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">{label(r.kind)}</span>
                {r.year && <span className="text-xs text-dim">{r.year}</span>}
                {r.hidden && <span className="text-xs text-accent">hidden by a moderator</span>}
              </div>
              <a href={linkFor(r)} target="_blank" rel="noopener noreferrer" className="mt-1 block break-words font-semibold hover:text-accent">
                {r.title} <span className="text-dim">{r.file_path ? "↓" : "↗"}</span>
              </a>
              {r.description && <p className="mt-1 whitespace-pre-line text-sm text-dim">{r.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
                <Handle handle={r.author_handle} verified={r.author_verified} branch={r.author_branch} batch={r.author_batch} />
                <span>{ago(r.created_at)}</span>
                <ReportButton targetType="resource" targetId={r.id} signedIn={Boolean(v)} />
              </div>
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="text-sm text-dim">Nothing here yet. Be the first to add one.</li>}
      </ul>
    </main>
  );
}
