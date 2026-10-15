export default function NotConfigured() {
  return (
    <p className="mt-6 rounded-xl border border-accent/40 p-3 text-sm text-accent">
      Backend not configured yet (Supabase keys missing), so the library is empty for now.
    </p>
  );
}
