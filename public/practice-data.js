// IEP meeting practice: verified facts, state rule cards and scenarios.
// The AI never states law on its own. It may only return fact ids from this file,
// and the page renders the citation text from here. Runs in the browser
// (window.IEPPractice) and in Node / server functions (module.exports).
(function (root) {
  const ecfr = (sec) => `https://www.law.cornell.edu/cfr/text/34/${sec}`;

  // Federal facts (34 CFR Part 300 and OSEP guidance), checked against primary sources 2026-11-08.
  const FACTS = {
    F1: {
      text: "A parent can ask the school for an initial special education evaluation.",
      cite: "34 CFR §300.301(b)",
      url: ecfr("300.301"),
    },
    F2: {
      text: "If the school refuses to evaluate, it has to give you written notice that says what it refused and why.",
      cite: "34 CFR §300.503(a)-(b)",
      url: ecfr("300.503"),
    },
    F3: {
      text: "The U.S. Department of Education says RTI (trying interventions first) can't be used to delay or deny an evaluation.",
      cite: "OSEP Memo 11-07 (2011)",
      url: "https://sites.ed.gov/idea/idea-files/osep-memo-11-07-response-to-intervention-rti-memo/",
    },
    F4: {
      text: "A child can qualify for special education even if they are passing and moving from grade to grade.",
      cite: "34 CFR §300.101(c)(1)",
      url: ecfr("300.101"),
    },
    F5: {
      text: "Schools have a duty to find and evaluate children who may have a disability and need special education (child find).",
      cite: "34 CFR §300.111(a), (c)(1)",
      url: ecfr("300.111"),
    },
    F6: {
      text: "The IEP has to be based on the child's needs, evaluation results and the parent's concerns.",
      cite: "34 CFR §300.324(a)(1)",
      url: ecfr("300.324"),
    },
    F7: {
      text: "If the school breaks a special education rule, you can file a state complaint (within one year).",
      cite: "34 CFR §300.153",
      url: ecfr("300.153"),
    },
    F8: {
      text: "The initial evaluation has a deadline: 60 days from consent, or your state's own timeline.",
      cite: "34 CFR §300.301(c)(1)",
      url: ecfr("300.301"),
    },
  };

  // One rule card per state (same sources as the calculators and guides).
  const STATES = {
    NY: {
      name: "New York",
      calc: "/new-york-iep-timeline-calculator/",
      rule: "Evaluation due 60 calendar days after consent. A referral is only withdrawn if the parent agrees in writing.",
      cite: "8 NYCRR §200.4(a), (a)(9)",
      url: "https://www.law.cornell.edu/regulations/new-york/8-NYCRR-200.4",
    },
    PA: {
      name: "Pennsylvania",
      calc: "/pennsylvania-iep-timeline-calculator/",
      rule: "If you ask out loud, the school must give you a Permission to Evaluate form within 10 calendar days. Report due 60 calendar days after consent, summer not counted.",
      cite: "22 Pa. Code §14.123",
      url: "https://www.law.cornell.edu/regulations/pennsylvania/22-Pa-Code-SS-14-123",
    },
    IL: {
      name: "Illinois",
      calc: "/illinois-iep-timeline-calculator/",
      rule: "The district has 14 school days after your request to decide, and must send written notice if it says no. Evaluation and IEP meeting due within 60 school days of consent.",
      cite: "23 Ill. Adm. Code §226.110",
      url: "https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-23-SS-226.110",
    },
    CA: {
      name: "California",
      calc: "/california-iep-timeline-calculator/",
      rule: "The district must send an assessment plan within 15 days of a written referral. Assessment and IEP meeting due 60 days after you sign, breaks over 5 school days not counted.",
      cite: "Cal. Educ. Code §56043, §56321",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56043",
    },
  };

  // The school's opening line is fixed text, so starting a scenario costs nothing.
  const SCENARIOS = {
    "wait-see": {
      title: "\"Let's wait and see\"",
      opener: "I hear you, and we're watching her closely. Honestly, a lot of kids have a rough fall. Let's see how she does after the holidays and talk again in January.",
      stance: "Friendly but stalling. You want to put off any evaluation request until after the holidays.",
      facts: ["F1", "F5", "F2", "F8", "STATE"],
    },
    "rti-first": {
      title: "\"We need to try interventions first\"",
      opener: "Before we go to a full evaluation, our process is to try interventions first. We'll put him in a reading group for 6 to 8 weeks and track his progress.",
      stance: "Process-focused. You insist the school's intervention process (RTI/MTSS) must happen before any evaluation.",
      facts: ["F3", "F1", "F2", "STATE"],
    },
    passing: {
      title: "\"She's passing, so she won't qualify\"",
      opener: "Her grades are fine. She's passing everything, so to be honest she wouldn't qualify for an IEP anyway.",
      stance: "Confident and dismissive. You believe passing grades mean the child can't qualify.",
      facts: ["F4", "F5", "F1", "F2"],
    },
    "plan-504": {
      title: "\"Let's just do a 504 plan\"",
      opener: "I think a 504 plan would cover what he needs. It's quicker, and we can get some accommodations in place right away without all the testing.",
      stance: "Helpful-sounding. You steer the parent to a 504 plan so you can skip the special education evaluation.",
      facts: ["F5", "F1", "F2", "STATE"],
    },
    "no-staff": {
      title: "\"We don't have staff for that\"",
      opener: "I understand why you're asking for a one-on-one aide, but we just don't have the staff for that right now. Every classroom is stretched.",
      stance: "Apologetic but firm. You say the school can't provide a service because of staffing and budget.",
      facts: ["F6", "F2", "F7"],
    },
    "late-eval": {
      title: "\"The psychologist is backed up\"",
      opener: "We did get your consent form. The problem is our school psychologist is really backed up, so the testing probably won't happen until the spring.",
      stance: "Sympathetic, blaming workload. You say the evaluation will be late because staff are busy.",
      facts: ["F8", "STATE", "F2", "F7"],
    },
  };

  const LIMITS = { maxChars: 600, maxRounds: 8 };

  // Fact ids allowed for a scenario + state. "STATE" means that state's rule card.
  function allowedFacts(scenarioId, state) {
    const sc = SCENARIOS[scenarioId];
    if (!sc || !STATES[state]) return [];
    return sc.facts.map((f) => (f === "STATE" ? "S_" + state : f));
  }

  function factById(id) {
    if (FACTS[id]) return FACTS[id];
    if (/^S_[A-Z]{2}$/.test(id) && STATES[id.slice(2)]) {
      const s = STATES[id.slice(2)];
      return { text: s.rule, cite: s.cite, url: s.url };
    }
    return null;
  }

  const api = { FACTS, STATES, SCENARIOS, LIMITS, allowedFacts, factById };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IEPPractice = api;
})(typeof self !== "undefined" ? self : this);
