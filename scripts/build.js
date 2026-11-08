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
<nav>${Object.values(STATES).map((s) => `<a href="/${s.slug}/">${s.name}</a>`).join("")}<a href="/letter-pack/">Letter pack</a><a href="/about/">About</a></nav>
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
  <div id="remind" class="remind no-print" hidden>
    <h3>Rather get an email?</h3>
    <p>We'll email you 3 days before <strong id="remind-what"></strong>, and once more the day after, in case nothing happened. Just those two emails about this date.</p>
    <form id="remind-form" action="${REMIND_URL}" method="post">
      <label class="sr" for="remind-email">Your email</label>
      <input id="remind-email" type="email" name="fields[email]" required placeholder="you@example.com" autocomplete="email">
      <input type="hidden" name="fields[iep_deadline]" id="remind-date">
      <input type="hidden" name="fields[deadline_step]" id="remind-step">
      <input type="hidden" name="fields[state]" id="remind-state">
      <input type="hidden" name="ml-submit" value="1"><input type="hidden" name="anticsrf" value="true">
      <button type="submit">Remind me</button>
    </form>
    <p class="remind-done" hidden></p>
    <p class="small">Your email goes to our email provider (MailerLite) only for this. See our <a href="/privacy/">privacy policy</a>.</p>
  </div>
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
        <p class="small">One-time payment. 14-day money-back guarantee. <a href="/letter-pack/">What's inside</a></p>
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
    body: body + signupBox(),
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
<ul>${GUIDES.map((g) => `<li><a href="/${g.slug}/">${esc(g.title)}</a></li>`).join("")}<li><a href="/${SUSPEND_SLUG}/">Suspension calculator: has my child hit the 10-day rule?</a></li></ul>
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
<li><a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56043">California: Cal. Educ. Code §56043</a>, <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56344">§56344</a></li>
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
  CA: {
    to: "the special education director",
    complaint: "https://www.cde.ca.gov/sp/se/qa/cmplntproc.asp",
    agency: "the California Department of Education (CDE)",
    evalRule: "the assessment and the IEP meeting are due 60 calendar days after consent, but summer and school breaks longer than 5 school days don't count",
    refuse: `<p>In California, once you make a written referral, the district has 15 calendar days to send you a proposed <strong>assessment plan</strong> (breaks longer than 5 school days don't count). You then get at least 15 days to look it over before you sign (<a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56043">Cal. Educ. Code §56043(a), (b)</a>; §56321).</p>
<p>If the district decides not to assess, it has to tell you in writing and explain why. Once you sign the assessment plan, the assessment and the IEP meeting are due within 60 calendar days, not counting summer or long breaks.</p>`,
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
    allTitle: "School Won't Evaluate My Child for an IEP? What to Do (CA, NY, PA, IL)",
    allDesc: "What to do when the school won't evaluate your child for special education: how to ask in writing, what the school must send you, and the California, New York, Pennsylvania and Illinois rules.",
    body: wontEvaluateBody,
  },
  {
    slug: "school-missed-iep-deadline",
    title: "The school missed an IEP deadline. What can I do?",
    stateTitle: (n) => `School Missed the IEP Deadline in ${n}? What Parents Can Do`,
    stateDesc: (n) => `What to do when a ${n} school misses an IEP evaluation or meeting deadline: check the date, a sample follow-up email, the next step, and how to file a state complaint in ${n}.`,
    allTitle: "School Missed the IEP Deadline? What Parents Can Do (CA, NY, PA, IL)",
    allDesc: "What to do when the school misses an IEP evaluation or meeting deadline: check the date, a sample follow-up email, the next step, and how a state complaint works.",
    body: missedDeadlineBody,
  },
  {
    slug: "first-iep-meeting",
    title: "Your first IEP meeting: what happens and what you can ask for",
    stateTitle: (n) => `First IEP Meeting in ${n}: What to Expect and Your Rights as a Parent`,
    stateDesc: (n) => `What happens at a first IEP meeting in ${n}: who will be there, what you're entitled to before and after, and the ${n} rules that change the timing.`,
    allTitle: "First IEP Meeting: What to Expect and Your Rights as a Parent (CA, NY, PA, IL)",
    allDesc: "What happens at a first IEP meeting: who has to be there, what you can ask for before the meeting, why you don't have to sign at the table, and the California, New York, Pennsylvania and Illinois rules.",
    body: firstMeetingBody,
  },
];
const guideStateSlug = (code) => STATES[code].slug.replace("-iep-timeline-calculator", "");

