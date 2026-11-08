// Vercel adapter for lib/unlock-core.js. Env: LS_STORE_ID (optional).
const { checkLicense } = require("../lib/unlock-core.js");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });
  const out = await checkLicense(req.body, process.env.LS_STORE_ID);
  return res.status(out.status).json(out.body);
};
