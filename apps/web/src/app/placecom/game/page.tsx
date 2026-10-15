import Link from "next/link";
import Game from "@/components/placecom/Game";

export const metadata = { title: "Where are you right now? · Placecom · GS27" };

export default function GamePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-24">
      <Link href="/placecom" className="text-sm text-dim hover:text-fg">← Placecom season</Link>
      <p className="mt-4 text-xs font-bold tracking-[0.2em] text-accent">THE GAME</p>
      <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-6xl">Where are you, right now?</h1>
      <p className="mt-3 max-w-2xl text-dim">
        The targets are drafts from the Placecom session, not rules. The curve is one senior&apos;s real LeetCode count, estimated per semester. Count matters less than finishing a sheet, but it is an honest first check.
      </p>
      <div className="mt-8"><Game /></div>
    </main>
  );
}
