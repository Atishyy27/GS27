import Link from "next/link";
import CreateGroupForm from "@/components/social/CreateGroupForm";
import { collegeCtx } from "@/components/social/college";
import { db, memberCounts, myGroupIds } from "@/components/social/data";
import JoinButton from "@/components/social/JoinButton";
import { BackendMissing, Empty, SignInPrompt, ViewingElsewhere } from "@/components/social/Notice";
import { GROUP_COLS, type GroupRow } from "@/components/social/types";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Groups · GS27" };

const KIND_ORDER: Record<string, number> = { placecom: 0, branch: 1, batch: 2, subject: 3, custom: 4 };

export default async function Groups() {
  const v = await getViewer();
  const onboarded = Boolean(v?.profile?.branch && v.profile.batch && v.profile.college_id);
  const supabase = await db();
  const ctx = await collegeCtx(v);
  let groups: GroupRow[] = [];
  let counts = new Map<number, number>();
  let mine = new Set<number>();
  if (supabase) {
    const [g, m] = await Promise.all([
      supabase.from("groups").select(GROUP_COLS).eq("college_id", ctx.college.id),
      myGroupIds(supabase, v?.userId),
    ]);
    groups = (g.data ?? []) as GroupRow[];
    counts = await memberCounts(supabase, groups.map((x) => x.id));
    mine = m;
  }
  const myBranch = v?.profile?.branch;
  groups.sort((a, b) =>
    Number(mine.has(b.id)) - Number(mine.has(a.id)) ||
    Number(b.branch === myBranch && !!myBranch) - Number(a.branch === myBranch && !!myBranch) ||
    (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) ||
    (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) ||
    a.name.localeCompare(b.name));
  const joined = groups.filter((g) => mine.has(g.id));
  const others = groups.filter((g) => !mine.has(g.id));

  const row = (g: GroupRow) => (
    <li key={g.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <div className="min-w-0 flex-1">
        <Link href={`/g/${g.slug}`} className="font-bold hover:underline">{g.name}</Link>
        <span className="ml-2 text-xs text-faint">g/{g.slug}</span>
        {g.verified_only && <span className="ml-2 rounded-full bg-good/15 px-2 py-0.5 text-[11px] text-good">verified only</span>}
        {g.description && <p className="mt-1 line-clamp-2 text-sm text-dim">{g.description}</p>}
        <p className="mt-1 text-xs text-faint">{counts.get(g.id) ?? 0} members</p>
      </div>
      {!ctx.elsewhere && <JoinButton groupId={g.id} joined={mine.has(g.id)} signedIn={Boolean(v)} next="/g" />}
    </li>
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Groups <span className="text-base font-semibold text-dim">· {ctx.college.short_name}</span></h1>
        {supabase && onboarded && !ctx.elsewhere && <CreateGroupForm collegeName={ctx.college.short_name} />}
      </div>
      <div className="mt-4">
        {!supabase ? <BackendMissing /> : !v ? <SignInPrompt next="/g" /> : !onboarded ? <SignInPrompt next="/g" onboard /> : ctx.elsewhere ? <ViewingElsewhere name={ctx.college.short_name} /> : null}
      </div>
      {joined.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-dim">My groups</h2>
          <ul className="flex flex-col gap-3">{joined.map(row)}</ul>
        </section>
      )}
      {supabase && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-dim">{joined.length ? "More groups" : "All groups"}</h2>
          {others.length ? <ul className="flex flex-col gap-3">{others.map(row)}</ul> : <Empty>No other groups yet.</Empty>}
        </section>
      )}
    </main>
  );
}
