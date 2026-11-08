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
<script defer src="/_vercel/insights/script.js"></script>
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
  <div id="progress" class="progress"></div>
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
  <label for="l-to">Send to (email) <span class="hint">optional. Usually the district's Director of Special Education (sometimes called Director of Pupil Services). You can find it on your district's website or ask the school office. Add the principal too, separated by a comma.</span></label>
  <input type="email" id="l-to" maxlength="200" multiple placeholder="name@district.org">
  <fieldset class="letter-modes">
    <legend>Which letter do you need?</legend>
    <label><input type="radio" name="l-mode" id="l-mode-auto" value="auto" checked> <span id="l-mode-auto-label">Confirm the dates</span></label>
    <label><input type="radio" name="l-mode" id="l-mode-escalate" value="escalate"> No reply yet <span class="hint">goes to the superintendent</span></label>
    <label><input type="radio" name="l-mode" id="l-mode-recap" value="recap"> After the IEP meeting</label>
  </fieldset>
  <div id="l-escalate-fields" hidden><label for="l-first-sent">When did you send your first email? <span class="hint">optional. This letter goes one level up: put the superintendent's name in "Addressed to" and their email in "Send to". You can find both on the district website.</span></label><input type="date" id="l-first-sent"></div>
  <div id="l-recap-fields" hidden><label for="l-meeting">Meeting date <span class="hint">optional</span></label><input type="date" id="l-meeting"></div>
  <p class="why-polite" id="why-polite"></p>
  <div class="letter-box">
    <div class="letter-subject"><span>Subject:</span> <strong id="letter-subject"></strong></div>
    <div id="letter-free"></div>
    <div id="letter-rest"></div>
    <div class="letter-lock" id="letter-lock">
      <div class="letter-fake" aria-hidden="true"></div>
      <div class="lock-card">
        <p class="lock-title">Unlock the full letter</p>
        <ul>
          <li>4 letters for every stage: confirm the dates, a date has passed, no reply yet, and after the meeting</li>
          <li>Send them from your own email in one click, so you keep the record</li>
          <li>IEP meeting prep: what to bring, questions to ask, and calm words for when you feel rushed</li>
          <li>Plain-English glossary, and what to do if the school stops answering</li>
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
    <li><strong>If a date passes,</strong> send a short, polite email noting the deadline and asking when it will happen. <a href="/school-missed-iep-deadline/${s.slug.replace("-iep-timeline-calculator", "")}/">More on what to do</a>.</li>
    <li><strong>School won't evaluate?</strong> <a href="/school-wont-evaluate-my-child/${s.slug.replace("-iep-timeline-calculator", "")}/">Here's what you can do</a>.</li>
    <li><strong>You don't have to do this alone.</strong> Every state has a free Parent Training and Information Center. <a href="https://www.parentcenterhub.org/find-your-center/" target="_blank" rel="noopener">Find yours</a>.</li>
  </ul>
  <div class="not-alone">
    <p><strong>Feeling tired, worried or frustrated?</strong> That's very common. Many parents feel exactly this way while they wait. Asking for these dates isn't making trouble. It's how the process is meant to work, and it's part of looking after your child.</p>
    <p>If you'd like to talk with a parent who has been through it, <a href="https://www.p2pusa.org/" target="_blank" rel="noopener">Parent to Parent USA</a> can connect you with a trained volunteer parent near you.</p>
  </div>
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
<h2>Guides</h2>
<ul>${GUIDES.map((g) => `<li><a href="/${g.slug}/">${esc(g.title)}</a></li>`).join("")}</ul>
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

