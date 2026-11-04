// Builds the static site into public/. Run: SITE_URL=https://your-domain node scripts/build.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public");
// Paid letter. live=false hides it unless the URL has ?preview. checkoutUrl is the payment link.
// checkoutLive=false: the buy button only works with ?preview in the URL (store is still in test mode).
const PAYWALL = {
  live: true,
  checkoutLive: false,
  price: "$12",
  checkoutUrl: process.env.CHECKOUT_URL || "https://iepdeadlines.lemonsqueezy.com/checkout/buy/5521c769-2346-4182-a823-802108757d06",
};
const SITE = (process.env.SITE_URL || "https://www.iepdeadlines.com").replace(/\/$/, "");
const SITE_NAME = "IEP Timeline Calculator";
const STATES = require(path.join(ROOT, "src", "states.js"));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function layout({ title, description, canonical, body, head = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
${head}
</head>
<body>
<header class="site"><div class="wrap">
<a class="brand" href="/">${SITE_NAME}</a>
<nav>${Object.values(STATES).map((s) => `<a href="/${s.slug}/">${s.name}</a>`).join("")}<a href="/about/">About</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
Estimates only, not legal advice. Deadlines depend on your district's calendar and on facts this tool cannot see. Always confirm with your school district or state education agency. <a href="/about/">Sources and method</a>.
<br><a href="/terms/">Terms</a> &middot; <a href="/privacy/">Privacy</a> &middot; <a href="/refunds/">Refunds</a>
</div></footer>
</body>
</html>
`;
}

function statePage(code, s) {
  const title = `${s.name} IEP Timeline Calculator (${new Date(s.lastChecked).getUTCFullYear()}) – Evaluation & IEP Deadlines`;
  const description = `Free ${s.name} special education timeline calculator. Enter the consent date to get the evaluation, IEP meeting, annual review and reevaluation deadlines, with the regulation for each.`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: s.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${s.name} IEP Timeline Calculator`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: `${SITE}/${s.slug}/`,
  };
  const cfg = { code, name: s.name, years: s.years, closures: s.closures };
  const body = `
<section class="hero">
<p class="eyebrow">${esc(s.name)} IEP Timeline Calculator</p>
<h1>When does the school have to act?</h1>
<p class="hero-text">Waiting on the school after you ask for an evaluation can feel like nothing is happening. You have rights, and the school has deadlines. Tell us the day the school got your signed consent, and we'll show you exactly when each step has to happen.</p>
</section>

<form id="calc-form" class="card" autocomplete="off">
  <label for="consent">When did the school receive your signed consent form?<span class="hint">Not sure? Use the day you handed it in or emailed it. For school-age children (kindergarten through age 21). Preschool (ages 3–5) and Early Intervention (under 3) follow different timelines.</span></label>
  <input type="date" id="consent" required>
  ${s.hasIntellectualDisability ? `<label class="check"><input type="checkbox" id="id-box"> My child has an intellectual disability (reevaluated every 2 years)</label>` : ""}
  <details>
    <summary>Adjust the school calendar (recommended)</summary>
    <p class="lead">School-day deadlines depend on your district's calendar. These are typical example dates. Replace them with your district's dates for an accurate result.</p>
    <div class="grid2">
      <div><label for="y1-first">This school year: first day</label><input type="date" id="y1-first"></div>
      <div><label for="y1-last">This school year: last day</label><input type="date" id="y1-last"></div>
      <div><label for="y2-first">Next school year: first day</label><input type="date" id="y2-first"></div>
      <div><label for="y2-last">Next school year: last day</label><input type="date" id="y2-last"></div>
    </div>
    <label for="closures">Days school is closed <span class="hint">We filled in typical US school holidays, so most parents can leave this as it is. If you have your district's calendar (search "[your district] school calendar"), change the dates to match. One date per line, like 2026-11-26, or a range like 2026-12-23 to 2027-01-01. Anything after # is just a note.</span></label>
    <textarea id="closures" spellcheck="false"></textarea>
    <label for="iep-date">Actual IEP meeting date <span class="hint">optional, to count annual review and reevaluation from it</span></label>
    <input type="date" id="iep-date">
  </details>
</form>

<section id="results" class="card" hidden aria-live="polite">
  <h2 style="margin-top:0">Here's your timeline</h2>
  <p class="lead">These are the latest dates the rules allow. The school can, and often should, move sooner. School-day counts use a typical US school calendar unless you enter your own under "Adjust the school calendar", so they may be off by a few school days.</p>
  <ol id="result-rows" class="timeline"></ol>
  <div class="actions">
    <button type="button" id="ics">Add these dates to my calendar</button>
    <button type="button" id="print" class="ghost">Print or save as PDF</button>
  </div>
  <p class="small">Calendar reminders arrive 7 days before each date, so nothing sneaks up on you.</p>
</section>

<section id="letter" class="card letter" hidden>
  <p class="eyebrow" id="letter-eyebrow"></p>
  <h2 style="margin-top:4px">Your letter to the school, already written</h2>
  <p class="lead">We filled in your dates and the exact rule. Add names if you like. Nothing you type leaves your browser.</p>
  <div class="grid2">
    <div><label for="l-child">Child's first name</label><input type="text" id="l-child" maxlength="40"></div>
    <div><label for="l-parent">Your name</label><input type="text" id="l-parent" maxlength="60"></div>
    <div><label for="l-school">School <span class="hint">optional</span></label><input type="text" id="l-school" maxlength="80"></div>
    <div><label for="l-recipient">Addressed to <span class="hint">optional</span></label><input type="text" id="l-recipient" maxlength="80" placeholder="Director of Special Education"></div>
  </div>
  <div class="letter-box">
    <div class="letter-subject"><span>Subject:</span> <strong id="letter-subject"></strong></div>
    <div id="letter-free"></div>
    <div id="letter-rest"></div>
    <div class="letter-lock" id="letter-lock">
      <div class="letter-fake" aria-hidden="true"></div>
      <div class="lock-card">
        <p class="lock-title">Unlock the full letter</p>
        <ul>
          <li>The rest of your letter, with what to ask for and by when</li>
          <li>Send it from your own email in one click, so you keep the record</li>
          <li>IEP meeting prep: a checklist and questions to ask</li>
        </ul>
        <a class="button" id="buy" href="#">Unlock for <span class="price"></span></a>
        <p class="small">One-time payment. 14-day money-back guarantee.</p>
        <details class="have-key">
          <summary>Already bought? Enter your key</summary>
          <form class="key-form" data-unlock>
            <input type="text" name="key" placeholder="License key from your receipt email" autocomplete="off" spellcheck="false">
            <button type="submit">Unlock</button>
            <p class="small key-msg" role="status"></p>
          </form>
        </details>
      </div>
    </div>
  </div>
  <div class="actions" id="letter-actions" hidden>
    <a class="button" id="send-gmail" target="_blank" rel="noopener">Send with Gmail</a>
    <a class="button ghost" id="send-mail">Send with my email app</a>
    <button type="button" class="ghost" id="copy-letter">Copy letter</button>
  </div>
  <p class="small" id="letter-edit-note" hidden>Something already happened, like you got the report? Edit those lines in your email before sending.</p>
  <p class="small" id="letter-sent-note" hidden>Your email app opens with everything filled in. Add the school's email address and press send. Keep the sent email as your record.</p>
  <div id="prep-pack" hidden></div>
</section>

<section class="card next-steps">
  <h2 style="margin-top:0">What you can do now</h2>
  <ul>
    <li><strong>Keep it in writing.</strong> Send requests and questions by email so there's a dated record.</li>
    <li><strong>Ask for the plan.</strong> It's fair to ask the school, "What are the next steps, and when?"</li>
    <li><strong>If a date passes,</strong> send a short, polite email noting the deadline and asking when it will happen.</li>
    <li><strong>You don't have to do this alone.</strong> Every state has a free Parent Training and Information Center. <a href="https://www.parentcenterhub.org/find-your-center/" target="_blank" rel="noopener">Find yours</a>.</li>
  </ul>
  <p class="small">Case manager or school psychologist? The same dates work for your caseload. Add each student's timeline to your calendar.</p>
</section>

<section class="rules">
<h2>${esc(s.name)} special education timelines</h2>
<p>${esc(s.intro)}</p>
<table>
<thead><tr><th>Step</th><th>Deadline</th><th>Rule</th></tr></thead>
<tbody>
${s.rules.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("\n")}
</tbody>
</table>
<p class="lead" style="margin-top:8px">Rules last checked against the regulation text on ${esc(s.lastChecked)}.</p>
</section>

<section class="faq">
<h2>Common questions</h2>
${s.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("\n")}
</section>

<script>window.STATE_CONFIG = ${JSON.stringify(cfg)};</script>
<script>window.PAYWALL = ${JSON.stringify(PAYWALL)};</script>
<script src="/calc.js"></script>
<script src="/letter.js"></script>
<script src="/app.js"></script>
`;
  return layout({
    title,
    description,
    canonical: `/${s.slug}/`,
    body,
    head: `<script type="application/ld+json">${JSON.stringify(appLd)}</script>\n<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`,
  });
}

