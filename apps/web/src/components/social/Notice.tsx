import Link from "next/link";

/** Shown in place of a composer or a list when something is missing. */
export function BackendMissing() {
  return (
    <p className="rounded-2xl border border-accent/40 p-4 text-sm text-accent">
      Backend not configured yet (Supabase keys missing), so there is nothing to show.
    </p>
  );
}

export function SignInPrompt({ next, onboard }: { next: string; onboard?: boolean }) {
  const href = onboard ? `/onboarding?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`;
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4 text-sm text-dim">
      {onboard ? "Pick your branch and batch to start posting." : "Sign in to post, vote and comment. Nobody sees your name."}{" "}
      <Link href={href} className="font-semibold text-accent hover:underline">{onboard ? "Finish setup" : "Sign in"}</Link>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-faint">{children}</p>;
}