// Guide: what to do when the school won't evaluate. Rules checked against the regulation text on 2026-11-08.
// Guides. Each guide has an all-states overview page and one page per state (state pages
// target searches like "school won't evaluate my child illinois"). Rules checked against
// the regulation text on 2026-11-08.
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const STATE_GUIDE = {
  NY: {
    to: "the chairperson of the Committee on Special Education (CSE)",
    complaint: "https://www.nysed.gov/special-education/state-complaint",
    agency: "the New York State Education Department",
    evalRule: "the evaluation is due 60 calendar days after the school gets your consent",
    refuse: `<p>Send the referral in writing to the chairperson of the Committee on Special Education. The chairperson has to notify you right away and ask for your consent (<a href="https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4">8 NYCRR §200.4(a)</a>).</p>
<p>The building principal may ask to meet with you to talk about other supports instead. That's allowed, but the referral is only withdrawn if <strong>you agree in writing</strong> (§200.4(a)(9)). If you still want the evaluation, don't sign anything that says the referral is withdrawn. Once you give consent, the evaluation has to be done within 60 calendar days.</p>`,
  },
  PA: {
    to: "the special education director",
    complaint: "https://www.pa.gov/en/agencies/education/programs-and-services/instruction/elementary-and-secondary-education/special-education/state-complaints-and-dispute-resolution.html",
    agency: "the Pennsylvania Department of Education, Bureau of Special Education",
    evalRule: "the evaluation report is due 60 calendar days after consent, but summer break days don't count",
    refuse: `<p>Pennsylvania wants the request in writing, and schools have to keep the <strong>Permission to Evaluate</strong> form easy to get. If you asked out loud, to a teacher, counselor or principal, that person has to get you a copy of the form within 10 calendar days (<a href="https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-123">22 Pa. Code §14.123(c)</a>).</p>
<p>If the school decides not to evaluate, you should get that decision on a NOREP (Notice of Recommended Educational Placement) or other written notice. Once you sign consent, the evaluation report is due within 60 calendar days, not counting summer break.</p>`,
  },
  IL: {
    to: "the special education director",
    complaint: "https://www.isbe.net/Pages/Special-Education-Complaint-Investigation-Process.aspx",
    agency: "the Illinois State Board of Education (ISBE)",
    evalRule: "the evaluation and the IEP meeting are due within 60 school days, so holidays and breaks push the date out",
    refuse: `<p>Illinois gives the district <strong>14 school days</strong> after your request to decide whether an evaluation is needed. If it decides no, it has to send you written notice (<a href="https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-23-SS-226.110">23 Ill. Adm. Code §226.110(c)(3)</a>). If it decides yes and you consent, the evaluation, the eligibility meeting and the IEP meeting all have to happen within 60 school days.</p>`,
  },
};
const codes = Object.keys(STATE_GUIDE);
const calcLinks = () => codes.map((c) => `<a href="/${STATES[c].slug}/">${STATES[c].name}</a>`).join(" · ");
const complaintLinks = (list) => list.map((c) => ext(STATE_GUIDE[c].complaint, STATES[c].name)).join(" · ");

const GUIDES = [
  {
    slug: "school-wont-evaluate-my-child",
    title: "The school won't evaluate my child. What now?",
    stateTitle: (n) => `School Won't Evaluate My Child in ${n}? What Parents Can Do`,
    stateDesc: (n) => `What to do when a ${n} school won't evaluate your child for special education: how to ask in writing, what the school must send you, and the ${n} rules.`,
    allTitle: "School Won't Evaluate My Child for an IEP? What to Do (NY, PA, IL)",
    allDesc: "What to do when the school won't evaluate your child for special education: how to ask in writing, what the school must send you, and the New York, Pennsylvania and Illinois rules.",
    body: wontEvaluateBody,
  },
  {
    slug: "school-missed-iep-deadline",
    title: "The school missed an IEP deadline. What can I do?",
    stateTitle: (n) => `School Missed the IEP Deadline in ${n}? What Parents Can Do`,
    stateDesc: (n) => `What to do when a ${n} school misses an IEP evaluation or meeting deadline: check the date, a sample follow-up email, the next step, and how to file a state complaint in ${n}.`,
    allTitle: "School Missed the IEP Deadline? What Parents Can Do (NY, PA, IL)",
    allDesc: "What to do when the school misses an IEP evaluation or meeting deadline: check the date, a sample follow-up email, the next step, and how a state complaint works.",
    body: missedDeadlineBody,
  },
];
const guideStateSlug = (code) => STATES[code].slug.replace("-iep-timeline-calculator", "");

