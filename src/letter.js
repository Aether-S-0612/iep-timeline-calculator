// Follow-up letter generator. Builds a letter to the school from the calculator's rows.
// Pure text building lives in buildLetter (testable in Node); the page UI lives in mount().
(function (root) {
  // What each deadline row means, phrased to fit into a sentence.
  const THING = {
    NY: { eval: "the initial evaluation", iep: "the Committee on Special Education (CSE) recommendation and the arrangement of services" },
    PA: { eval: "the Evaluation Report (ER)", iep: "the IEP meeting", impl: "the start of IEP services" },
    IL: { iep: "the evaluation, the eligibility decision and the IEP meeting" },
    CA: { iep: "the IEP meeting to review the assessment" },
  };
  // Shown after the main request. Only rules already verified for the calculator are cited.
  const STATE_EXTRA = {
    NY: "Please also send me copies of the evaluation reports before the CSE meeting, so I have time to read them and prepare questions.",
    PA: "Please also send me the Evaluation Report at least 10 school days before the IEP meeting, as 22 Pa. Code §14.123(d) requires, unless I agree otherwise in writing.",
    IL: "Please also send me copies of the evaluation reports before the meeting, so I have time to read them and prepare questions.",
    CA: "Please also send me copies of my child's records, including the assessment reports, before the IEP meeting. California asks schools to provide records within 5 business days of a request (Cal. Educ. Code §56504).",
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

  // Where to file a written state complaint (34 CFR §300.151–153). Official state pages.
  const COMPLAINT = {
    NY: { agency: "New York State Education Department (NYSED)", url: "https://www.nysed.gov/special-education/state-complaint" },
    PA: { agency: "Pennsylvania Department of Education, Bureau of Special Education", url: "https://www.pa.gov/en/agencies/education/programs-and-services/instruction/elementary-and-secondary-education/special-education/state-complaints-and-dispute-resolution.html" },
    IL: { agency: "Illinois State Board of Education (ISBE)", url: "https://www.isbe.net/Pages/Special-Education-Complaint-Investigation-Process.aspx" },
    CA: { agency: "California Department of Education (CDE)", url: "https://www.cde.ca.gov/sp/se/qa/cmplntproc.asp" },
  };

  // One line per letter on why it's safe to send. Parents are often afraid of "making trouble".
  const WHY_POLITE = {
    confirm: "Why this is polite: you're only asking the school to confirm a date it already has to meet. Schools get emails like this all the time.",
    overdue: "Why this is polite: it states the facts (the date and the rule) and asks for a plan. No blame, no threats. A dated email protects you and the school.",
    escalate: "Why this is still polite: going up one level is the normal next step when a message goes unanswered. Mentioning a state complaint is information, not a threat. Every parent has that right.",
    recap: "Why this helps everyone: a short summary right after the meeting prevents misunderstandings later. Teams usually appreciate it.",
  };

  function addDaysISO(s, n) {
    const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // Letter that goes one level up when the first letter got no reply.
  function buildEscalation(code, rows, consent, today, info) {
    const child = (info.child || "").trim() || "[child's name]";
    const school = (info.school || "").trim();
    const parent = (info.parent || "").trim() || "[your name]";
    const recipient = (info.recipient || "").trim() || "Superintendent";
    const things = THING[code] || {};
    const steps = rows.filter((r) => ACTIVE.includes(r.key) && r.date && things[r.key]);
    const overdue = steps.filter((r) => r.date < today);
    const step = overdue[0] || steps.find((r) => r.date >= today) || steps[0];
    const sent = info.firstSent ? pretty(info.firstSent) : "[date of your first email]";
    const where = COMPLAINT[code] || COMPLAINT.NY;
    const p = [];
    p.push("Dear " + recipient + ",");
    p.push(
      "I am the parent of " + child + (school ? ", a student at " + school : "") +
      ". The district received my signed consent for " + child + "'s special education evaluation on " + pretty(consent) + "."
    );
    let line;
    if (step && overdue.length) {
      line = "Under " + step.cite.split(";")[0].trim() + ", " + things[step.key] + " was due by " + pretty(step.date) +
        ". On " + sent + ", I wrote to the special education office to ask when it will be completed. As of today, " +
        plural(daysBetween(step.date, today), "day") + " after the deadline, I have not received an answer.";
    } else if (step) {
      line = "Under " + step.cite.split(";")[0].trim() + ", " + things[step.key] + " must be completed by " + pretty(step.date) +
        ". On " + sent + ", I wrote to the special education office to ask the school to confirm this date. I have not received an answer.";
    } else {
      line = "On " + sent + ", I wrote to the special education office about the evaluation timeline. I have not received an answer.";
    }
    p.push(line);
    p.push(
      "I am asking for your help to get this back on track. Please reply in writing within five school days and tell me:\n" +
      "1. The date " + (step ? things[step.key] : "each step") + " will be completed.\n" +
      "2. The name and contact information of the person responsible for " + child + "'s evaluation."
    );
    p.push(
      "I would much rather solve this together with the school. If I do not hear back, my next step will be to file a written complaint with the " +
      where.agency + ", as the federal rules allow (34 CFR §300.153)."
    );
    p.push("I am copying the Director of Special Education and keeping a copy of this email for my records. Thank you for your help.");
    p.push("Sincerely,\n" + parent);
    const subject = "Second request: " + child + "'s special education evaluation" + (info.firstSent ? " (no reply since " + pretty(info.firstSent) + ")" : "");
    return { kind: "escalate", subject, paragraphs: p, preview: 3 };
  }

  // Short summary sent right after the IEP meeting, so verbal agreements become a written record.
  function buildRecap(code, today, info) {
    const child = (info.child || "").trim() || "[child's name]";
    const parent = (info.parent || "").trim() || "[your name]";
    const recipient = (info.recipient || "").trim() || "IEP team";
    const met = info.meetingDate ? pretty(info.meetingDate) : "[meeting date]";
    const plan = code === "PA" ? "IEP" : code === "NY" ? "IEP (CSE recommendation)" : "IEP";
    const p = [];
    p.push("Dear " + recipient + ",");
    p.push("Thank you for meeting with me on " + met + " about " + child + "'s " + plan + ". I appreciated the time and care the team gave to " + child + ".");
    p.push("To make sure we are all on the same page, here is my understanding of what we agreed:");
    p.push(
      "1. Services: [what, how many minutes a week, and who provides them]\n" +
      "2. Accommodations: [for example, extra time on tests, preferential seating]\n" +
      "3. Services start on: [date]\n" +
      "4. Next steps: [who will do what, and by when]"
    );
    p.push("Things I am still unsure about, or did not agree with: [write them here, or delete this line]");
    p.push("Please reply by " + pretty(addDaysISO(today, 7)) + " if anything here is different from your notes. Otherwise I will keep this email as our shared record.");
    p.push("Thank you again,\n" + parent);
    return { kind: "recap", subject: "Summary of " + child + "'s IEP meeting" + (info.meetingDate ? " on " + met : ""), paragraphs: p, preview: 3 };
  }

  // info: { child, school, parent, recipient, mode, firstSent, meetingDate } (all optional)
  // mode: "auto" (confirm or overdue, by today's date), "escalate", "recap".
  // Returns { kind: "overdue" | "confirm" | "escalate" | "recap", subject, paragraphs: [string], preview: number of free paragraphs }
  function buildLetter(code, rows, consent, today, info) {
    info = info || {};
    if (info.mode === "escalate") return buildEscalation(code, rows, consent, today, info);
    if (info.mode === "recap") return buildRecap(code, today, info);
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
    CA: "In California the school has to give you your child's records, including assessment reports, within 5 business days of your request and before the IEP meeting (Cal. Educ. Code §56504). Ask now so you can read them at home.",
  };
  function buildPrepPack(code, child) {
    child = (child || "").trim() || "your child";
    const where = COMPLAINT[code] || COMPLAINT.NY;
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
        title: "The night before",
        items: [
          "Put these in one folder: the evaluation report, your parent concerns note, the latest report card, and any letters from doctors or therapists.",
          "At the top of a blank page, write the 3 questions that matter most to you. If time runs short, ask those first.",
          "Plan the practical things: how you'll get there, and who will watch your other children.",
          "Remind yourself: you know " + child + " better than anyone at that table. Your view counts as much as theirs.",
          "Get some sleep. You don't have to decide anything tomorrow. You can always ask for time.",
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
        title: "Words that help when you feel rushed",
        items: [
          "\"I'd like to take this home and read it before I sign.\"",
          "\"Can you show me the data behind that?\"",
          "\"Can we pause for a few minutes? I need a moment.\"",
          "\"What would that look like in " + child + "'s school day?\"",
          "\"Can we write that into the IEP?\" (Spoken promises are easy to forget. Written ones aren't.)",
          "\"I don't agree with that part. Please put my concern in the meeting notes.\"",
          "\"Who will do this, and by when?\"",
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
          "Within a day, send the \"After the meeting\" letter above: what was agreed, who will do what, and by when. Ask them to reply if anything is wrong. This becomes your record.",
          "Put the start date of services and the next review date in your calendar.",
          "Then rest. Meetings like this are tiring, and that's normal.",
        ],
      },
      {
        title: "If the school stops answering",
        items: [
          "First, send the \"No reply yet\" letter above to the superintendent. Many problems get solved at this step.",
          "If there's still no answer, you can file a written state complaint with the " + where.agency + ". It's free and you don't need a lawyer. Start here: " + where.url,
          "The complaint must be in writing and signed. It says which rule wasn't followed and the facts, gives " + child + "'s name, address and school, describes the problem, and says what you'd like to happen (34 CFR §300.153(b)).",
          "It must be about something that happened within the past year (34 CFR §300.153(c)).",
          "Send a copy to your school district at the same time you file it (34 CFR §300.153(d)).",
          "The state has 60 days to investigate and send a written decision. It can take longer only in exceptional circumstances, or if you and the district agree to try mediation first (34 CFR §300.152).",
          "Your state's free Parent Center can help you write it: https://www.parentcenterhub.org/find-your-center/",
        ],
      },
    ];
  }

  // Plain-language glossary (part of the paid unlock). Federal cites are 34 CFR Part 300.
  const STATE_TERMS = {
    NY: [["CSE", "Committee on Special Education. The district team that decides if your child is eligible and what services they get. You are a member of it."]],
    PA: [
      ["ER", "Evaluation Report. The written results of your child's evaluation. You get it before the IEP meeting."],
      ["NOREP", "Notice of Recommended Educational Placement. The Pennsylvania form where you approve, or disagree with, what the school proposes."],
    ],
    IL: [["Eligibility meeting", "The meeting where the team decides, from the evaluation, whether your child qualifies for special education."]],
    CA: [
      ["Assessment plan", "The form that lists which tests the school wants to give your child. Nothing starts until you sign it."],
      ["SELPA", "Special Education Local Plan Area. The group of districts your school belongs to for special education. It has its own procedures and a parent contact."],
    ],
  };
  function buildGlossary(code) {
    return [
      ["IEP", "Individualized Education Program. The written plan of your child's goals, services and supports."],
      ["Consent", "Your signed permission. The evaluation clock starts when the school receives it."],
      ["Evaluation", "Testing and observation to find out if your child has a disability and needs special education."],
    ].concat(STATE_TERMS[code] || [], [
      ["PWN", "Prior Written Notice. A written explanation the school must give you when it proposes or refuses to change something (§300.503)."],
      ["FAPE", "Free Appropriate Public Education. Your child's right to special education and services at no cost to you."],
      ["LRE", "Least Restrictive Environment. Your child should learn alongside classmates without disabilities as much as is appropriate."],
      ["IEE", "Independent Educational Evaluation. An evaluation by someone outside the school. If you disagree with the school's evaluation, you can ask for one at public expense (§300.502)."],
      ["Accommodations", "Changes in how your child learns or is tested, like extra time or a quieter room. The material stays the same."],
      ["Related services", "Support like speech therapy, occupational therapy or counseling that helps your child benefit from school."],
    ]);
  }

  function toText(letter) {
    return letter.paragraphs.join("\n\n");
  }

  const api = { buildLetter, buildPrepPack, buildGlossary, toText, WHY_POLITE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.IEPLetter = api;
})(typeof window !== "undefined" ? window : globalThis);
