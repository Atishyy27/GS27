import { notFound } from "next/navigation";
import { ago } from "@/lib/time";
import { getViewer } from "@/lib/viewer";
import ActionForm from "@/components/recruit/ActionForm";
import { verifyOrg } from "@/components/recruit/actions";
import { db, ORG_COLUMNS, type Org } from "@/components/recruit/data";
import { Empty } from "@/components/recruit/Notice";
import { input } from "@/components/recruit/styles";

export const metadata = { title: "Verify organizations · GS27" };

export default async function RecruitAdmin() {
  const viewer = await getViewer();
  if (!viewer?.profile?.platform_admin) notFound();
  const supabase = (await db())!;
  // Platform admins can read every organization (RLS "orgs read").
  const { data } = await supabase.from("organizations").select(ORG_COLUMNS).order("verified").order("created_at", { ascending: false });
  const orgs = (data as Org[]) ?? [];
  const pending = orgs.filter((o) => !o.verified);
  const done = orgs.filter((o) => o.verified);

  const Row = ({ o }: { o: Org }) => (
    <li className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{o.name} <span className="text-sm font-normal text-faint">/{o.slug}</span></span>
        <span className="text-xs text-dim">created {ago(o.created_at)}</span>
      </div>
      {o.website && <a href={o.website} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">{o.website}</a>}
      <ActionForm action={verifyOrg} submit={o.verified ? "Remove verification" : "Verify"} className="mt-3 flex flex-wrap items-center gap-2"
        buttonClassName={o.verified ? "rounded-full border border-white/20 px-3 py-1 text-sm text-dim hover:text-accent" : "rounded-full bg-good px-3 py-1 text-sm font-bold text-bg"}>
        <input type="hidden" name="org_id" value={o.id} />
        <input type="hidden" name="verified" value={o.verified ? "false" : "true"} />
        <input name="note" maxLength={300} placeholder="Note for the log (what you checked)" className={`${input} max-w-sm py-1 text-sm`} />
      </ActionForm>
    </li>
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">PLATFORM ADMIN</p>
      <h1 className="mt-2 text-3xl font-extrabold">Verify organizations</h1>
      <p className="mt-2 text-sm text-dim">Check the website and the recruiter&apos;s email domain before verifying. Every change is logged.</p>
      <h2 className="mt-8 text-sm font-bold tracking-[0.2em] text-dim">WAITING ({pending.length})</h2>
      <ul className="mt-3 space-y-3">{pending.length ? pending.map((o) => <Row key={o.id} o={o} />) : <Empty>Nothing waiting.</Empty>}</ul>
      <h2 className="mt-10 text-sm font-bold tracking-[0.2em] text-dim">VERIFIED ({done.length})</h2>
      <ul className="mt-3 space-y-3">{done.map((o) => <Row key={o.id} o={o} />)}</ul>
    </main>
  );
}