function homePage() {
  const body = `
<h1>When does the school have to act?</h1>
<section class="hero">
<p class="hero-text">Asked the school to evaluate your child and now you're waiting? The law gives the school deadlines. Pick your state, enter the day the school got your signed consent, and see exactly when each step has to happen, with the rule behind every date. Free, no sign-up, and nothing you type leaves your browser.</p>
</section>
<div class="states">
${Object.values(STATES)
  .map((s) => `<a class="card" href="/${s.slug}/"><strong>${esc(s.name)}</strong><br><span class="lead">Evaluation, IEP meeting, annual review and reevaluation dates</span></a>`)
  .join("\n")}
</div>
<h2>Who this is for</h2>
<p>Parents who want to know when the school has to finish an evaluation or hold the IEP meeting, and case managers, school psychologists and special education teachers who track many students' deadlines.</p>
<h2>Why a calculator?</h2>
<p>Some deadlines are counted in calendar days and others in school days, and some states pause the clock over summer. Counting school days by hand around holidays and breaks is easy to get wrong. This calculator applies each state's rule to the calendar you enter and shows the regulation for every date so you can check it.</p>
<p class="notice">More states are coming soon.</p>
`;
  return layout({
    title: "IEP Timeline Calculator – Special Education Evaluation & IEP Deadlines by State",
    description: "Free calculator for special education deadlines by state: initial evaluation, IEP meeting, services start, annual review and reevaluation, with the regulation for each date.",
    canonical: "/",
    body,
  });
}

