"use client";

import { createClient } from "@/lib/supabase/client";

type Props = { next?: string; college?: boolean; link?: boolean; children: React.ReactNode; className?: string };

/** Sign in with Google. college = hint the @sgsits.ac.in account; link = attach it to the current user. */
export default function GoogleButton({ next = "/feed", college, link, children, className }: Props) {
  async function go() {
    const supabase = createClient();
    const options = {
      redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: (college ? { hd: "sgsits.ac.in", prompt: "select_account" } : { prompt: "select_account" }) as Record<string, string>,
    };
    const { error } = link
      ? await supabase.auth.linkIdentity({ provider: "google", options })
      : await supabase.auth.signInWithOAuth({ provider: "google", options });
    if (error) alert(error.message);
  }
  return (
    <button onClick={go} className={className ?? "w-full rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-white/90"}>
      {children}
    </button>
  );
}
