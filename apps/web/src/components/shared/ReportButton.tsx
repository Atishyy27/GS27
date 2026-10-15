"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { targetType: "post" | "comment" | "resource" | "profile"; targetId: string | number; signedIn: boolean };

export default function ReportButton({ targetType, targetId, signedIn }: Props) {
  const [done, setDone] = useState(false);
  async function report() {
    if (!signedIn) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    const reason = prompt("Why are you reporting this? (harassment, spam, copyright, wrong file...)");
    if (!reason || reason.trim().length < 3) return;
    const { error } = await createClient().from("reports").insert({ target_type: targetType, target_id: String(targetId), reason: reason.trim() });
    if (error && !error.message.includes("duplicate")) { alert(error.message); return; }
    setDone(true);
  }
  return done
    ? <span className="text-xs text-faint">reported</span>
    : <button onClick={report} className="text-xs text-faint hover:text-accent">report</button>;
}
