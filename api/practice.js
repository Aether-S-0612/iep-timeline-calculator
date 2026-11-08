// Vercel adapter for lib/practice-core.js.
// Env: ANTHROPIC_API_KEY (required), PRACTICE_MODEL (optional, default claude-haiku-5-5).
const Anthropic = require("@anthropic-ai/sdk");
const core = require("../lib/practice-core.js");

const allow = core.makeLimiter(6, 120);
let client;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ ok: false, error: "Practice isn't switched on yet." });
  if (!core.originOk(req.headers.origin, req.headers.host)) return res.status(403).json({ ok: false, error: "Not allowed." });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (!allow(ip)) return res.status(429).json({ ok: false, error: "That's a lot of practice in a short time. Take a short break and try again." });
  client = client || new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 30000 });
  const out = await core.handlePractice(req.body, (p) => client.messages.create(p), { model: process.env.PRACTICE_MODEL });
  return res.status(out.status).json(out.body);
};
