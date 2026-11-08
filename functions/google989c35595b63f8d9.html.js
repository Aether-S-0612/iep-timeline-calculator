// Search Console HTML-file verification. Cloudflare Pages would otherwise redirect
// /google989c35595b63f8d9.html to /google989c35595b63f8d9, and the check wants the exact URL.
export function onRequest() {
  return new Response("google-site-verification: google989c35595b63f8d9.html", { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
