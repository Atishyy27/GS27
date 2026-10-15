/** Identity chips. Never shows a name or email: only the handle, branch, batch and verified state. */
export default function Badge({ verified, branch, batch }: { verified?: boolean | null; branch?: string | null; batch?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {verified ? (
        <span title="Signed in with an @sgsits.ac.in account" className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good">✓ SGSITS</span>
      ) : verified === false ? (
        <span title="Not verified with a college account" className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-dim">unverified</span>
      ) : null}
      {branch && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-dim">{branch}{batch ? ` · ${batch}` : ""}</span>}
    </span>
  );
}

export function Handle({ handle, verified, branch, batch }: { handle: string; verified?: boolean | null; branch?: string | null; batch?: number | null }) {
  const anon = handle === "anonymous";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={anon ? "italic text-dim" : "font-semibold"}>{anon ? "anonymous" : `@${handle}`}</span>
      <Badge verified={verified} branch={branch} batch={batch} />
    </span>
  );
}