function stateSwitcher(g, code) {
  return `<p class="small">Pick your state: ${codes
    .map((c) => (c === code ? `<strong>${STATES[c].name}</strong>` : `<a href="/${g.slug}/${guideStateSlug(c)}/">${STATES[c].name}</a>`))
    .join(" · ")}${code ? ` · <a href="/${g.slug}/">All states</a>` : ""}</p>`;
}

// Deadline reminder (MailerLite form "Deadline reminder signup" -> group "Deadline reminders" ->
// automation "Deadline reminder": exact date trigger 3 days before fields.iep_deadline, then the day after).
const REMIND_URL = "https://assets.mailerlite.com/jsonp/2778487/forms/203576072075216199/subscribe";

// Email signup (MailerLite form "Site checklist signup" -> group "Waiting checklist" -> welcome automation).
const SIGNUP_URL = "https://assets.mailerlite.com/jsonp/2778487/forms/203557760520947424/subscribe";
function signupBox() {
  return `
<section class="signup card no-print" aria-labelledby="signup-h">
<h2 id="signup-h">Waiting on the school? Get the free checklist</h2>
<p>10 small things to do while you wait for the evaluation, plus a contact log you can print. We'll email you the link. Now and then we'll also send a short note when we add a state or guide. Unsubscribe anytime.</p>
<form class="signup-form" action="${SIGNUP_URL}" method="post">
<label class="sr" for="signup-email">Your email</label>
<input id="signup-email" type="email" name="fields[email]" required placeholder="you@example.com" autocomplete="email">
<input type="hidden" name="ml-submit" value="1"><input type="hidden" name="anticsrf" value="true">
<button type="submit">Send me the checklist</button>
</form>
<p class="signup-done" hidden>Thanks! Here's your checklist: <a href="/checklist/">open it now</a>. A copy is on its way to your inbox.</p>
<p class="small">We only use your email for this. See our <a href="/privacy/">privacy policy</a>.</p>
</section>
<script src="/signup.js" defer></script>`;
}

function guidePage(g, code) {
  const n = code ? STATES[code].name : null;
  return layout({
    title: code ? g.stateTitle(n) : g.allTitle,
    description: code ? g.stateDesc(n) : g.allDesc,
    canonical: code ? `/${g.slug}/${guideStateSlug(code)}/` : `/${g.slug}/`,
    body: g.body(code, stateSwitcher(g, code)) + signupBox(),
  });
}

function wontEvaluateBody(code, switcher) {
  const list = code ? [code] : codes;
  const n = code && STATES[code].name;
  const to = code ? STATE_GUIDE[code].to : "the special education director (in New York, the chairperson of the Committee on Special Education)";
  return `
<p class="eyebrow">Guide · ${code ? n : "California, New York, Pennsylvania, Illinois"}</p>
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

const FIRST_MEETING_STATE = {
  NY: `<p>In New York the team is called the <strong>Committee on Special Education (CSE)</strong>, and it includes a school psychologist. You can also ask for an <strong>additional parent member</strong>, a parent of another child with a disability, to join. Put the request in writing at least 72 hours before the meeting (<a href="https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.3">8 NYCRR §200.3(a)(1)(viii)</a>).</p>`,
  PA: `<p>In Pennsylvania you should get the <strong>Evaluation Report</strong> at least 10 school days before the meeting, so you have time to read it (<a href="https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-123">22 Pa. Code §14.123(d)</a>). The IEP meeting has to happen within 30 calendar days of the report. After the meeting, the school sends a <strong>NOREP</strong> (Notice of Recommended Educational Placement). That's the form where you agree or disagree, and you can take it home before you sign.</p>`,
  CA: `<p>In California the school has to give you your child's records within 5 business days of your request, and before the IEP meeting (<a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56504">Cal. Educ. Code §56504</a>). Ask for the assessment reports that way. You can also audio-record the IEP meeting if you tell the school at least 24 hours ahead (§56341.1(g)). The meeting itself is due within 60 calendar days of your consent, not counting summer or breaks longer than 5 school days.</p>`,
  IL: `<p>In Illinois the school has to give you notice of the meeting at least 10 days ahead (you can waive that in writing), and send you copies of the written materials the team will consider, such as evaluations and data, at least 3 school days before the meeting (<a href="https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-23-SS-226.530">23 Ill. Adm. Code §226.530</a>; 105 ILCS 5/14-8.02f(c)). In Illinois the first IEP meeting falls inside the same 60-school-day window as the evaluation.</p>`,
};

