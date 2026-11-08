// IEP timeline engine. Runs in the browser (window.IEPCalc) and in Node (module.exports) for tests.
// All dates are plain "YYYY-MM-DD" strings handled in UTC so time zones never shift a day.
(function (root) {
  const DAY = 86400000;

  function parse(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  function fmt(dt) {
    return dt.toISOString().slice(0, 10);
  }
  function addDays(s, n) {
    return fmt(new Date(parse(s).getTime() + n * DAY));
  }
  function addYears(s, n) {
    const dt = parse(s);
    const out = new Date(Date.UTC(dt.getUTCFullYear() + n, dt.getUTCMonth(), dt.getUTCDate()));
    // Feb 29 -> Feb 28 instead of rolling into March
    if (out.getUTCMonth() !== dt.getUTCMonth()) return fmt(new Date(out.getTime() - out.getUTCDate() * DAY));
    return fmt(out);
  }
  function weekday(s) {
    return parse(s).getUTCDay(); // 0 Sun .. 6 Sat
  }

  // "2026-12-24" or "2026-12-24 to 2027-01-01", one per line; "#" starts a comment.
  function parseClosures(text) {
    const set = new Set();
    for (const raw of (text || "").split("\n")) {
      const line = raw.split("#")[0].trim();
      if (!line) continue;
      const m = line.match(/^(\d{4}-\d{2}-\d{2})(?:\s*(?:to|-|–)\s*(\d{4}-\d{2}-\d{2}))?$/);
      if (!m) continue;
      let d = m[1];
      const end = m[2] || m[1];
      while (d <= end) {
        set.add(d);
        d = addDays(d, 1);
      }
    }
    return set;
  }

  // cal = { years: [{first, last}, ...] sorted, closures: Set }
  function inSession(cal, s) {
    return cal.years.some((y) => s >= y.first && s <= y.last);
  }
  function isSchoolDay(cal, s) {
    const w = weekday(s);
    return w !== 0 && w !== 6 && inSession(cal, s) && !cal.closures.has(s);
  }
  // Day the clock starts is day 0; the Nth school day after it is the deadline.
  function addSchoolDays(cal, s, n) {
    let d = s;
    let count = 0;
    const limit = addDays(s, 3 * 366);
    while (count < n) {
      d = addDays(d, 1);
      if (d > limit) return null;
      if (isSchoolDay(cal, d)) count++;
    }
    return d;
  }
  function schoolDaysRemaining(cal, s) {
    const yr = cal.years.find((y) => s >= addDays(y.first, -400) && s <= y.last);
    if (!yr) return 0;
    let n = 0;
    for (let d = addDays(s, 1); d <= yr.last; d = addDays(d, 1)) if (isSchoolDay(cal, d)) n++;
    return n;
  }
  function nextFirstDay(cal, s) {
    const y = cal.years.find((y) => y.first > s);
    return y ? y.first : null;
  }
  // Calendar days that skip summer: from the day after a spring last day through the day before the next first day.
  function addCalendarDaysSkippingSummer(cal, s, n) {
    let d = s;
    let count = 0;
    while (count < n) {
      d = addDays(d, 1);
      if (isSummer(cal, d)) continue;
      count++;
    }
    return d;
  }
  function isSummer(cal, s) {
    // Before the first entered year: assume last spring ended on the same date a year earlier.
    if (cal.years.length && s < cal.years[0].first) {
      const prevLast = String(+cal.years[0].last.slice(0, 4) - 1) + cal.years[0].last.slice(4);
      if (s > prevLast) return true;
    }
    for (let i = 0; i < cal.years.length - 1; i++) {
      if (s > cal.years[i].last && s < cal.years[i + 1].first) return true;
    }
    return false;
  }

  // California: count calendar days but skip summer and any break longer than 5 school days
  // (a run of non-school days, weekends included, that holds more than 5 weekdays).
  function inLongBreak(cal, s) {
    if (isSummer(cal, s)) return true;
    if (isSchoolDay(cal, s)) return false;
    let a = s, b = s;
    while (!isSchoolDay(cal, addDays(a, -1)) && !isSummer(cal, addDays(a, -1)) && a > addDays(s, -60)) a = addDays(a, -1);
    while (!isSchoolDay(cal, addDays(b, 1)) && !isSummer(cal, addDays(b, 1)) && b < addDays(s, 60)) b = addDays(b, 1);
    let weekdays = 0;
    for (let d = a; d <= b; d = addDays(d, 1)) if (weekday(d) !== 0 && weekday(d) !== 6) weekdays++;
    return weekdays > 5;
  }
  function addCalendarDaysSkippingLongBreaks(cal, s, n) {
    let d = s;
    let count = 0;
    const limit = addDays(s, 3 * 366);
    while (count < n) {
      d = addDays(d, 1);
      if (d > limit) return null;
      if (inLongBreak(cal, d)) continue;
      count++;
    }
    return d;
  }
  function currentLastDay(cal, s) {
    const y = cal.years.find((y) => s >= y.first && s <= y.last);
    return y ? y.last : null;
  }

  function makeCal(opts) {
    const years = (opts.years || []).filter((y) => y.first && y.last).sort((a, b) => (a.first < b.first ? -1 : 1));
    return { years, closures: parseClosures(opts.closures) };
  }

  // Each rule returns rows: { key, label, date, basis, cite, citeUrl, note }
  const STATES = {
    NY: function (input, cal) {
      const c = input.consent;
      const rows = [];
      const evalDue = addDays(c, 60);
      rows.push({
        key: "eval",
        label: "Initial evaluation completed",
        date: evalDue,
        basis: "60 calendar days after the school receives written consent",
        cite: "8 NYCRR §200.4(b)(7)",
        citeUrl: "https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4",
      });
      const svc = addSchoolDays(cal, c, 60);
      rows.push({
        key: "iep",
        label: "CSE recommendation made and services arranged",
        date: svc,
        basis: "60 school days after the school receives written consent",
        cite: "8 NYCRR §200.4(d), (e)(1)",
        citeUrl: "https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4",
        note: "If the CSE recommends an approved private school, the district has 30 school days from that recommendation instead.",
      });
      return finishRows(rows, input, svc, {
        annualCite: "8 NYCRR §200.4(f)",
        annualUrl: "https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4",
        reevalCite: "8 NYCRR §200.4(b)(4)",
        reevalUrl: "https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4",
        reevalYears: 3,
      });
    },

    PA: function (input, cal) {
      const c = input.consent;
      const rows = [];
      const er = addCalendarDaysSkippingSummer(cal, c, 60);
      rows.push({
        key: "eval",
        label: "Evaluation Report (ER) given to parents",
        date: er,
        basis: "60 calendar days after the school receives written consent; summer break days are not counted",
        cite: "22 Pa. Code §14.123(b)",
        citeUrl: "https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-123",
      });
      const earliest = addSchoolDays(cal, er, 10);
      const meeting = addDays(er, 30);
      rows.push({
        key: "iep",
        label: "IEP meeting held",
        date: meeting,
        basis: "Within 30 days of the eligibility determination (dated here from the ER)",
        cite: "34 CFR §300.323(c)(1); 22 Pa. Code §14.123(d)",
        citeUrl: "https://www.law.cornell.edu/cfr/text/34/300.323",
        note:
          "Parents must get the ER at least 10 school days before the meeting unless they waive it in writing" +
          (earliest ? ", so without a waiver the earliest meeting date is about " + earliest + "." : "."),
      });
      const iepDate = input.iepDate || meeting;
      const impl = addSchoolDays(cal, iepDate, 10);
      rows.push({
        key: "impl",
        label: "IEP services begin",
        date: impl,
        basis: "No later than 10 school days after the IEP is completed",
        cite: "22 Pa. Code §14.131(a)(6)",
        citeUrl: "https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-131",
      });
      return finishRows(rows, input, meeting, {
        annualCite: "34 CFR §300.324(b)(1)",
        annualUrl: "https://www.law.cornell.edu/cfr/text/34/300.324",
        reevalCite: input.intellectualDisability ? "22 Pa. Code §14.124(c)" : "34 CFR §300.303(b)(2)",
        reevalUrl: input.intellectualDisability
          ? "https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-124"
          : "https://www.law.cornell.edu/cfr/text/34/300.303",
        reevalYears: input.intellectualDisability ? 2 : 3,
      });
    },

    IL: function (input, cal) {
      const c = input.consent;
      const rows = [];
      const remaining = schoolDaysRemaining(cal, c);
      let due, basis;
      if (remaining < 60) {
        const nf = nextFirstDay(cal, c);
        due = nf ? addDays(nf, -1) : null;
        basis =
          "Fewer than 60 school days (" + remaining + ") remain in this school year after consent, so this must happen before the first day of the next school year";
      } else {
        due = addSchoolDays(cal, c, 60);
        basis = "60 school days after the parent signs written consent";
      }
      rows.push({
        key: "iep",
        label: "Evaluation done, eligibility decided, and IEP meeting held",
        date: due,
        basis,
        cite: "23 Ill. Adm. Code §226.110(d)",
        citeUrl: "https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-23-SS-226.110",
        note: "If eligibility is decided at a separate meeting, the IEP meeting must follow within 30 days of that decision (§226.110(j)).",
      });
      return finishRows(rows, input, due, {
        annualCite: "34 CFR §300.324(b)(1)",
        annualUrl: "https://www.law.cornell.edu/cfr/text/34/300.324",
        reevalCite: "34 CFR §300.303(b)(2)",
        reevalUrl: "https://www.law.cornell.edu/cfr/text/34/300.303",
        reevalYears: 3,
      });
    },

    CA: function (input, cal) {
      const c = input.consent;
      const rows = [];
      const last = currentLastDay(cal, c);
      let due, basis;
      if (last && daysBetweenISO(c, last) <= 30) {
        const nf = nextFirstDay(cal, c);
        due = nf ? addDays(nf, 30) : null;
        basis = "Consent came 30 days or fewer before the end of the school year, so the meeting must be held within 30 days after the next school year starts";
      } else {
        due = addCalendarDaysSkippingLongBreaks(cal, c, 60);
        basis = "60 calendar days after the school receives written consent, not counting summer or school breaks longer than 5 school days";
      }
      rows.push({
        key: "iep",
        label: "Assessment done and IEP meeting held",
        date: due,
        basis,
        cite: "Cal. Educ. Code §56043(c), §56344(a)",
        citeUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56344",
        note: "Services start as soon as possible after you consent to the IEP (§56043(i)).",
      });
      return finishRows(rows, input, due, {
        annualCite: "Cal. Educ. Code §56043(d)",
        annualUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56043",
        reevalCite: "Cal. Educ. Code §56043(k)",
        reevalUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56043",
        reevalYears: 3,
      });
    },
  };

  function daysBetweenISO(a, b) {
    return Math.round((parse(b) - parse(a)) / DAY);
  }

  function finishRows(rows, input, projectedIep, r) {
    const base = input.iepDate || projectedIep;
    if (!base) return rows;
    const from = input.iepDate ? "the IEP date you entered" : "the latest allowed IEP date above";
    rows.push({
      key: "annual",
      label: "Annual IEP review",
      date: addYears(base, 1),
      basis: "At least once a year, counted from " + from,
      cite: r.annualCite,
      citeUrl: r.annualUrl,
    });
    rows.push({
      key: "reeval",
      label: "Reevaluation",
      date: addYears(base, r.reevalYears),
      basis: "At least once every " + r.reevalYears + " years, counted from " + from + " (parent and school can agree in writing to skip it)",
      cite: r.reevalCite,
      citeUrl: r.reevalUrl,
    });
    return rows;
  }

  function compute(state, input) {
    const cal = makeCal(input);
    return STATES[state](input, cal);
  }

  function toICS(state, rows) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IEP Timeline Calculator//EN", "CALSCALE:GREGORIAN"];
    rows.forEach((r, i) => {
      if (!r.date) return;
      const d = r.date.replace(/-/g, "");
      const next = addDays(r.date, 1).replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + state + "-" + r.key + "-" + d + "-" + i + "@iep-timeline",
        "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + d,
        "DTEND;VALUE=DATE:" + next,
        "SUMMARY:IEP deadline: " + r.label,
        "DESCRIPTION:" + (r.basis + " (" + r.cite + "). Estimate only - confirm with your district.").replace(/[,;]/g, "\\$&"),
        "BEGIN:VALARM",
        "TRIGGER:-P7D",
        "ACTION:DISPLAY",
        "DESCRIPTION:IEP deadline in 7 days",
        "END:VALARM",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  const api = { compute, toICS, parseClosures, addSchoolDays, addDays, addYears, makeCal, isSchoolDay, schoolDaysRemaining };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.IEPCalc = api;
})(this);
