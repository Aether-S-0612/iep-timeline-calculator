// Cloudflare Pages adapter for lib/unlock-core.js. Env: GUMROAD_PRODUCT_ID (optional override).
import core from "../../lib/unlock-core.js";

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const out = await core.checkLicense(await request.text(), env.GUMROAD_PRODUCT_ID);
  return json(out.status, out.body);
}

export async function onRequest() {
  return json(405, { ok: false, error: "Use POST" });
}