function aboutPage() {
  const body = `
<h1>About this calculator</h1>
<p>This free tool turns each state's special education timeline rules into dates. It is built and maintained independently. It is not affiliated with any school district or state education agency.</p>
<h2>How the dates are calculated</h2>
<ul>
<li><strong>Calendar days</strong> count every day, including weekends and holidays.</li>
<li><strong>School days</strong> count weekdays inside the school year that are not on the closure list you entered.</li>
<li>The day consent is received is day 0. The deadline is the last day the rule allows.</li>
<li>Annual review and reevaluation dates are counted from the IEP date you enter, or from the latest allowed IEP date if you leave it blank.</li>
</ul>
<h2>Sources</h2>
<ul>
<li><a href="https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4">New York: 8 NYCRR §200.4</a></li>
<li><a href="https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-123">Pennsylvania: 22 Pa. Code §14.123</a>, <a href="https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-124">§14.124</a>, <a href="https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-131">§14.131</a></li>
<li><a href="https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-23-SS-226.110">Illinois: 23 Ill. Adm. Code §226.110</a></li>
<li>Federal: <a href="https://www.law.cornell.edu/cfr/text/34/300.303">34 CFR §300.303</a>, <a href="https://www.law.cornell.edu/cfr/text/34/300.323">§300.323</a>, <a href="https://www.law.cornell.edu/cfr/text/34/300.324">§300.324</a></li>
</ul>
<h2>Limits</h2>
<p>Results are estimates. They are only as accurate as the school calendar you enter, and they do not cover every exception in the regulations (for example, a student who changes districts during an evaluation). This is not legal advice. Confirm deadlines with your district, your state's parent training center, or an advocate.</p>
<h2>Privacy</h2>
<p>Everything is calculated in your browser. Nothing you enter is sent to or stored on a server.</p>
`;
  return layout({
    title: "About the IEP Timeline Calculator – Method, Sources and Limits",
    description: "How the IEP Timeline Calculator counts calendar days and school days, the regulations it uses for each state, and its limits.",
    canonical: "/about/",
    body,
  });
}

// Contact address shown on the legal pages. Empty = point buyers to their receipt email.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "iepdeadlines@gmail.com";
const UPDATED = "November 4, 2026";
function contactLine() {
  return CONTACT_EMAIL
    ? `Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`
    : "Reply to the receipt email you received when you bought, and the message will reach us.";
}

function legalPage(slug, title, description, inner) {
  return layout({ title: title + " – " + SITE_NAME, description, canonical: "/" + slug + "/", body: `<h1>${title}</h1>\n<p class="small">Last updated ${UPDATED}</p>\n${inner}` });
}

