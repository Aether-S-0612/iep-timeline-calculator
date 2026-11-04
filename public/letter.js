// Follow-up letter generator. Builds a letter to the school from the calculator's rows.
// Pure text building lives in buildLetter (testable in Node); the page UI lives in mount().
(function (root) {
  // What each deadline row means, phrased to fit into a sentence.
  const THING = {
    NY: { eval: "the initial evaluation", iep: "the Committee on Special Education (CSE) recommendation and the arrangement of services" },
    PA: { eval: "the Evaluation Report (ER)", iep: "the IEP meeting", impl: "the start of IEP services" },
    IL: { iep: "the evaluation, the eligibility decision and the IEP meeting" },
  };
  // Shown after the main request. Only rules already verified for the calculator are cited.
  const STATE_EXTRA = {
    NY: "Please also send me copies of the evaluation reports before the CSE meeting, so I have time to read them and prepare questions.",
    PA: "Please also send me the Evaluation Report at least 10 school days before the IEP meeting, as 22 Pa. Code §14.123(d) requires, unless I agree otherwise in writing.",
    IL: "Please also send me copies of the evaluation reports before the meeting, so I have time to read them and prepare questions.",
  };
  const ACTIVE = ["eval", "iep", "impl"];

  function pretty(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }
  function daysBetween(a, b) {
    const t = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return Math.round((t(b) - t(a)) / 86400000);
  }
  function plural(n, w) {
    return n + " " + w + (n === 1 ? "" : "s");
  }

  // info: { child, school, parent, recipient } (all optional)
  // Returns { kind: "overdue" | "confirm", subject, paragraphs: [string], preview: number of free paragraphs }
  function buildLetter(code, rows, consent, today, info) {
    info = info || {};
    const child = (info.child || "").trim() || "[child's name]";
    const school = (info.school || "").trim();
    const parent = (info.parent || "").trim() || "[your name]";
    const recipient = (info.recipient || "").trim() || "Director of Special Education";
    const things = THING[code] || {};
    const steps = rows.filter((r) => ACTIVE.includes(r.key) && r.date && things[r.key]);
    const overdue = steps.filter((r) => r.date < today);

    const p = [];
    p.push("Dear " + recipient + ",");
    p.push(
      "I am the parent of " + child + (school ? ", a student at " + school : "") +
      ". I am writing about " + child + "'s special education evaluation. The district received my signed consent for the evaluation on " + pretty(consent) + "."
    );

    let subject, kind;
    if (overdue.length) {
      kind = "overdue";
      subject = "Follow-up: " + child + "'s special education timeline (deadline passed " + pretty(overdue[0].date) + ")";
      const lines = overdue.map((r) => {
        const late = daysBetween(r.date, today);
        return "Under " + r.cite.split(";")[0].trim() + ", " + things[r.key] + " was due by " + pretty(r.date) + ". That date passed " + plural(late, "day") + " ago.";
      });
      p.push(lines.join(" ") + " As of today, " + (overdue.length > 1 ? "these steps have" : "this has") + " not been completed.");
      p.push(
        "Please reply in writing within five school days and tell me:\n" +
        "1. The date " + (overdue.length > 1 ? "each step" : things[overdue[0].key]) + " will be completed.\n" +
        "2. The reason for the delay.\n" +
        "3. The name and contact information of the person responsible for " + child + "'s evaluation."
      );
    } else {
      kind = "confirm";
      const next = steps.find((r) => r.date >= today) || steps[0];
      subject = "Confirming " + child + "'s special education timeline";
      p.push(
        next
          ? "Based on " + next.cite.split(";")[0].trim() + ", I understand that " + things[next.key] + " must be completed by " + pretty(next.date) + ". Could you please confirm this date in writing?"
          : "Could you please confirm in writing the dates for each step of the evaluation and IEP process?"
      );
      p.push(
        "To help me prepare, please also tell me:\n" +
        "1. Which assessments are planned, and who will do them.\n" +
        "2. The name and contact information of the person responsible for " + child + "'s evaluation.\n" +
        "3. How and when I will be invited to the meeting."
      );
    }
    if (STATE_EXTRA[code]) p.push(STATE_EXTRA[code]);
    p.push(
      "I want to work with the team so " + child + " gets the support they need. I am keeping a copy of this email for my records. Thank you for your help."
    );
    p.push("Sincerely,\n" + parent);
    return { kind, subject, paragraphs: p, preview: 3 };
  }

  // IEP meeting prep pack (part of the paid unlock). Federal cites below are 34 CFR Part 300.
  const REPORT_TIMING = {
    PA: "Pennsylvania requires the school to give you the Evaluation Report at least 10 school days before the IEP meeting, unless you waive this in writing (22 Pa. Code §14.123(d)). If it hasn't arrived, ask for it now.",
    NY: "Ask for copies of every evaluation report at least a week before the CSE meeting, so you are not reading them for the first time at the table.",
    IL: "Ask for copies of every evaluation report at least a week before the eligibility and IEP meeting, so you are not reading them for the first time at the table.",
  };
  function buildPrepPack(code, child) {
    child = (child || "").trim() || "your child";
    return [
      {
        title: "One week before the meeting",
        items: [
          REPORT_TIMING[code] || REPORT_TIMING.NY,
          "Ask who will attend and what each person's role is.",
          "Ask for a draft of the IEP goals, if the school has one. Reading it early makes the meeting shorter and calmer.",
          "Write a one-page \"parent concerns\" note: " + child + "'s strengths, what worries you, and what you want to see change this year. The IEP team must consider the parents' concerns (34 CFR §300.324(a)(1)(ii)).",
          "Decide if you want someone with you: a partner, a friend, or an advocate. You may bring people who know " + child + " (34 CFR §300.321(a)(6)).",
        ],
      },
      {
        title: "Questions to ask at the meeting",
        items: [
          "What did the evaluation show about " + child + "'s strengths?",
          "Which areas does " + child + " qualify for help in, and which were ruled out? Why?",
          "For each goal: how will progress be measured, and how often will I get a progress report?",
          "Exactly which services will " + child + " get, how many minutes a week, and from whom?",
          "Where will services happen: in the classroom or somewhere else?",
          "What accommodations will " + child + " have in class and on tests?",
          "When do services start?",
          "Who is my main contact if something isn't working?",
          "What can we do at home to support the same goals?",
          "When is the next review, and can I ask for a meeting before then?",
        ],
      },
      {
        title: "Before you sign",
        items: [
          "You can ask for time to read the final IEP at home before you sign. You don't have to decide at the table.",
          "If you agree with part of it, ask how to note what you disagree with in writing.",
          "Ask for a copy of everything you sign.",
        ],
      },
      {
        title: "After the meeting",
        items: [
          "Within a day, email a short summary to the team: what was agreed, who will do what, and by when. Ask them to reply if anything is wrong. This becomes your record.",
          "Put the start date of services and the next review date in your calendar.",
        ],
      },
    ];
  }

  function toText(letter) {
    return letter.paragraphs.join("\n\n");
  }

  const api = { buildLetter, buildPrepPack, toText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.IEPLetter = api;
})(typeof window !== "undefined" ? window : globalThis);
