"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const WORD = "tnp";
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Listens for "tnp" or the Konami code outside inputs; unlocks the hidden T&P suite. */
export default function TnpEgg({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (unlocked) return;
    let typed = "";
    let seq: string[] = [];
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      typed = (typed + (k.length === 1 ? k : "")).slice(-WORD.length);
      seq = [...seq, k].slice(-KONAMI.length);
      if (typed === WORD || seq.join() === KONAMI.join()) {
        document.cookie = "gs27_tnp=1; path=/; max-age=31536000; samesite=lax";
        setToast(true);
        setTimeout(() => setToast(false), 2500);
        router.refresh();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked, router]);
  return toast ? (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-bg shadow-lg">
      T&amp;P suite unlocked
    </div>
  ) : null;
}
