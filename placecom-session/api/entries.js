// Shared live state for the session deck: leaderboard, goals, tier votes and the crowd games
// (guess, hilo, ask board with votes and answered marks, one-word cloud).
// Each entry is one empty blob whose pathname carries the entry itself (base64url JSON), so a single
// list() call returns everything: no per-entry reads, which keeps us inside the Hobby blob-ops budget.
// Nothing about the sender is stored (no IP, no email). The speaker deletes entries with SPEAKER_KEY.
import { list, put, del } from "@vercel/blob";

const KINDS = { leaderboard: 300, goals: 400, tier: 2000, guess: 3000, reveal: 50, hilo: 5000, ask: 300, askvote: 3000, askmark: 300, word: 1000, card: 600 };
// kinds only the speaker may POST (header x-speaker-key)
const SPEAKER_POST = new Set(["reveal", "askmark"]);
const SLUG = /^[a-z0-9-]{1,24}$/;
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
  if (kind === "guess") {
    const q = clean(d.q, 24);
    const n = Math.floor(Number(d.n));
    const nick = clean(d.nick, 24);
    return SLUG.test(q) && Number.isFinite(n) && n >= 0 && n <= 100000 ? { q, n, nick } : null;
  }
  if (kind === "reveal") {
    // the speaker sends the answer with the reveal, so phones learn it only at reveal time
    const q = clean(d.q, 24);
    const n = Math.floor(Number(d.n));
    return SLUG.test(q) && Number.isFinite(n) && n >= 0 && n <= 100000 ? { q, n } : null;
  }
  if (kind === "hilo") {
    const pair = clean(d.pair, 24);
    const pick = ["a", "b"].includes(d.pick) ? d.pick : null;
    return SLUG.test(pair) && pick ? { pair, pick } : null;
  }
  if (kind === "ask") {
    const text = clean(d.text, 200);
    const nick = clean(d.nick, 24);
    return text.length >= 3 ? { text, nick } : null;
  }
  if (kind === "askvote" || kind === "askmark") {
    const qid = clean(d.qid, 40);
    if (!/^\d{10,16}\.[a-z0-9]{1,12}$/.test(qid)) return null;
    if (kind === "askvote") return { qid };
    return ["answered", "open"].includes(d.state) ? { qid, state: d.state } : null;
  }
  if (kind === "card") {
    // "My numbers": one per device (cid); a resubmit is a new entry and readers keep the newest per cid
    const int = (v, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
    const cid = clean(d.cid, 24);
    const batch = [2028, 2029].includes(Number(d.batch)) ? Number(d.batch) : null;
    const branch = ["CSE", "IT", "ECE", "EI", "EE", "Mech", "Civil", "IP", "BME", "Other"].includes(d.branch) ? d.branch : null;
    if (!/^[a-z0-9]{6,24}$/.test(cid) || !batch || !branch) return null;
    return {
      cid, batch, branch, nick: clean(d.nick, 24), show: d.show === true,
      lc: int(d.lc, 5000), cf: clean(d.cf, 24).replace(/[^A-Za-z0-9_.-]/g, ""), cc: int(d.cc, 4000),
      mails: int(d.mails, 5000), dms: int(d.dms, 5000), interns: int(d.interns, 20), projects: int(d.projects, 50),
      doubt: clean(d.doubt, 200), goal: clean(d.goal, 120),
    };
  }
  if (kind === "word") {
    const w = clean(d.w, 24).toLowerCase().replace(/[^a-z\u0900-\u097f-]/g, "");
    return w.length >= 2 ? { w } : null;
  }
  return null;
}
const isSpeaker = (request) => Boolean(process.env.SPEAKER_KEY) && request.headers.get("x-speaker-key") === process.env.SPEAKER_KEY;

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
  if (SPEAKER_POST.has(kind) && !isSpeaker(request)) return json({ error: "speaker only" }, 403);
  const data = validate(kind, body.data || {});
  if (!data) return json({ error: "missing fields" }, 400);
  const id = Math.random().toString(36).slice(2, 10);
  const enc = Buffer.from(JSON.stringify(data)).toString("base64url");
  // the entry lives in the blob pathname; keep it well under the 1,024-byte object-key limit (Hindi text is 3 bytes a letter)
  if (enc.length > 880) return json({ error: "too long: shorten the text fields" }, 400);
  await put(`live/${kind}/${Date.now()}.${id}.${enc}`, "1", { access: "private", addRandomSuffix: false, contentType: "text/plain" });
  return json({ ok: true });
}

export async function DELETE(request) {
  if (!isSpeaker(request)) return json({ error: "speaker only" }, 403);
  const u = new URL(request.url);
  const kind = u.searchParams.get("kind");
  const id = u.searchParams.get("id"); // "<ts>.<id>" or "all"
  if (!KINDS[kind]) return json({ error: "bad kind" }, 400);
  const r = await list({ prefix: `live/${kind}/`, limit: 1000 });
  const doomed = r.blobs.filter((b) => id === "all" || b.pathname.split("/").pop().startsWith(id + ".")).map((b) => b.url);
  if (doomed.length) await del(doomed);
  return json({ ok: true, deleted: doomed.length });
}
