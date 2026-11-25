import { realSource } from "./real";
import { createMockSource } from "./mock";
import type { DataSource, MockMode } from "./types";

export * from "./types";

const MODES: MockMode[] = ["ok", "empty", "error", "slow"];

/** GS27_MOCK=1 (or ok, empty, error, slow) swaps in fixtures. Unset, which is production, always uses Supabase. */
export function getDataSource(): DataSource {
  const flag = process.env.GS27_MOCK;
  if (!flag) return realSource;
  return createMockSource(MODES.includes(flag as MockMode) ? (flag as MockMode) : "ok");
}

/** Runs a read and turns a failure into a message the page can show, instead of an empty list that looks like "nothing here". */
export async function load<T>(read: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    return { data: await read(), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "failed" };
  }
}
