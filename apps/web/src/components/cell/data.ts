import { getCollege, type College } from "@/lib/college";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import { getViewer, type Viewer } from "@/lib/viewer";

export * from "./shared";

export type CellContext =
  | { configured: false }
  | {
      configured: true;
      college: College;
      viewer: Viewer;
      supabase: Awaited<ReturnType<typeof createClient>>;
      isCell: boolean;
      isHead: boolean;
    };

/** The college in view, the viewer, and whether they run that college's cell. */
export async function cellContext(): Promise<CellContext> {
  if (!hasSupabase) return { configured: false };
  const [college, viewer, supabase] = await Promise.all([getCollege(), getViewer(), createClient()]);
  if (!viewer) return { configured: true, college, viewer, supabase, isCell: false, isHead: false };
  const [cell, head] = await Promise.all([
    supabase.rpc("is_cell_of", { c: college.id }),
    supabase.rpc("is_cell_head_of", { c: college.id }),
  ]);
  return { configured: true, college, viewer, supabase, isCell: cell.data === true, isHead: head.data === true };
}
