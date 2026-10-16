"use client";

import { useActionState, useState, useTransition } from "react";
import type { CellActionState } from "./shared";

/** A form bound to a Server Function; shows its error or message under the fields. */
export function ActionForm({ action, children, className }: {
  action: (s: CellActionState, f: FormData) => Promise<CellActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, run, pending] = useActionState<CellActionState, FormData>(action, undefined);
  return (
    <form action={run} className={className}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {state?.error && <p className="mt-2 text-sm text-accent">{state.error}</p>}
      {state?.message && <p className="mt-2 text-sm text-good">{state.message}</p>}
    </form>
  );
}

/** A button that calls a bound Server Function and shows its error, if any. */
export function RunButton({ run, children, className, confirm }: {
  run: () => Promise<CellActionState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await run();
            setError(r?.error ?? null);
          });
        }}
        className={className ?? "rounded-full border border-white/15 px-3 py-1 text-sm hover:border-white/40 disabled:opacity-50"}
      >
        {pending ? "..." : children}
      </button>
      {error && <span className="mt-1 text-xs text-accent">{error}</span>}
    </span>
  );
}

export const input = "w-full rounded-xl border border-white/15 bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-white/40";
export const label = "flex flex-col gap-1.5 text-xs font-semibold text-dim";
export const primary = "rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg disabled:opacity-50";
