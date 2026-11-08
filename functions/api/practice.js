// Cloudflare Pages adapter for lib/practice-core.js.
// Env: ANTHROPIC_API_KEY (required, set as a secret), PRACTICE_MODEL (optional).
import Anthropic from "@anthropic-ai/sdk";
import core from "../../lib/practice-core.js";

const allow = core.makeLimiter(6, 120);
let client;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json(503, { ok: false, error: "Practice isn't switched on yet." });
  const url = new URL(request.url);
  if (!core.originOk(request.headers.get("Origin"), url.host)) return json(403, { ok: false, error: "Not allowed." });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!allow(ip)) return json(429, { ok: false, error: "That's a lot of practice in a short time. Take a short break and try again." });
  client = client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 30000 });
  const out = await core.handlePractice(await request.text(), (p) => client.messages.create(p), { model: env.PRACTICE_MODEL });
  return json(out.status, out.body);
}

export async function onRequest() {
  return json(405, { ok: false, error: "Use POST" });
}
