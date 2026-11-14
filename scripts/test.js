// Hand-checked cases. Run: node scripts/test.js
const assert = require("assert");
const path = require("path");
const C = require(path.join(__dirname, "..", "src", "calc.js"));
const S = require(path.join(__dirname, "..", "src", "states.js"));

function run(code, consent, extra = {}) {
  const s = S[code];
  const rows = C.compute(code, { consent, years: s.years, closures: s.closures, ...extra });
  return Object.fromEntries(rows.map((r) => [r.key, r.date]));
}
let n = 0;
function eq(a, b, msg) {
  assert.strictEqual(a, b, msg + ": got " + a + ", want " + b);
  n++;
}

// Engine basics
eq(C.addDays("2026-12-31", 1), "2027-01-01", "year rollover");
eq(C.addYears("2028-02-29", 1), "2029-02-28", "leap day");
const cal = C.makeCal({ years: [{ first: "2026-09-01", last: "2027-06-30" }], closures: "2026-11-26 to 2026-11-27" });
// Mon 2026-11-23 + 1 school day = Tue 11-24; +3 = Mon 11-30 (Thanksgiving Thu/Fri and weekend skipped)
eq(C.addSchoolDays(cal, "2026-11-23", 1), "2026-11-24", "school day +1");
eq(C.addSchoolDays(cal, "2026-11-23", 3), "2026-11-30", "school day skips holiday+weekend");

// PA: consent received in summer (before the first day) -> clock starts on the first day.
// Pittsburgh 2026-27 starts Mon 2026-08-24: day 1 = 08-24, day 60 = 10-22.
const rPA = run("PA", "2026-08-01", { years: [{ first: "2026-08-24", last: "2027-06-08" }, { first: "2027-08-25", last: "2028-06-07" }] });
eq(rPA.eval, "2026-10-22", "PA summer consent starts at first day");

// NY: 2026-11-03 + 60 calendar days = 2027-01-02
let r = run("NY", "2026-11-03");
eq(r.eval, "2027-01-02", "NY eval 60 calendar days");
// NY 60 school days from Tue 2026-11-03 with NY example closures.
// Nov: 4,5,6,9,10,12,13,16-20,23-25,30 = 16 (11-11 and 11-26/27 closed) ; Dec: 1-4,7-11,14-18,21-23 = 17 -> 33
// Jan: 4-8, 11-15, 19-22 (MLK 18th), 25-29 -> 52 ; Feb 1-5 -> 57 ; Feb 8,9,10 -> 60
eq(r.iep, "2027-02-10", "NY 60 school days");
eq(r.annual, "2028-02-10", "NY annual from projected IEP");
eq(r.reeval, "2030-02-10", "NY reeval 3 years");

// PA: consent 2027-05-20, last day 2027-06-09, first day 2027-08-25.
// Days after consent through 06-09 = 20; summer 06-10..08-24 skipped; need 40 more from 08-25 -> 08-25 + 39 = 2027-10-03
r = run("PA", "2027-05-20");
eq(r.eval, "2027-10-03", "PA eval skips summer");
eq(r.iep, "2027-11-02", "PA IEP meeting 30 days after ER");
// PA: 10 school days after Tue 2027-11-02 -> 3,4,5,8,9,10,11,12,15,16 = 2027-11-16
eq(r.impl, "2027-11-16", "PA services within 10 school days");
r = run("PA", "2027-05-20", { intellectualDisability: true });
eq(r.reeval, "2029-11-02", "PA ID reeval 2 years");
// PA consent in fall, no summer involved: 2026-11-03 + 60 = 2027-01-02
eq(run("PA", "2026-11-03").eval, "2027-01-02", "PA eval fall");

