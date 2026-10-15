"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "./types";

type Props = {
  run: () => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
};

/** A button that calls a bound Server Function and shows its error, if any. */
export default function ActionButton({ run, children, className, confirm }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const res = await run();
            if (res?.error) setError(res.error);
          });
        }}
        className={(className ?? "rounded-full border border-white/20 px-3 py-1 text-sm hover:border-white/50") + " disabled:opacity-50"}
      >
        {children}
      </button>
      {error && <span className="mt-1 max-w-xs text-xs text-accent">{error}</span>}
    </span>
  );
}
