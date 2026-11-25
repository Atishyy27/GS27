import { notFound } from "next/navigation";
import { createMockSource } from "@/lib/data/mock";
import { load } from "@/lib/data";
import type { MockMode } from "@/lib/data/types";
import { studySiteFor } from "@/data/study-sites";
import StudySite from "@/components/library/StudySite";
import SyllabusView from "@/components/library/SyllabusView";
import PastQuestionsView from "@/components/library/PastQuestionsView";

// A fixture-backed copy of the subject page sections, used by the browser tests. It exists only when GS27_MOCK is set (never in production).
export const dynamic = "force-dynamic";

const MODES: MockMode[] = ["ok", "empty", "error", "slow"];

export default async function MockSubject({ params, searchParams }: {
  params: Promise<{ code: string }>; searchParams: Promise<{ mode?: string; frame?: string }>;
}) {
  if (!process.env.GS27_MOCK) notFound();
  const { code } = await params;
  const sp = await searchParams;
  const mode = MODES.find((m) => m === sp.mode) ?? "ok";
  const source = createMockSource(mode, 800);
  const upper = code.toUpperCase();
  const site = studySiteFor([upper]);
  const [pq, sy] = await Promise.all([load(() => source.pastQuestions(1)), load(() => source.syllabi([upper], 1))]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
      <nav className="text-xs text-dim">Library / SGSITS / Mech / Semester 7</nav>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Sample subject</h1>
        <span className="text-sm text-faint">{upper}</span>
      </div>
      {site && <StudySite site={{ ...site, frame: sp.frame === "0" ? false : site.frame }} />}
      <SyllabusView syllabi={sy.data ?? []} error={sy.error} />
      <PastQuestionsView questions={pq.data ?? []} error={pq.error} />
    </main>
  );
}