function termsPage() {
  return legalPage("terms", "Terms of Service", "Terms for using the free IEP Timeline Calculator and buying its printable templates.", `
<h2>The free calculator</h2>
<p>The calculator is free to use. It gives estimates based on published regulations and the school calendar you enter. It is general information, not legal advice, and using it does not create an attorney-client or advocate relationship. Always confirm deadlines with your school district, your state education agency, or a qualified advocate.</p>
<h2>Paid products</h2>
<p>Paid products are digital downloads, such as printable letter templates and checklists. Orders are processed by our online reseller, Lemon Squeezy, which is the merchant of record and handles payment, sales tax and receipts. Their <a href="https://www.lemonsqueezy.com/buyer-terms">buyer terms</a> also apply to your purchase.</p>
<p>After purchase you may use the templates for yourself and your own family. Please do not resell or redistribute them.</p>
<h2>No guarantee of outcome</h2>
<p>Templates help you communicate clearly with your school. We cannot promise any particular response or result from a school or agency.</p>
<h2>Changes</h2>
<p>We may update the calculator, products and these terms. The date at the top shows the latest version.</p>
<h2>Contact</h2>
<p>${contactLine()}</p>`);
}

function privacyPage() {
  return legalPage("privacy", "Privacy Policy", "What the IEP Timeline Calculator collects (almost nothing) and how purchases are handled.", `
<h2>The calculator</h2>
<p>Everything you type into the calculator, including dates and school calendars, is processed in your own browser. It is not sent to or stored on our servers.</p>
<h2>Hosting and fonts</h2>
<p>The site is hosted on Vercel, which keeps standard server logs (such as IP address and pages requested) for security and operations. Fonts are loaded from Google Fonts, which receives your IP address when the page loads.</p>
<h2>Purchases</h2>
<p>If you buy a product, Lemon Squeezy collects your name, email and payment details to process the order and send your download. We receive your name, email and order details so we can provide support and refunds. We do not receive your full card number. See the <a href="https://www.lemonsqueezy.com/privacy">Lemon Squeezy privacy policy</a>.</p>
<h2>What we do not do</h2>
<p>We do not sell personal information, and we do not ask for information about your child's disability or records.</p>
<h2>Your choices</h2>
<p>You can ask us to delete the order information we hold about you. ${contactLine()}</p>`);
}

function refundsPage() {
  return legalPage("refunds", "Refund Policy", "Refund policy for printable templates sold on the IEP Timeline Calculator.", `
<p>If a template is not useful to you, ask for a refund within 14 days of purchase and you will get your money back in full. No explanation is needed.</p>
<p>Refunds go back to your original payment method through Lemon Squeezy. Depending on your bank, they usually appear within 5 to 10 business days.</p>
<h2>How to ask</h2>
<p>${contactLine()} Include the email address you used to buy.</p>`);
}

function unlockPage() {
  const body = `
<h1>Thank you! Let's unlock your letter</h1>
<p class="lead">Your receipt email has a <strong>license key</strong>. Paste it below. This browser will remember it, so you only do this once per device.</p>
<form class="card key-form" data-unlock data-after="back">
  <label for="unlock-key">License key</label>
  <input type="text" id="unlock-key" name="key" autocomplete="off" spellcheck="false">
  <div class="actions"><button type="submit">Unlock my letter</button></div>
  <p class="small key-msg" role="status"></p>
</form>
<p class="small">Can't find the email? Check spam for a message from Lemon Squeezy, or write to ${CONTACT_EMAIL || "us"}.</p>
<script src="/app.js"></script>
`;
  return layout({ title: "Unlock your letter – " + SITE_NAME, description: "Enter your license key to unlock your follow-up letter and IEP meeting prep.", canonical: "/unlock/", body, head: '<meta name="robots" content="noindex">' });
}

function write(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

fs.rmSync(OUT, { recursive: true, force: true });
write("index.html", homePage());
write("about/index.html", aboutPage());
write("terms/index.html", termsPage());
write("privacy/index.html", privacyPage());
write("refunds/index.html", refundsPage());
write("unlock/index.html", unlockPage());
for (const [code, s] of Object.entries(STATES)) write(`${s.slug}/index.html`, statePage(code, s));
for (const f of ["calc.js", "letter.js", "app.js", "style.css"]) fs.copyFileSync(path.join(ROOT, "src", f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(ROOT, "static"))) fs.copyFileSync(path.join(ROOT, "static", f), path.join(OUT, f));

const urls = ["/", "/about/", "/terms/", "/privacy/", "/refunds/", ...Object.values(STATES).map((s) => `/${s.slug}/`)];
const today = new Date().toISOString().slice(0, 10);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log("Built", urls.length, "pages for", SITE);
