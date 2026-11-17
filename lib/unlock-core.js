// Platform-neutral license check. Adapters: api/unlock.js (Vercel), functions/api/unlock.js (Cloudflare Pages).
// Checks a Gumroad license key server-side. Gumroad's verify endpoint needs no secret, only the
// product_id (shown in the product's License key block), so the id lives here; GUMROAD_PRODUCT_ID overrides it.
// Calling it from here avoids browser CORS limits and pins the key to our product.
const DEFAULT_PRODUCT_ID = "58i-9s0Ams_C75K_UcfgIA==";

async function checkLicense(body, productId, fetchImpl) {
  const f = fetchImpl || fetch;
  const pid = String(productId || DEFAULT_PRODUCT_ID || "").trim();
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const key = String(body.key || "").trim();
  if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) return { status: 400, body: { ok: false, error: "That doesn't look like a license key." } };
  if (!pid) return { status: 503, body: { ok: false, error: "Unlocking isn't set up yet. Please contact us." } };
  try {
    const r = await f("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ product_id: pid, license_key: key, increment_uses_count: "false" }).toString(),
    });
    let data = null;
    try { data = await r.json(); } catch (e) {}
    const p = (data && data.purchase) || {};
    const revoked = p.refunded || p.chargebacked || p.disputed;
    if (data && data.success === true && !revoked) return { status: 200, body: { ok: true } };
    if (r.status >= 500) throw new Error("upstream " + r.status);
    return { status: 200, body: { ok: false, error: "We couldn't find that key. Check your receipt email, or contact us." } };
  } catch (e) {
    return { status: 502, body: { ok: false, error: "Couldn't reach the payment service. Please try again in a minute." } };
  }
}

module.exports = { checkLicense };
