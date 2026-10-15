import Link from "next/link";
import { hasSupabase } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/viewer";
import SubmitForm from "@/components/hall/SubmitForm";

export const metadata = { title: "Submit a project · GS27" };

export default async function Submit() {
  if (!hasSupabase) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-24">
        <h1 className="text-3xl font-extrabold">Submit your project</h1>
        <p className="mt-6 rounded-2xl border border-accent/40 p-4 text-sm text-accent">Backend not configured yet (Supabase keys missing).</p>
      </main>
    );
  }
  const v = await requireOnboarded("/hall/submit");
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-24">
      <Link href="/hall" className="text-sm text-dim hover:text-fg">← Hall of Fame</Link>
      <h1 className="mt-3 text-3xl font-extrabold">Submit your project</h1>
      <p className="mt-2 text-sm text-dim">
        Anything a student here built: a site, an app, an extension, a bot, a hardware hack. Your own account stays private;
        only the &quot;built by&quot; line you write is shown.
      </p>
      <div className="mt-8">
        <SubmitForm branch={v.profile.branch} batch={v.profile.batch} />
      </div>
    </main>
  );
}
