import Link from "next/link";
import { hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import ActionForm from "@/components/recruit/ActionForm";
import { createOrg } from "@/components/recruit/actions";
import { myOrgs } from "@/components/recruit/data";
import { BackendMissing, SignIn } from "@/components/recruit/Notice";
import { card, input, label } from "@/components/recruit/styles";

export const metadata = { title: "Recruit · GS27" };

export default async function RecruitHome() {
  const viewer = await getViewer();
  const orgs = viewer ? await myOrgs() : [];
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">FOR RECRUITERS</p>
      <h1 className="mt-2 text-4xl font-extrabold">Hire from GS27 colleges</h1>
      <ul className="mt-4 max-w-2xl space-y-1.5 text-sm text-dim">
        <li>1. Create your organization. GS27 verifies it before anything goes public.</li>
        <li>2. Post jobs open to all colleges, or to specific colleges, branches and batches.</li>
        <li>3. Review applicants and search students who switched their talent profile on.</li>
      </ul>
      <p className="mt-3 max-w-2xl text-xs text-faint">
        Students choose to be visible. You see the profile they wrote for recruiters, never their anonymous GS27 handle or posts.
      </p>

      <div className="mt-10">
        {!hasSupabase ? <BackendMissing /> : !viewer ? (
          <SignIn next="/recruit" text="Sign in with your work Google account to start." />
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="text-sm font-bold tracking-[0.2em] text-dim">YOUR ORGANIZATIONS</h2>
              {orgs.length === 0 ? <p className="mt-3 text-sm text-faint">None yet.</p> : (
                <ul className="mt-3 space-y-2">
                  {orgs.map((o) => (
                    <li key={o.id}>
                      <Link href={`/recruit/o/${o.id}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-card p-4 hover:border-white/30">
                        <span className="font-semibold">{o.name}</span>
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-dim">{o.role}</span>
                          {o.verified
                            ? <span className="rounded-full bg-good/15 px-2 py-0.5 font-semibold text-good">✓ verified</span>
                            : <span className="rounded-full bg-white/10 px-2 py-0.5 text-dim">awaiting verification</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {viewer.profile?.platform_admin && (
                <Link href="/recruit/admin" className="mt-4 inline-block text-sm text-accent hover:underline">Platform admin: verify organizations</Link>
              )}
            </section>
            <section className={card}>
              <h2 className="font-bold">Create an organization</h2>
              <ActionForm action={createOrg} submit="Create" pendingLabel="Creating..." className="mt-4 flex flex-col gap-3">
                <label className={label}>Company name<input name="name" required minLength={2} maxLength={80} className={input} /></label>
                <label className={label}>Short name for links (optional)<input name="slug" maxLength={40} placeholder="acme" className={input} /></label>
                <label className={label}>Website<input name="website" maxLength={200} placeholder="acme.com" className={input} /></label>
                <p className="text-xs text-faint">You become the owner. Jobs stay in draft until GS27 verifies the organization.</p>
              </ActionForm>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
