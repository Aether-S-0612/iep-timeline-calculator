// Platform-neutral license check. Adapters: api/unlock.js (Vercel), functions/api/unlock.js (Cloudflare Pages).
// Checks a Lemon Squeezy license key server-side (the License API needs no secret,
// but calling it from here avoids browser CORS limits and lets us pin the store).
// storeId (optional): reject keys from any other store.
async function checkLicense(body, storeId, fetchImpl) {
  const f = fetchImpl || fetch;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const key = String(body.key || "").trim();
  if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) return { status: 400, body: { ok: false, error: "That doesn't look like a license key." } };
  try {
    const r = await f("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: key }).toString(),
    });
    const data = await r.json();
    const sameStore = !storeId || String(data && data.meta && data.meta.store_id) === String(storeId);
    if (data && data.valid && sameStore) return { status: 200, body: { ok: true } };
    return { status: 200, body: { ok: false, error: "We couldn't find that key. Check your receipt email, or contact us." } };
  } catch (e) {
    return { status: 502, body: { ok: false, error: "Couldn't reach the payment service. Please try again in a minute." } };
  }
}

module.exports = { checkLicense };
