import { redirect } from "next/navigation";
import Badge from "@/components/Badge";
import { listColleges } from "@/lib/college";
import { getViewer } from "@/lib/viewer";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Your college, branch and batch · GS27" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/feed" } = await searchParams;
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  const p = v.profile;
  const colleges = (await listColleges()).map(({ id, short_name, name, city, branches }) => ({ id, short_name, name, city, branches }));
  const fixed = p?.verified && p.college_id ? p.college_id : null;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-24">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">WELCOME</p>
      <h1 className="mt-2 text-3xl font-extrabold">You are <span className="text-accent">{p?.handle}</span></h1>
      <div className="mt-2">{p && <Badge verified={p.verified} />}</div>
      <p className="mt-4 text-sm text-dim">
        Pick your college, branch and batch. They decide your library, your groups and your feed. You can change branch and
        batch later.
      </p>
      <OnboardingForm colleges={colleges} fixedCollegeId={fixed} defaultCollegeId={p?.college_id ?? null}
        defaultBranch={p?.branch ?? null} defaultBatch={p?.batch ?? null} next={next} />
    </main>
  );
}
