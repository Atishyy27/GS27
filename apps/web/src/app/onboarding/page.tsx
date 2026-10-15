import { redirect } from "next/navigation";
import { BATCH_OPTIONS, BRANCH_OPTIONS } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import Badge from "@/components/Badge";

export const metadata = { title: "Your branch and batch · GS27" };

async function save(formData: FormData) {
  "use server";
  const branch = String(formData.get("branch") ?? "");
  const batch = Number(formData.get("batch"));
  const next = String(formData.get("next") ?? "/feed");
  if (!BRANCH_OPTIONS.some((b) => b.code === branch) || !BATCH_OPTIONS.includes(batch)) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  await supabase.from("profiles").update({ branch, batch }).eq("id", data.user.id);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/feed");
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/feed" } = await searchParams;
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  const p = v.profile;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">WELCOME</p>
      <h1 className="mt-2 text-3xl font-extrabold">You are <span className="text-accent">{p?.handle}</span></h1>
      <div className="mt-2">{p && <Badge verified={p.verified} />}</div>
      <p className="mt-4 text-sm text-dim">Pick your branch and batch. They decide your library, your groups and your feed. You can change them later.</p>
      <form action={save} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-2 text-sm text-dim">Branch
          <select name="branch" defaultValue={p?.branch ?? ""} required className="rounded-xl border border-white/15 bg-card px-3 py-3 text-base text-fg">
            <option value="" disabled>Choose</option>
            {BRANCH_OPTIONS.map((b) => <option key={b.code} value={b.code}>{b.code} · {b.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-dim">Batch (passing-out year)
          <select name="batch" defaultValue={p?.batch ?? ""} required className="rounded-xl border border-white/15 bg-card px-3 py-3 text-base text-fg">
            <option value="" disabled>Choose</option>
            {BATCH_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <button className="mt-2 rounded-xl bg-accent px-4 py-3 font-bold text-bg">Continue</button>
      </form>
    </main>
  );
}
