import Link from "next/link";
import { ago } from "@/lib/time";
import { JOB_KINDS, pay, type JobWithOrg } from "./data";
import { chip } from "./styles";

export default function JobCard({ j, href }: { j: JobWithOrg; href?: string }) {
  const kind = JOB_KINDS.find((k) => k.kind === j.kind)?.label ?? j.kind;
  return (
    <Link href={href ?? `/jobs/${j.id}`} className="block rounded-2xl border border-white/10 bg-card p-5 hover:border-white/30">
      <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
        <span className="font-semibold text-fg">{j.organizations?.name ?? "Organization"}</span>
        {j.organizations?.verified && <span className="rounded-full bg-good/15 px-2 py-0.5 font-semibold text-good">✓ verified</span>}
        <span>· {ago(j.created_at)}</span>
        {j.status !== "published" && <span className="rounded-full bg-white/10 px-2 py-0.5 uppercase">{j.status}</span>}
      </div>
      <h3 className="mt-2 text-lg font-bold">{j.title}</h3>
      <p className="mt-1 text-sm text-dim">
        {kind} · {pay(j)} · {j.remote ? "Remote" : j.location ?? "Location not stated"}
        {j.deadline ? ` · apply by ${new Date(j.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
      </p>
      {j.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">{j.skills.slice(0, 8).map((s) => <span key={s} className={chip}>{s}</span>)}</div>
      )}
    </Link>
  );
}
