// Speaker check: the deck asks for the passcode once and keeps it for the tab.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {}
  const ok = Boolean(process.env.SPEAKER_KEY) && body.key === process.env.SPEAKER_KEY;
  return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 403, headers: { "content-type": "application/json" } });
}
