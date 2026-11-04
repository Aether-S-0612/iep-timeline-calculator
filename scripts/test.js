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

console.log("All", n, "checks passed");