// IL: consent 2027-04-15, last day 2027-06-04 -> fewer than 60 school days left -> day before 2027-08-18
r = run("IL", "2027-04-15");
eq(r.iep, "2027-08-17", "IL end-of-year rule");
// IL: consent Tue 2026-11-03 with IL example closures.
// Nov: 4,5,6,9,10,12,13,16-20,23,24,30 = 15 (11-11 and 11-25..27 closed); Dec: 1-4,7-11,14-18 = 14 -> 29
// Jan: 4-8 -> 34, 11-15 -> 39, 19-22 -> 43, 25-29 -> 48; Feb: 1-5 -> 53, 8-11 -> 57 (12th Lincoln), 16,17,18 -> 60
eq(run("IL", "2026-11-03").iep, "2027-02-18", "IL 60 school days");

// Letter generator
const Lt = require(path.join(__dirname, "..", "src", "letter.js"));
function letter(code, consent, today) {
  const s = S[code];
  const rows = C.compute(code, { consent, years: s.years, closures: s.closures });
  return Lt.buildLetter(code, rows, consent, today, { child: "Maya" });
}
let L = letter("NY", "2026-11-03", "2027-01-05");
eq(L.kind, "overdue", "NY letter overdue after eval date");
eq(/8 NYCRR §200\.4\(b\)\(7\)/.test(L.paragraphs[2]), true, "NY letter cites eval rule");
eq(/passed 3 days ago/.test(L.paragraphs[2]), true, "NY letter days late");
L = letter("IL", "2026-11-03", "2026-11-10");
eq(L.kind, "confirm", "IL letter confirm before deadline");
eq(/February 18, 2027/.test(L.paragraphs[2]), true, "IL letter confirms 60 school day date");
eq(/;/.test(letter("PA", "2026-08-01", "2026-11-04").paragraphs[2]), false, "PA letter uses one cite per step");

// Escalation and recap letters
function rowsFor(code, consent) { const s = S[code]; return C.compute(code, { consent, years: s.years, closures: s.closures }); }
let E = Lt.buildLetter("NY", rowsFor("NY", "2026-11-03"), "2026-11-03", "2027-01-20", { child: "Maya", mode: "escalate", firstSent: "2027-01-05" });
eq(E.kind, "escalate", "escalate kind");
eq(/^Dear Superintendent,/.test(E.paragraphs[0]), true, "escalate defaults to superintendent");
eq(/January 5, 2027/.test(E.paragraphs[2]) && /18 days after the deadline/.test(E.paragraphs[2]), true, "escalate cites first email and days late");
eq(/NYSED/.test(E.paragraphs[4]) && /300\.153/.test(E.paragraphs[4]), true, "escalate names state agency and rule");
E = Lt.buildLetter("IL", rowsFor("IL", "2026-11-03"), "2026-11-03", "2026-11-20", { mode: "escalate" });
eq(/must be completed by February 18, 2027/.test(E.paragraphs[2]), true, "escalate before deadline asks to confirm");
eq(/\[date of your first email\]/.test(E.paragraphs[2]), true, "escalate placeholder when no first date");
const R = Lt.buildLetter("PA", [], "2026-11-03", "2026-12-01", { child: "Maya", mode: "recap", meetingDate: "2026-12-01" });
eq(R.kind, "recap", "recap kind");
eq(/December 1, 2026/.test(R.paragraphs[1]), true, "recap meeting date");
eq(/December 8, 2026/.test(R.paragraphs[5]), true, "recap reply-by one week later");
const P = Lt.buildPrepPack("IL", "Maya").map((x) => x.title);
eq(P.includes("The night before") && P.includes("Words that help when you feel rushed") && P.includes("If the school stops answering"), true, "prep pack sections");
eq(Lt.buildGlossary("PA").some(([w]) => w === "NOREP"), true, "PA glossary has NOREP");

