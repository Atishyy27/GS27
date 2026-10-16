import { listColleges } from "@/lib/college";
import { BATCH_OPTIONS } from "@/lib/catalog";
import OrgNav from "@/components/recruit/OrgNav";
import TalentCard from "@/components/recruit/TalentCard";
import { db, splitList, TALENT_COLUMNS, type Talent } from "@/components/recruit/data";
import { Empty } from "@/components/recruit/Notice";
import { requireOrg } from "@/components/recruit/orgPage";
import { input, label } from "@/components/recruit/styles";

type SP = Promise<{ college?: string; branch?: string; batch?: string; skills?: string }>;

export default async function TalentSearch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const org = await requireOrg(id, `/recruit/o/${id}/talent`);
  const colleges = await listColleges();
  const branches = [...new Set(colleges.flatMap((c) => c.branches))];
  const skills = splitList(sp.skills ?? "", 10).map((s) => s.toLowerCase());

  let rows: Talent[] = [];
  if (org.verified) {
    const supabase = (await db())!;
    // RLS returns only visible profiles, and only to members of verified organizations.
    let q = supabase.from("talent_profiles").select(TALENT_COLUMNS).eq("visible", true).order("updated_at", { ascending: false }).limit(60);
    if (sp.college) q = q.eq("college_id", Number(sp.college));
    if (sp.branch) q = q.eq("branch", sp.branch);
    if (sp.batch) q = q.eq("batch", Number(sp.batch));
    const { data } = await q;
    rows = (data as Talent[]) ?? [];
    // skills are free text, so match case-insensitively here rather than with an array operator
    if (skills.length) rows = rows.filter((t) => skills.every((s) => t.skills.some((x) => x.toLowerCase().includes(s))));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-24">
      <OrgNav org={org} active="talent" />
      {!org.verified ? (
        <Empty>Talent search opens once GS27 verifies {org.name}.</Empty>
      ) : (
        <>
          <form className="grid gap-3 rounded-2xl border border-white/10 bg-card p-4 sm:grid-cols-5">
            <label className={label}>College
              <select name="college" defaultValue={sp.college ?? ""} className={input}>
                <option value="">Any</option>
                {colleges.map((c) => <option key={c.id} value={c.id}>{c.short_name}</option>)}
              </select>
            </label>
            <label className={label}>Branch
              <select name="branch" defaultValue={sp.branch ?? ""} className={input}>
                <option value="">Any</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className={label}>Batch
              <select name="batch" defaultValue={sp.batch ?? ""} className={input}>
                <option value="">Any</option>
                {BATCH_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className={label}>Skills<input name="skills" defaultValue={sp.skills ?? ""} placeholder="react, sql" className={input} /></label>
            <button className="self-end rounded-xl bg-accent px-4 py-2 font-bold text-bg">Search</button>
          </form>
          <p className="mt-4 text-sm text-faint">{rows.length} students. Only students who switched their profile on appear here.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {rows.length === 0 ? <Empty>No matches.</Empty> : rows.map((t) => (
              <TalentCard key={t.id} t={t} college={colleges.find((c) => c.id === t.college_id)?.short_name} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
