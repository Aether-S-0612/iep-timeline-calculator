// Vercel adapter for lib/unlock-core.js. Env: GUMROAD_PRODUCT_ID (optional override).
const { checkLicense } = require("../lib/unlock-core.js");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });
  const out = await checkLicense(req.body, process.env.GUMROAD_PRODUCT_ID);
  return res.status(out.status).json(out.body);
};
