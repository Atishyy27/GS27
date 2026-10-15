"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RESOURCE_KINDS, type ResourceKind } from "@/lib/catalog";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = [
  "application/pdf", "image/png", "image/jpeg", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed", "text/plain",
];

function safeName(n: string) {
  return n.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";
}

export default function UploadForm({ subjectId, userId }: { subjectId: number; userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const kind = String(f.get("kind")) as ResourceKind;
    const title = String(f.get("title") ?? "").trim();
    const description = String(f.get("description") ?? "").trim() || null;
    const yearRaw = String(f.get("year") ?? "").trim();
    const year = yearRaw ? Number(yearRaw) : null;
    const anonymous = f.get("anonymous") === "on";
    if (title.length < 3) return setMsg({ err: "Title needs at least 3 characters." });
    if (year !== null && !(year >= 2000 && year <= 2100)) return setMsg({ err: "Year looks wrong." });

    const supabase = createClient();
    setBusy(true); setMsg({});
    let file_path: string | null = null;
    let url: string | null = null;
    if (mode === "file") {
      const file = f.get("file");
      if (!(file instanceof File) || file.size === 0) { setBusy(false); return setMsg({ err: "Pick a file." }); }
      if (file.size > MAX_BYTES) { setBusy(false); return setMsg({ err: "File is over 25 MB." }); }
      if (file.type && !ALLOWED.includes(file.type)) { setBusy(false); return setMsg({ err: "Only PDF, images, DOCX, PPTX, ZIP or TXT." }); }
      const path = `${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const up = await supabase.storage.from("library").upload(path, file, { contentType: file.type || undefined });
      if (up.error) { setBusy(false); return setMsg({ err: up.error.message }); }
      file_path = path;
    } else {
      url = String(f.get("url") ?? "").trim();
      if (!/^https?:\/\/\S+$/i.test(url)) { setBusy(false); return setMsg({ err: "Enter a full link starting with http." }); }
    }

    const { error } = await supabase.from("resources").insert({ subject_id: subjectId, kind, title, description, year, file_path, url, anonymous });
    if (error) {
      if (file_path) await supabase.storage.from("library").remove([file_path]);
      setBusy(false);
      return setMsg({ err: error.message });
    }
    setBusy(false);
    setMsg({ ok: "Uploaded. Thanks for adding to the library." });
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-bg">
        + Add a resource
      </button>
    );
  }

  const input = "rounded-lg border border-white/15 bg-bg px-3 py-2 text-sm text-fg";
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Add a resource</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-dim hover:text-fg" aria-label="Close">✕</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr_100px]">
        <label className="flex flex-col gap-1 text-xs text-dim">Type
          <select name="kind" defaultValue="notes" className={input}>
            {RESOURCE_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">Title
          <input name="title" required minLength={3} maxLength={140} placeholder="Unit 3 handwritten notes" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">Year
          <input name="year" type="number" min={2000} max={2100} placeholder="2025" className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-dim">Description (optional)
        <textarea name="description" maxLength={1000} rows={2} className={input} />
      </label>
      <div className="flex gap-2 text-sm">
        {(["file", "url"] as const).map((m) => (
          <button type="button" key={m} onClick={() => setMode(m)}
            className={`rounded-full border px-3 py-1 ${mode === m ? "border-accent text-accent" : "border-white/15 text-dim"}`}>
            {m === "file" ? "Upload file" : "Paste link"}
          </button>
        ))}
      </div>
      {mode === "file" ? (
        <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.zip,.txt" className="text-sm text-dim" />
      ) : (
        <input name="url" type="url" placeholder="https://drive.google.com/..." className={input} />
      )}
      <p className="text-xs text-faint">Max 25 MB. Share your own notes, papers and solutions. No pirated books.</p>
      <label className="flex items-center gap-2 text-sm text-dim">
        <input type="checkbox" name="anonymous" /> Post as anonymous (hides even your handle)
      </label>
      <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-50">
        {busy ? "Uploading..." : "Add to library"}
      </button>
      {msg.err && <p className="text-sm text-accent">{msg.err}</p>}
      {msg.ok && <p className="text-sm text-good">{msg.ok}</p>}
    </form>
  );
}
