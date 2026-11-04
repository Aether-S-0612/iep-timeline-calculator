// Checks a Lemon Squeezy license key server-side (the License API needs no secret,
// but calling it from here avoids browser CORS limits and lets us pin the store).
// Env: LS_STORE_ID (optional) — reject keys from any other store.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const key = String(body.key || "").trim();
  if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) return res.status(400).json({ ok: false, error: "That doesn't look like a license key." });
  try {
    const r = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: key }).toString(),
    });
    const data = await r.json();
    const store = process.env.LS_STORE_ID;
    const sameStore = !store || String(data && data.meta && data.meta.store_id) === String(store);
    if (data && data.valid && sameStore) return res.status(200).json({ ok: true });
    return res.status(200).json({ ok: false, error: "We couldn't find that key. Check your receipt email, or contact us." });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Couldn't reach the payment service. Please try again in a minute." });
  }
};