const SC = require("../src/suspend.js");
let a = SC.assess({ state: "NY", days: [3, 2] });
eq(a.total + "|" + a.placement, "5|no", "suspend under 10 is not change of placement");
a = SC.assess({ state: "NY", days: [4, 3, 4] });
eq(a.placement, "maybe", "suspend 11 days total is maybe pattern");
eq(a.rows[0].title, "The school must provide services now", "suspend services after 10");
a = SC.assess({ state: "IL", days: [12] });
eq(a.placement + "|" + a.rows.some((r) => /Illinois/.test(r.title)), "yes|true", "suspend single >10 is change of placement; IL meeting");
a = SC.assess({ state: "PA", days: [6, 5, 5] });
eq(a.placement, "yes", "PA over 15 cumulative is change of placement");
a = SC.assess({ state: "PA", days: [1], intellectual: true });
eq(a.placement, "yes", "PA intellectual disability any removal");
a = SC.assess({ state: "NY", days: [6] });
eq(a.rows.some((r) => /3214/.test(r.cite)), true, "NY over 5 days hearing note");
eq(SC.assess({ state: "PA", days: [5, 5] }).rows[0].title, "The next day out is day 11", "suspend exactly 10");

const CAc = require("../src/states.js").CA;
const caRun = (c) => C.compute("CA", { consent: c, years: CAc.years, closures: CAc.closures }).find((r) => r.key === "iep").date;
eq(caRun("2026-10-01"), "2026-11-30", "CA 60 days, 5-day Thanksgiving week still counts");
eq(caRun("2026-12-01"), "2027-02-22", "CA winter break over 5 school days is skipped");
const caRunR = (c, r) => C.compute("CA", { consent: c, referral: r, years: CAc.years, closures: CAc.closures }).find((r) => r.key === "iep").date;
eq(caRunR("2027-05-20", "2027-05-15"), "2027-09-10", "CA referral within 30 days of year end: 30 days into next year");
eq(caRunR("2027-05-20", "2027-04-26"), caRun("2027-05-20"), "CA referral 45 days before year end, consent 20 days before: normal 60-day rule (Sec. 56344(a) keys on referral)");
eq(caRun("2027-05-20") !== "2027-09-10", true, "CA no referral date: 30-day rule not applied from consent");

// IEP meeting practice: request checks and output cleaning (no API calls)
const PD = require("../src/practice-data.js");
const PC = require("../lib/practice-core.js");
const op = PD.SCENARIOS["wait-see"].opener;
const okReq = { scenario: "wait-see", state: "NY", history: [{ role: "school", text: op }, { role: "parent", text: "I'd like to ask for an evaluation in writing." }] };
eq(PC.parseRequest(okReq).error, undefined, "practice valid request");
eq(!!PC.parseRequest({ ...okReq, state: "TX" }).error, true, "practice unknown state rejected");
eq(!!PC.parseRequest({ ...okReq, history: [{ role: "school", text: "made up" }, okReq.history[1]] }).error, true, "practice opener must match");
eq(!!PC.parseRequest({ ...okReq, history: [okReq.history[0], { role: "parent", text: "x".repeat(601) }] }).error, true, "practice 600 char limit");
const long = [{ role: "school", text: op }];
for (let i = 0; i < 9; i++) long.push({ role: "parent", text: "hi" }, { role: "school", text: "ok" });
long.pop();
eq(!!PC.parseRequest({ ...okReq, history: long }).error, true, "practice max 8 rounds");
const cleaned = PC.cleanOutput({ mode: "turn", scenario: "wait-see", state: "NY" }, { school_reply: "Okay, under 34 CFR §300.301 we will send it.", coach: { tip: "Good" }, fact_ids: ["F1", "F3", "S_NY", "S_PA", "X"] });
eq(cleaned.school_reply, "Okay, we will send it.", "practice citation scrubbed from AI text");
eq(cleaned.facts.map((f) => f.id).join(","), "F1,S_NY", "practice only allowed fact ids kept");
for (const [id, sc] of Object.entries(PD.SCENARIOS)) for (const f of sc.facts) eq(f === "STATE" || !!PD.FACTS[f], true, "practice fact exists " + id + " " + f);
eq(PC.buildParams(PC.parseRequest(okReq)).model, "claude-haiku-5-5", "practice default model");
eq("temperature" in PC.buildParams(PC.parseRequest(okReq)), false, "practice no sampling params");

console.log("All", n, "checks passed");