function stateSwitcher(g, code) {
  return `<p class="small">Pick your state: ${codes
    .map((c) => (c === code ? `<strong>${STATES[c].name}</strong>` : `<a href="/${g.slug}/${guideStateSlug(c)}/">${STATES[c].name}</a>`))
    .join(" · ")}${code ? ` · <a href="/${g.slug}/">All states</a>` : ""}</p>`;
}

function guidePage(g, code) {
  const n = code ? STATES[code].name : null;
  return layout({
    title: code ? g.stateTitle(n) : g.allTitle,
    description: code ? g.stateDesc(n) : g.allDesc,
    canonical: code ? `/${g.slug}/${guideStateSlug(code)}/` : `/${g.slug}/`,
    body: g.body(code, stateSwitcher(g, code)),
  });
}

function wontEvaluateBody(code, switcher) {
  const list = code ? [code] : codes;
  const n = code && STATES[code].name;
  const to = code ? STATE_GUIDE[code].to : "the special education director (in New York, the chairperson of the Committee on Special Education)";
  return `
<p class="eyebrow">Guide · ${code ? n : "New York, Pennsylvania, Illinois"}</p>
<h1>${code ? `The school won't evaluate my child in ${n}. What now?` : "The school won't evaluate my child. What now?"}</h1>
${switcher}
<p class="lead">Maybe they said "let's wait and see." Maybe they said your child is doing fine, or that they need to try more interventions first. If you think your child needs help, you're allowed to ask for a special education evaluation, and the school has to give you a real answer. Here's how that works${code ? ` in ${n}` : ""}.</p>

<h2>1. Put the request in writing</h2>
<p>A hallway chat or a phone call is easy to lose. Send a short email to ${to}. Keep a copy. Something like this is enough:</p>
<pre class="sample">Dear [name],

I am requesting a full evaluation for special education for my child, [child's name], [grade], at [school], in all areas of suspected disability. I am also requesting an evaluation under Section 504.

I'm concerned about [one or two sentences: what you see at home or what teachers have told you].

Please send me the consent form, or if the district decides not to evaluate, a written notice explaining why.

Thank you,
[your name]
[phone]</pre>
<p>Federal law says a parent can ask for an initial evaluation at any time (<a href="https://www.law.cornell.edu/cfr/text/34/300.301">34 CFR §300.301(b)</a>).</p>

<h2>2. The school has two choices, and both come in writing</h2>
<p>After your request, the school either asks for your consent to evaluate, or tells you no. If it says no, it has to give you <strong>prior written notice</strong>: what it refused, why, and what it looked at to decide (<a href="https://www.law.cornell.edu/cfr/text/34/300.503">34 CFR §300.503</a>). A shrug in a meeting isn't that.</p>
<p>One thing schools sometimes say is that your child has to go through RTI or MTSS (extra help in general education) first. The U.S. Department of Education has said those programs can't be used to delay or deny an evaluation when a disability is suspected (OSEP Memo 11-07, 2011). Your child can get extra help and be evaluated at the same time.</p>

<h2>3. ${code ? `The ${n} rules` : "What your state adds"}</h2>
${list
  .map((c) => `${code ? "" : `<h3>${STATES[c].name}</h3>\n`}${STATE_GUIDE[c].refuse}\n<p><a href="/${STATES[c].slug}/">See your ${STATES[c].name} dates →</a></p>`)
  .join("\n")}

<h2>4. If the answer is still no</h2>
<ul>
<li><strong>Call your state's free Parent Center.</strong> Helping parents with exactly this is their job. ${ext("https://www.parentcenterhub.org/find-your-center/", "Find yours")}.</li>
<li><strong>Ask about mediation.</strong> It's free, voluntary for both sides, and often faster than anything else.</li>
<li><strong>File a state complaint.</strong> It's free and you don't need a lawyer (<a href="https://www.law.cornell.edu/cfr/text/34/300.153">34 CFR §300.153</a>). ${code ? `In ${n} it goes to ${STATE_GUIDE[code].agency}: ${ext(STATE_GUIDE[code].complaint, "how to file")}.` : complaintLinks(codes)}</li>
<li><strong>Due process</strong> is the formal hearing route. It's more involved, so most families talk to the Parent Center or an advocate first.</li>
</ul>

<h2>A word about how this feels</h2>
<p>Hearing "no" about your own kid is hard, and it's easy to feel like you're being difficult. You aren't. Asking in writing, staying polite and keeping copies is how this process is supposed to work. Most of the time a clear written request is what moves things forward.</p>

<div class="not-alone">
<p><strong>Already signed consent?</strong> The clock is running. ${code ? `<a href="/${STATES[code].slug}/">See the exact date each step is due in ${n}</a>, with the rule behind it.` : `Pick your state to see the exact date each step is due, with the rule behind it: ${calcLinks()}.`}</p>
</div>
<p class="small">General information, not legal advice. Rules checked against the regulation text in November 2026.</p>
`;
}

function missedDeadlineBody(code, switcher) {
  const list = code ? [code] : codes;
  const n = code && STATES[code].name;
  const to = code ? STATE_GUIDE[code].to : "the special education director (in New York, the chairperson of the Committee on Special Education)";
  return `
<p class="eyebrow">Guide · ${code ? n : "New York, Pennsylvania, Illinois"}</p>
<h1>${code ? `The school missed an IEP deadline in ${n}. What can I do?` : "The school missed an IEP deadline. What can I do?"}</h1>
${switcher}
<p class="lead">You signed the consent form, you've been counting the days, and the date came and went. Nobody called. It's frustrating, and it's also common. The good news is there's a calm, step-by-step way to get things moving again, and none of it needs a lawyer.</p>

<h2>1. Check the date first</h2>
<p>Before you write to anyone, make sure the deadline really passed. Some deadlines count calendar days, some count school days, and some pause over summer break. That's the part people most often get wrong, in both directions.</p>
${code
  ? `<p>In ${n}, ${STATE_GUIDE[code].evalRule}. <a href="/${STATES[code].slug}/">Check your exact date</a>.</p>`
  : `<ul>\n${list.map((c) => `<li><strong>${STATES[c].name}:</strong> ${STATE_GUIDE[c].evalRule}. <a href="/${STATES[c].slug}/">Check your date</a></li>`).join("\n")}\n</ul>`}
<p>There are also two federal exceptions where the evaluation clock doesn't apply: if the child repeatedly isn't brought to the evaluation, or if the child moves to a different district partway through (<a href="https://www.law.cornell.edu/cfr/text/34/300.301">34 CFR §300.301(d)</a>).</p>

<h2>2. Send a short, polite email</h2>
<p>A late evaluation doesn't always mean the school doesn't care. Sometimes it's a scheduling backlog, and a friendly written note is enough to get it moving. Send it to ${to}:</p>
<pre class="sample">Dear [name],

I signed consent for [child's name]'s evaluation on [date]. By my count, the evaluation was due by [date] under ${code ? n : "[state]"} rules, and I haven't heard about results yet.

Could you let me know when the evaluation will be finished and when we can meet to go over it?

Thank you,
[your name]
[phone]</pre>
<p>Writing it down matters. If you ever need to take the next step, a dated email is your record.</p>

<h2>3. If a week goes by with no answer</h2>
<p>Send a second, still polite email to the superintendent, copy the special education director, and mention the date of your first email. Say that you'd like a reply within five school days and that you'd prefer to work this out with the school. You can also call your state's free ${ext("https://www.parentcenterhub.org/find-your-center/", "Parent Center")}, which helps families with exactly this.</p>

<h2>4. If it's still stuck: a state complaint</h2>
<p>Every state has to take written complaints about special education rules being broken, and it's free (<a href="https://www.law.cornell.edu/cfr/text/34/300.153">34 CFR §300.153</a>). A few things worth knowing:</p>
<ul>
<li>The complaint has to be about something that happened <strong>within the last year</strong> (§300.153(c)).</li>
<li>It needs to say what rule was broken, the facts, what you'd like to happen, and your signature and contact information.</li>
<li>The state usually has <strong>60 days</strong> to decide (<a href="https://www.law.cornell.edu/cfr/text/34/300.152">§300.152</a>).</li>
<li>If the state finds your child went without services they should have had, it has to address that, for example with <strong>compensatory services</strong>, meaning extra services to make up for lost time (<a href="https://www.law.cornell.edu/cfr/text/34/300.151">§300.151(b)</a>).</li>
</ul>
<p>${code ? `In ${n}, complaints go to ${STATE_GUIDE[code].agency}: ${ext(STATE_GUIDE[code].complaint, "how to file")}.` : `Where to file: ${complaintLinks(codes)}`}</p>

<h2>A word about how this feels</h2>
<p>Waiting is exhausting, especially when your child is struggling right now. Following up isn't nagging, and it isn't picking a fight. Deadlines exist so kids don't fall through the cracks, and asking about one is just part of making sure yours doesn't.</p>

<div class="not-alone">
<p><strong>Want the letters already written?</strong> ${code ? `The ${n} calculator` : "Each state calculator"} works out your exact dates for free. If you'd like, for $12 it can also write the follow-up email and the second request with your dates filled in. ${code ? `<a href="/${STATES[code].slug}/">Open the ${n} calculator</a>` : calcLinks()}</p>
</div>
<p class="small">General information, not legal advice. Rules checked against the regulation text in November 2026.</p>
`;
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
  return legalPage("refunds", "Refund Policy", "Refund policy for the follow-up letter and IEP meeting prep sold on the IEP Timeline Calculator.", `
<p>If the letter and meeting prep are not useful to you, ask for a refund within 14 days of purchase and you will get your money back in full. No explanation is needed. Refunds are limited to one per customer.</p>
<p>When a refund is issued, the license key for that purchase stops working.</p>
<p>Refunds go back to your original payment method through Lemon Squeezy. Depending on your bank, they usually appear within 5 to 10 business days.</p>
<p>If you think a date we calculated is wrong, please tell us what you entered (state, consent date and school calendar). We check every report, whether or not you ask for a refund.</p>
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
for (const g of GUIDES) {
  write(`${g.slug}/index.html`, guidePage(g, null));
  for (const c of codes) write(`${g.slug}/${guideStateSlug(c)}/index.html`, guidePage(g, c));
}
for (const [code, s] of Object.entries(STATES)) write(`${s.slug}/index.html`, statePage(code, s));
for (const f of ["calc.js", "letter.js", "app.js", "style.css"]) fs.copyFileSync(path.join(ROOT, "src", f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(ROOT, "static"))) fs.copyFileSync(path.join(ROOT, "static", f), path.join(OUT, f));

const urls = ["/", ...GUIDES.flatMap((g) => [`/${g.slug}/`, ...codes.map((c) => `/${g.slug}/${guideStateSlug(c)}/`)]), "/about/", "/terms/", "/privacy/", "/refunds/", ...Object.values(STATES).map((s) => `/${s.slug}/`)];
const today = new Date().toISOString().slice(0, 10);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log("Built", urls.length, "pages for", SITE);
