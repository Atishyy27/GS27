// Shared live state for the session deck: leaderboard rows, goals and tier votes.
// Each entry is one empty blob whose pathname carries the entry itself (base64url JSON), so a single
// list() call returns everything: no per-entry reads, which keeps us inside the Hobby blob-ops budget.
// Nothing about the sender is stored (no IP, no email). The speaker deletes entries with SPEAKER_KEY.
import { list, put, del } from "@vercel/blob";

const KINDS = { leaderboard: 300, goals: 400, tier: 2000 };
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

function validate(kind, d) {
  if (kind === "leaderboard") {
    const nick = clean(d.nick, 24);
    const lc = Math.max(0, Math.min(5000, Math.floor(Number(d.lc) || 0)));
    const cf = clean(d.cf, 24).replace(/[^A-Za-z0-9_.-]/g, "");
    return nick ? { nick, lc, cf } : null;
  }
  if (kind === "goals") {
    const when = ["6m", "12m", "2y"].includes(d.when) ? d.when : null;
    const text = clean(d.text, 120);
    const nick = clean(d.nick, 24);
    return when && text ? { when, text, nick } : null;
  }
  if (kind === "tier") {
    const tile = clean(d.tile, 40);
    const tier = ["S", "A", "B", "C", "D", "F"].includes(d.tier) ? d.tier : null;
    return tile && tier ? { tile, tier } : null;
  }
  return null;
}

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });

export async function GET(request) {
  const kind = new URL(request.url).searchParams.get("kind");
  if (!KINDS[kind]) return json({ error: "bad kind" }, 400);
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: `live/${kind}/`, cursor, limit: 1000 });
    for (const b of r.blobs) {
      const name = b.pathname.split("/").pop();
      try {
        const [ts, id, data] = name.split(".");
        out.push({ id: `${ts}.${id}`, ts: Number(ts), ...JSON.parse(Buffer.from(data, "base64url").toString()) });
      } catch {}
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  out.sort((a, b) => a.ts - b.ts);
  // a few seconds of CDN cache: 100 phones polling cost one list() per window, not 100
  return json(out, 200, { "cache-control": "public, s-maxage=8, stale-while-revalidate=20" });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const kind = body?.kind;
  if (!KINDS[kind]) return json({ error: "bad kind" }, 400);
  const data = validate(kind, body.data || {});
  if (!data) return json({ error: "missing fields" }, 400);
  const id = Math.random().toString(36).slice(2, 10);
  const enc = Buffer.from(JSON.stringify(data)).toString("base64url");
  await put(`live/${kind}/${Date.now()}.${id}.${enc}`, "1", { access: "private", addRandomSuffix: false, contentType: "text/plain" });
  return json({ ok: true });
}

export async function DELETE(request) {
  const key = request.headers.get("x-speaker-key");
  if (!process.env.SPEAKER_KEY || key !== process.env.SPEAKER_KEY) return json({ error: "speaker only" }, 403);
  const u = new URL(request.url);
  const kind = u.searchParams.get("kind");
  const id = u.searchParams.get("id"); // "<ts>.<id>" or "all"
  if (!KINDS[kind]) return json({ error: "bad kind" }, 400);
  const r = await list({ prefix: `live/${kind}/`, limit: 1000 });
  const doomed = r.blobs.filter((b) => id === "all" || b.pathname.split("/").pop().startsWith(id + ".")).map((b) => b.url);
  if (doomed.length) await del(doomed);
  return json({ ok: true, deleted: doomed.length });
}