function firstMeetingBody(code, switcher) {
  const list = code ? [code] : codes;
  const n = code && STATES[code].name;
  return `
<p class="eyebrow">Guide · ${code ? n : "California, New York, Pennsylvania, Illinois"}</p>
<h1>${code ? `Your first IEP meeting in ${n}: what happens and what you can ask for` : "Your first IEP meeting: what happens and what you can ask for"}</h1>
${switcher}
<p class="lead">The evaluation is done and the school wants to meet. A lot of parents walk into that first meeting not knowing who will be there, what will be decided, or whether they're supposed to sign something on the spot. Here's what to expect, and what you're allowed to ask for.</p>

<h2>Who will be at the table</h2>
<p>Federal law says the team has to include you, at least one of your child's general education teachers, a special education teacher, someone from the district who can commit resources, and someone who can explain what the evaluation results mean. Your child can attend when it makes sense (<a href="https://www.law.cornell.edu/cfr/text/34/300.321">34 CFR §300.321</a>).</p>
<p>You can bring people too: a partner, a friend, an advocate, or a therapist who knows your child (§300.321(a)(6)). If a required team member wants to skip the meeting, they need your agreement in writing (§300.321(e)).</p>

<h2>Before the meeting: what you can ask for</h2>
<ul>
<li><strong>A time that works for you.</strong> The meeting has to be at a mutually agreed time and place, and the notice has to say who's coming and why (<a href="https://www.law.cornell.edu/cfr/text/34/300.322">34 CFR §300.322(a), (b)</a>).</li>
<li><strong>A phone or video option</strong> if you can't be there in person (§300.322(c); §300.328).</li>
<li><strong>An interpreter</strong> if English isn't your first language or you're deaf. The school arranges it (§300.322(e)).</li>
<li><strong>Your child's records.</strong> The school has to let you see them before any IEP meeting (<a href="https://www.law.cornell.edu/cfr/text/34/300.613">34 CFR §300.613</a>). Asking for the evaluation report ahead of time is the single most useful thing you can do.</li>
</ul>

<h2>The rules in ${code ? n : "your state"}</h2>
${list.map((c) => (code ? "" : `<h3>${STATES[c].name}</h3>`) + FIRST_MEETING_STATE[c]).join("\n")}

<h2>At the meeting</h2>
<p>The team goes over the evaluation, decides whether your child is eligible, and, if so, writes the IEP: goals, services, how many minutes and where, and accommodations. You're a full member of the team, and the team has to consider your concerns.</p>
<p><strong>You don't have to sign at the table.</strong> Before the school can start special education services for the first time, it needs your written consent (<a href="https://www.law.cornell.edu/cfr/text/34/300.300">34 CFR §300.300(b)</a>). It's fine to say you'd like to take the IEP home and read it first. You can also agree to services while writing down the parts you disagree with.</p>

<h2>After the meeting</h2>
<ul>
<li><strong>Get your copy.</strong> The school has to give you a copy of the IEP at no cost (§300.322(f)).</li>
<li><strong>Write a short summary email.</strong> What was agreed, who will do what, and by when. If something was promised out loud but isn't in the IEP, this is how it gets on the record.</li>
<li><strong>Put the next dates on your calendar.</strong> The IEP is reviewed at least once a year, and your child is reevaluated at least every three years. ${calcLinks()} will work out those dates.</li>
</ul>

<div class="not-alone">
<p><strong>Want help getting ready?</strong> The <a href="/letter-pack/">letter pack</a> includes IEP meeting prep (what to bring, questions to ask, and calm words for when the meeting moves fast) plus a summary email to send afterwards.</p>
</div>
<p class="small">General information based on the published rules, not legal advice. Last checked November 8, 2026.</p>
`;
}

