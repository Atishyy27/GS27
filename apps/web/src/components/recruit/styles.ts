// Shared by server and client components (kept out of the "use client" file on purpose).
export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

export const input =
  "w-full rounded-xl border border-white/15 bg-card px-3 py-2 text-fg placeholder:text-faint focus:border-white/40 focus:outline-none";
export const label = "flex flex-col gap-1.5 text-sm text-dim";
export const card = "rounded-2xl border border-white/10 bg-card p-5";
export const chip = "rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-dim";
