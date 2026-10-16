"use client";

import { useActionState, useEffect, useRef } from "react";

import type { FormState } from "./styles";

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submit: string;
  pendingLabel?: string;
  resetOnOk?: boolean;
  className?: string;
  buttonClassName?: string;
  confirm?: string;
  children?: React.ReactNode;
};

/** A form bound to a server action that shows its error or success message inline. */
export default function ActionForm({ action, submit, pendingLabel, resetOnOk, className, buttonClassName, confirm, children }: Props) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnOk) ref.current?.reset(); }, [state, resetOnOk]);
  return (
    <form ref={ref} action={run} className={className ?? "flex flex-col gap-3"}
      onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending}
          className={buttonClassName ?? "rounded-full bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-50"}>
          {pending ? (pendingLabel ?? "Saving...") : submit}
        </button>
        {state?.error && <span className="text-sm text-accent">{state.error}</span>}
        {state?.ok && state.message && <span className="text-sm text-good">{state.message}</span>}
      </div>
    </form>
  );
}
