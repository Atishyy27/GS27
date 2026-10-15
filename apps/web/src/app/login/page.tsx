import { redirect } from "next/navigation";
import GoogleButton from "@/components/GoogleButton";
import { hasSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Sign in · GS27" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/feed", error } = await searchParams;
  if (await getViewer()) redirect(next);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">GS27</p>
      <h1 className="mt-2 text-4xl font-extrabold">Sign in</h1>
      <p className="mt-3 text-sm text-dim">
        Nobody on GS27 sees your name or email. You get a random handle. Your college account earns a
        verified badge; any other Google account works too, without the badge.
      </p>
      {!hasSupabase && <p className="mt-6 rounded-xl border border-accent/40 p-3 text-sm text-accent">Backend not configured yet (Supabase keys missing).</p>}
      {error && <p className="mt-6 text-sm text-accent">Sign-in failed. Try again.</p>}
      <div className="mt-8 flex flex-col gap-3">
        <GoogleButton next={next} college>Continue with college account (@sgsits.ac.in)</GoogleButton>
        <GoogleButton next={next} className="w-full rounded-xl border border-white/20 px-4 py-3 font-semibold hover:border-white/50">
          Continue with another Google account
        </GoogleButton>
      </div>
      <p className="mt-6 text-xs text-faint">Admins can see who posted something only when it is reported, and every such look is logged.</p>
    </main>
  );
}
