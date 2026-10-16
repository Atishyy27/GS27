import Link from "next/link";

export function BackendMissing() {
  return (
    <p className="rounded-2xl border border-accent/40 p-4 text-sm text-accent">
      Backend not configured yet (Supabase keys missing), so there is nothing to show.
    </p>
  );
}

export function SignIn({ next, text }: { next: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5 text-sm text-dim">
      {text}{" "}
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:underline">Sign in</Link>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-faint">{children}</p>;
}