function missedDeadlineBody(code, switcher) {
  const list = code ? [code] : codes;
  const n = code && STATES[code].name;
  const to = code ? STATE_GUIDE[code].to : "the special education director (in New York, the chairperson of the Committee on Special Education)";
  return `
<p class="eyebrow">Guide · ${code ? n : "California, New York, Pennsylvania, Illinois"}</p>
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

function letterPackPage() {
  const body = `
<p class="eyebrow">Letter pack · ${PAYWALL.price}, one time</p>
<h1>The letters to the school, already written with your dates</h1>
<p class="lead">Knowing the deadline is one thing. Writing to the school about it, without sounding angry or getting the date wrong, is the part most parents put off. This pack writes those emails for you, with your child's dates and your state's rules already filled in.</p>
<p><strong>Pick your state to start:</strong> ${calcLinks()}. Enter your consent date, and the letter appears right under your timeline. The first half is free to read.</p>

<h2>What's in it</h2>
<div class="pack-grid">
<div class="card"><h3>4 letters, one for each stage</h3>
<ul>
<li><strong>Confirm the dates.</strong> A friendly note right after consent, so everyone works from the same deadline.</li>
<li><strong>A date has passed.</strong> A polite follow-up that names the rule and asks when it will happen.</li>
<li><strong>Still no reply.</strong> A second request to the superintendent, with the date of your first email.</li>
<li><strong>After the meeting.</strong> A short summary of what was agreed, so it's in writing.</li>
</ul></div>
<div class="card"><h3>Sent from your own email</h3>
<p>One click opens the letter in Gmail or your usual mail app, ready to send. It goes from you, so the dated record is in your own sent folder. We never send anything for you.</p></div>
<div class="card"><h3>IEP meeting prep</h3>
<p>What to bring, questions to ask, what to do the night before, and a few calm phrases for when the meeting moves too fast.</p></div>
<div class="card"><h3>Plain-English help</h3>
<p>The words you'll hear in the meeting, explained, and what to do step by step if the school stops answering.</p></div>
</div>

<h2>Why each letter says it the way it does</h2>
<p>Every letter is polite on purpose. It names the date and the regulation, asks one clear question, and leaves room for the school to fix it, which makes it easy for them to answer. Under each letter you'll see a one-line note on why it's safe to send.</p>

<h2>Questions</h2>
<details><summary>What's free and what's paid?</summary><p>The calculator, every date and rule, and the first half of each letter are free. The ${PAYWALL.price} unlocks the full letters, one-click sending, the meeting prep and the glossary.</p></details>
<details><summary>Which states does it cover?</summary><p>California, New York, Pennsylvania and Illinois, for school-age children (not Early Intervention or preschool).</p></details>
<details><summary>Is this legal advice?</summary><p>No. It's general information and letter templates based on the published rules. For advice about your child's situation, your state's free Parent Center is a great place to start.</p></details>
<details><summary>Is it a subscription?</summary><p>No. One payment, and the pack stays unlocked in your browser. Your license key in the receipt email unlocks it on another device.</p></details>
<details><summary>What if it doesn't help?</summary><p>Ask within 14 days for a full refund, no explanation needed. See the <a href="/refunds/">refund policy</a>.</p></details>

<div class="not-alone">
<p><strong>Start with your dates:</strong> ${calcLinks()}</p>
</div>
`;
  return layout({
    title: "IEP Letter Pack – Follow-Up Emails to the School With Your Dates Filled In",
    description: "Four ready-to-send letters to the school (confirm dates, overdue, second request, meeting summary) with your state's deadlines filled in, plus IEP meeting prep. One-time payment.",
    canonical: "/letter-pack/",
    body,
  });
}

// 10-day suspension rule calculator.
const SUSPEND_SLUG = "iep-suspension-10-day-rule-calculator";
function suspendPage() {
  const cfgJson = JSON.stringify(Object.fromEntries(Object.entries(STATES).map(([c, s]) => [c, { name: s.name, years: s.years, closures: s.closures }]))).replace(/</g, "\\u003c");
  const faq = [
    ["Does in-school suspension count toward the 10 days?", "Usually it does, unless your child still gets their IEP services, keeps working in the general curriculum, and stays with non-disabled classmates to the same extent as before. Ask the school how they are counting it."],
    ["Do partial days count?", "A removal for part of the school day, such as being sent home early, can count toward the total. Keep a note of the date and time each time it happens."],
    ["What if the school calls it something else, like a 'cooling off' day at home?", "If your child is kept out of school for behavior, it can still be a removal even if the school doesn't call it a suspension. Write down each date."],
    ["Is this legal advice?", "No. It's general information based on the published rules. Your state's free Parent Center can help with your child's situation."],
  ];
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const body = `
<p class="eyebrow">Free calculator · CA, NY, PA, IL</p>
<h1>IEP suspension calculator: has my child hit the 10-day rule?</h1>
<p class="lead">If your child keeps getting sent home, the days add up faster than you think. Once suspensions pass 10 school days in a school year, the school has to follow extra rules. Add up your child's days below to see where you stand.</p>

<form id="s-form" class="card" onsubmit="return false">
<label>State <select id="s-state">${Object.entries(STATES).map(([c, s]) => `<option value="${c}">${s.name}</option>`).join("")}</select></label>
<p class="small">Enter each suspension this school year, in school days. Count in-school suspensions and early pick-ups for behavior too.</p>
<ol id="s-list" class="s-list"></ol>
<button type="button" class="ghost" id="s-add">+ Add another suspension</button>
<p id="s-id-wrap" hidden><label><input type="checkbox" id="s-id"> My child is identified with an intellectual disability</label></p>
<label>Date the school decided on the latest suspension (optional) <input type="date" id="s-decision"></label>
</form>
<div id="s-out" class="s-out" aria-live="polite"></div>

<h2>How the 10-day rule works</h2>
<ul>
<li><strong>Up to 10 school days a year,</strong> a school can suspend a child with an IEP the same way it would any other student.</li>
<li><strong>From the 11th day,</strong> the school has to keep providing services during any suspension, so your child doesn't fall behind on IEP goals (34 CFR §300.530(b), (d)).</li>
<li><strong>A change of placement</strong> happens when one suspension is longer than 10 school days in a row, or when a series of suspensions adds up to more than 10 days and forms a pattern (34 CFR §300.536).</li>
<li><strong>Within 10 school days</strong> of deciding on a change of placement, the school has to hold a manifestation determination review with you (34 CFR §300.530(e)).</li>
</ul>

<h2>What each state adds</h2>
<ul>
<li><strong>Pennsylvania:</strong> more than 15 school days in a year is automatically a change of placement, and for a student with an intellectual disability, any removal is (22 Pa. Code §14.143).</li>
<li><strong>Illinois:</strong> after 10 school days in a year, the district holds an IEP meeting to review or write a behavior plan (23 Ill. Adm. Code §226.400).</li>
<li><strong>New York:</strong> the manifestation review should happen immediately if possible (8 NYCRR §201.4), and no student can be suspended more than 5 school days without a fair hearing (Educ. Law §3214(3)(c)).</li>
</ul>

<h2>What you can do now</h2>
<ol>
<li><strong>Write down every day out.</strong> Date, how long, and what the school said happened. Early pick-ups count.</li>
<li><strong>Ask the school, in writing, how many days they have on record.</strong> Their count and yours should match.</li>
<li><strong>Ask for a behavior plan</strong> if your child doesn't have one, or a review if the current one isn't working.</li>
<li><strong>Call your state's free ${ext("https://www.parentcenterhub.org/find-your-center/", "Parent Center")}</strong> if a long suspension or expulsion is on the table.</li>
</ol>

<h2>Questions</h2>
${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("\n")}
<p class="small">Estimates based on the published rules, not legal advice. Last checked November 8, 2026.</p>
<script>window.SUSPEND_CFG=${cfgJson};</script>
<script src="/calc.js"></script><script src="/suspend.js"></script><script src="/suspend-ui.js"></script>
`;
  return layout({
    title: "IEP Suspension Calculator: The 10-Day Rule for Students With Disabilities (CA, NY, PA, IL)",
    description: "Add up your child's suspensions to see if they've passed the 10-day rule, when the school must provide services, and when a manifestation determination review is due.",
    canonical: `/${SUSPEND_SLUG}/`,
    body: body + signupBox(),
    head: `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`,
  });
}

// Free lead magnet, sent by the MailerLite welcome email. noindex and not in the sitemap.
function checklistPage() {
  const rows = Array.from({ length: 8 }, () => "<tr><td></td><td></td><td></td><td></td></tr>").join("");
  const body = `
<p class="eyebrow">Free checklist</p>
<h1>While you wait for the evaluation: a 10-step checklist</h1>
<p class="lead">The weeks between "yes, we'll evaluate" and the first meeting can feel like nothing is happening. Here's what you can quietly do in that time, so you walk into the meeting with a clear record and fewer surprises.</p>
<p class="no-print"><button type="button" class="ghost" onclick="window.print()">Print this checklist</button></p>

<h2>Keep a paper trail</h2>
<ol class="checklist">
<li><strong>Put the request in writing.</strong> If you only asked out loud or on the phone, send a short email that repeats it and gives the date you first asked. A dated email is the easiest record to point back to.</li>
<li><strong>Write down the consent date.</strong> Most deadlines are counted from the day the school gets your signed consent. Ask for a copy of the signed form if you don't have one.</li>
<li><strong>Put the deadline on your calendar.</strong> ${calcLinks()} will work it out with school breaks counted, and can add it to your phone calendar.</li>
<li><strong>Keep one folder for everything.</strong> Emails, letters, report cards, notes home. One email label or one paper folder is enough.</li>
<li><strong>Log every call and meeting.</strong> Date, who you spoke to, and what they said, in a line or two. There's a blank log at the bottom of this page.</li>
</ol>

<h2>Get ready for the meeting</h2>
<ol class="checklist" start="6">
<li><strong>Ask for your child's school records.</strong> You have the right to see them. The school has to provide them without unnecessary delay, before any IEP meeting, and no later than 45 days after you ask (34 CFR §300.613).</li>
<li><strong>Collect outside reports.</strong> Letters or evaluations from doctors, therapists or tutors. If you share a private evaluation that meets the district's criteria, the school has to consider it (34 CFR §300.502(c)).</li>
<li><strong>Write down examples while they're fresh.</strong> What homework looks like, what teachers have told you, what your child says about school. Short notes with dates are more useful than a long summary later.</li>
<li><strong>Ask when you'll get the evaluation report.</strong> Reading it before the meeting, not at the table, makes a big difference.</li>
</ol>

<h2>If things stall</h2>
<ol class="checklist" start="10">
<li><strong>If a date passes, send one polite email.</strong> Name the date, ask when it will happen, and keep it short. Here's <a href="/school-missed-iep-deadline/">what to do when the school misses a deadline</a>, and every state has a free ${ext("https://www.parentcenterhub.org/find-your-center/", "Parent Center")} that can help.</li>
</ol>

<h2>Contact log</h2>
<table class="log"><thead><tr><th>Date</th><th>Who</th><th>Call / email / meeting</th><th>What was said</th></tr></thead><tbody>${rows}</tbody></table>

<div class="not-alone no-print">
<p>Want the emails to the school written for you, with your dates filled in? See the <a href="/letter-pack/">letter pack</a>.</p>
</div>
<p class="small">General information, not legal advice.</p>
`;
  return layout({
    title: "While You Wait for the Evaluation: 10-Step Checklist – " + SITE_NAME,
    description: "A free 10-step checklist for parents waiting on a special education evaluation, with a printable contact log.",
    canonical: "/checklist/",
    body,
    head: '<meta name="robots" content="noindex">',
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
<h2>Email list</h2>
<p>If you sign up for the free checklist, your email address is stored by our email provider, MailerLite, so we can send it to you and, now and then, tell you about new guides and states. If you ask for a deadline reminder, MailerLite stores your email, your state, and the one date and step you picked, so we can send two emails about that date (3 days before and the day after). Every email has an unsubscribe link. See the <a href="https://www.mailerlite.com/legal/privacy-policy">MailerLite privacy policy</a>.</p>
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
write("letter-pack/index.html", letterPackPage());
write("checklist/index.html", checklistPage());
write(`${SUSPEND_SLUG}/index.html`, suspendPage());
for (const g of GUIDES) {
  write(`${g.slug}/index.html`, guidePage(g, null));
  for (const c of codes) write(`${g.slug}/${guideStateSlug(c)}/index.html`, guidePage(g, c));
}
for (const [code, s] of Object.entries(STATES)) write(`${s.slug}/index.html`, statePage(code, s));
for (const f of ["calc.js", "letter.js", "app.js", "signup.js", "suspend.js", "suspend-ui.js", "style.css"]) fs.copyFileSync(path.join(ROOT, "src", f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(ROOT, "static"))) fs.copyFileSync(path.join(ROOT, "static", f), path.join(OUT, f));

const urls = ["/", ...GUIDES.flatMap((g) => [`/${g.slug}/`, ...codes.map((c) => `/${g.slug}/${guideStateSlug(c)}/`)]), "/about/", "/terms/", "/privacy/", "/refunds/", ...Object.values(STATES).map((s) => `/${s.slug}/`), "/letter-pack/", `/${SUSPEND_SLUG}/`];
const today = new Date().toISOString().slice(0, 10);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log("Built", urls.length, "pages for", SITE);
