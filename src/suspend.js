// 10-day suspension rule for students with IEPs. Runs in the browser (window.SuspendCalc) and in Node for tests.
// Federal: 34 CFR 300.530, 300.536. PA: 22 Pa. Code 14.143. IL: 23 IAC 226.400. NY: 8 NYCRR 201.4, Educ. Law 3214.
(function (root) {
  // input: { state, days: [n, n, ...] (school days per removal), intellectual: bool }
  // returns { total, longest, services, placement: "yes"|"maybe"|"no", placementWhy, rows: [{tone, title, text, cite}] }
  function assess(input) {
    const days = (input.days || []).map(Number).filter((n) => n > 0);
    const total = days.reduce((a, b) => a + b, 0);
    const longest = days.length ? Math.max.apply(null, days) : 0;
    const st = input.state;
    const rows = [];

    // Services after 10 school days in a school year
    if (total > 10) {
      rows.push({
        tone: "warn",
        title: "The school must provide services now",
        text: "Your child has been out more than 10 school days this year. From the 11th day on, the school has to keep providing services so your child can make progress in class and on IEP goals, even while suspended.",
        cite: "34 CFR §300.530(b)(2), (d)",
      });
    } else if (total === 10) {
      rows.push({
        tone: "warn",
        title: "The next day out is day 11",
        text: "Your child has reached 10 school days. If there is another removal this year, the school has to provide services starting on that 11th day.",
        cite: "34 CFR §300.530(b)(2), (d)",
      });
    } else {
      rows.push({
        tone: "ok",
        title: (10 - total) + " school day" + (10 - total === 1 ? "" : "s") + " until the 10-day line",
        text: "Under 10 school days in a year, the school can suspend a child with an IEP the same way it would any student. Once removals add up to more than 10, extra protections start.",
        cite: "34 CFR §300.530(b)",
      });
    }

    // Change of placement
    let placement = "no";
    let why = "";
    if (st === "PA" && input.intellectual && total > 0) {
      placement = "yes";
      why = "In Pennsylvania, any removal from school of a student with an intellectual disability counts as a change of placement (except for weapons, drugs or serious bodily injury).";
    } else if (longest > 10) {
      placement = "yes";
      why = "One suspension was longer than 10 school days in a row. That counts as a change of placement.";
    } else if (st === "PA" && total > 15) {
      placement = "yes";
      why = "In Pennsylvania, more than 15 school days of suspension in one school year automatically counts as a change of placement.";
    } else if (total > 10) {
      placement = "maybe";
      why = "The suspensions add up to more than 10 school days. That becomes a change of placement if they form a pattern: the behavior is substantially similar each time, and things like how long and how close together the suspensions were point that way. The school decides case by case, and you can disagree.";
    }
    const placementCite =
      st === "PA" ? "34 CFR §300.536; 22 Pa. Code §14.143" : "34 CFR §300.536";

    if (placement === "yes" || placement === "maybe") {
      rows.push({
        tone: placement === "yes" ? "warn" : "maybe",
        title: placement === "yes" ? "This is a change of placement" : "This may be a change of placement",
        text: why,
        cite: placementCite,
      });
      rows.push({
        tone: "warn",
        title: "Manifestation review within 10 school days",
        text: (st === "NY" ? "In New York the review should happen immediately if possible, and no later than 10 school days after the decision. The school, you, and the relevant IEP team members meet" : "Within 10 school days of the decision, the school, you, and the relevant IEP team members meet") +
          " to decide whether the behavior was caused by your child's disability, or by the school not following the IEP. You should also get written notice and your procedural safeguards on the day the decision is made.",
        cite: st === "NY" ? "34 CFR §300.530(e), (h); 8 NYCRR §201.4" : "34 CFR §300.530(e), (h)",
      });
      rows.push({
        tone: "info",
        title: "If the answer is yes, your child goes back",
        text: "If the team finds the behavior was a manifestation of the disability, the school has to do a functional behavioral assessment (or review the behavior plan) and return your child to their placement, unless you and the school agree otherwise. The exception is weapons, drugs, or serious bodily injury, where the school can use an interim setting for up to 45 school days.",
        cite: "34 CFR §300.530(f), (g)",
      });
    }

    if (st === "IL" && total > 10) {
      rows.push({
        tone: "info",
        title: "Illinois: an IEP meeting about behavior",
        text: "In Illinois, once suspensions pass 10 school days in a year (or expulsion is possible), the district has to hold an IEP meeting to review your child's behavior plan, or write one if there isn't one.",
        cite: "23 Ill. Adm. Code §226.400",
      });
    }
    if (st === "NY" && longest > 5) {
      rows.push({
        tone: "info",
        title: "New York: a hearing before a long suspension",
        text: "In New York, no student can be suspended for more than 5 school days unless the student and parent were given a fair hearing with reasonable notice. This applies to every student, with or without an IEP.",
        cite: "N.Y. Educ. Law §3214(3)(c)",
      });
    }

    return { total, longest, placement, rows };
  }

  const api = { assess };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SuspendCalc = api;
})(this);
