// One entry per state. Adding a state = adding an entry here plus a rule in calc.js.
// Calendars are typical example dates; users replace them with their district's calendar.
module.exports = {
  NY: {
    name: "New York",
    slug: "new-york-iep-timeline-calculator",
    lastChecked: "2026-11-03",
    years: [
      { first: "2026-09-09", last: "2027-06-25" },
      { first: "2027-09-09", last: "2028-06-23" },
    ],
    closures: `# Example closures - replace with your district calendar
2026-10-12  # Indigenous Peoples' Day
2026-11-03  # Election Day
2026-11-11  # Veterans Day
2026-11-26 to 2026-11-27  # Thanksgiving
2026-12-24 to 2027-01-01  # Winter recess
2027-01-18  # MLK Day
2027-02-15 to 2027-02-19  # Midwinter recess
2027-04-19 to 2027-04-23  # Spring recess
2027-05-31  # Memorial Day
2027-06-18  # Juneteenth (observed)
2027-10-11  # Indigenous Peoples' Day
2027-11-02  # Election Day
2027-11-11  # Veterans Day
2027-11-25 to 2027-11-26  # Thanksgiving
2027-12-24 to 2027-12-31  # Winter recess
2028-01-17  # MLK Day
2028-02-21 to 2028-02-25  # Midwinter recess
2028-04-10 to 2028-04-14  # Spring recess
2028-05-29  # Memorial Day
2028-06-19  # Juneteenth`,
    intro:
      "New York uses two different clocks: the evaluation is counted in calendar days, but the deadline for the Committee on Special Education (CSE) to make a recommendation and arrange services is counted in school days. Enter the date the school received your written consent and this calculator works out both.",
    rules: [
      ["Initial evaluation", "60 calendar days from receipt of consent", "8 NYCRR §200.4(b)(7)"],
      ["CSE recommendation and services arranged", "60 school days from receipt of consent", "8 NYCRR §200.4(d), (e)(1)"],
      ["Private school placement recommended", "30 school days from the recommendation", "8 NYCRR §200.4(e)(1)"],
      ["Annual review", "At least once a year", "8 NYCRR §200.4(f)"],
      ["Reevaluation", "At least every 3 years, no more than once a year unless agreed", "8 NYCRR §200.4(b)(4)"],
    ],
    faq: [
      [
        "Does the 60-day evaluation clock in New York count weekends?",
        "Yes. The evaluation deadline in 8 NYCRR §200.4(b)(7) is 60 days, which the calculator treats as calendar days, so weekends and holidays count. The separate 60-school-day deadline for the CSE recommendation skips days school is not in session.",
      ],
      [
        "When can the 60-day timeline be extended?",
        "The regulation lists two exceptions: the student enrolls in a new district during the timeframe and the parent and district agree in writing to a new completion date, or the parent repeatedly fails or refuses to make the student available for the evaluation.",
      ],
      [
        "What counts as a school day?",
        "A day students attend school for instruction. Weekends, holidays, recesses and summer do not count. Because every district's calendar is different, edit the closure list to match yours.",
      ],
    ],
  },

  PA: {
    name: "Pennsylvania",
    slug: "pennsylvania-iep-timeline-calculator",
    lastChecked: "2026-11-03",
    hasIntellectualDisability: true,
    years: [
      { first: "2026-08-26", last: "2027-06-09" },
      { first: "2027-08-25", last: "2028-06-07" },
    ],
    closures: `# Example closures - replace with your district calendar
2026-09-07  # Labor Day
2026-11-26 to 2026-11-27  # Thanksgiving
2026-12-23 to 2027-01-01  # Winter break
2027-01-18  # MLK Day
2027-02-15  # Presidents' Day
2027-03-26 to 2027-03-29  # Spring break
2027-05-31  # Memorial Day
2027-09-06  # Labor Day
2027-11-25 to 2027-11-26  # Thanksgiving
2027-12-23 to 2027-12-31  # Winter break
2028-01-17  # MLK Day
2028-02-21  # Presidents' Day
2028-04-13 to 2028-04-17  # Spring break
2028-05-29  # Memorial Day`,
    intro:
      "Pennsylvania gives schools 60 calendar days from written consent to finish the Evaluation Report (ER), but summer break is not counted. After that, the IEP meeting must be held within 30 days and services must start within 10 school days of the IEP. Enter the date the school received your signed Permission to Evaluate and this calculator works out each step.",
    rules: [
      ["Evaluation Report to parents", "60 calendar days from consent, summer break excluded", "22 Pa. Code §14.123(b)"],
      ["Permission to Evaluate after an oral request", "Form provided within 10 calendar days", "22 Pa. Code §14.123(c)"],
      ["ER before IEP meeting", "At least 10 school days before, unless waived in writing", "22 Pa. Code §14.123(d)"],
      ["IEP meeting", "Within 30 days of the eligibility determination", "34 CFR §300.323(c)(1)"],
      ["IEP services begin", "No later than 10 school days after the IEP", "22 Pa. Code §14.131(a)(6)"],
      ["Reevaluation", "Every 3 years; every 2 years for intellectual disability", "34 CFR §300.303; 22 Pa. Code §14.124(c)"],
    ],
    faq: [
      [
        "Does summer count toward Pennsylvania's 60-day evaluation timeline?",
        "No. Under 22 Pa. Code §14.123(b), the days from the day after the last day of the spring term up to the day before the first day of the fall term are not counted. Enter your district's last and first days so the calculator can skip them.",
      ],
      [
        "What if I asked for an evaluation verbally?",
        "The school must give you a Permission to Evaluate form within 10 calendar days of an oral request. The 60-day clock starts when the school receives the signed form, not when you first asked.",
      ],
      [
        "Why are students with an intellectual disability reevaluated every 2 years?",
        "Pennsylvania adds this rule in 22 Pa. Code §14.124(c). Tick the box in the calculator to use the 2-year cycle.",
      ],
    ],
  },

  CA: {
    name: "California",
    slug: "california-iep-timeline-calculator",
    hasReferralDate: true,
    lastChecked: "2026-11-08",
    years: [
      { first: "2026-08-12", last: "2027-06-09" },
      { first: "2027-08-11", last: "2028-06-08" },
    ],
    closures: `# Example closures - replace with your district calendar
2026-09-07  # Labor Day
2026-11-11  # Veterans Day
2026-11-23 to 2026-11-27  # Thanksgiving week
2026-12-21 to 2027-01-08  # Winter break
2027-01-18  # MLK Day
2027-02-15  # Presidents' Day
2027-03-29 to 2027-04-02  # Spring break
2027-05-31  # Memorial Day
2027-09-06  # Labor Day
2027-11-11  # Veterans Day
2027-11-22 to 2027-11-26  # Thanksgiving week
2027-12-20 to 2028-01-07  # Winter break
2028-01-17  # MLK Day
2028-02-21  # Presidents' Day
2028-03-27 to 2028-03-31  # Spring break
2028-05-29  # Memorial Day`,
    intro:
      "California counts calendar days, but with a twist: summer and any school break longer than 5 school days don't count. So a 3-week winter break pauses the clock, while a single holiday or a 5-day Thanksgiving week doesn't. Enter the date the school received your signed assessment plan and this calculator works it out.",
    rules: [
      ["Assessment plan sent to you", "15 calendar days after the referral (breaks longer than 5 school days don't count)", "Cal. Educ. Code §56043(a), §56321(a)"],
      ["Time for you to consider the plan", "At least 15 calendar days", "Cal. Educ. Code §56043(b)"],
      ["Assessment done and IEP meeting held", "60 calendar days after consent, not counting summer or breaks longer than 5 school days", "Cal. Educ. Code §56043(c), §56344(a)"],
      ["Referral 30 days or fewer before the school year ends", "Within 30 days after the next school year starts", "Cal. Educ. Code §56344(a)"],
      ["Your child's records", "Within 5 business days of your request, and before any IEP meeting", "Cal. Educ. Code §56043(n), §56504"],
      ["IEP meeting you ask for in writing", "Within 30 days (breaks longer than 5 school days don't count)", "Cal. Educ. Code §56043(l), §56343.5"],
      ["Reevaluation", "At least every 3 years", "Cal. Educ. Code §56043(k)"],
    ],
    faq: [
      [
        "How long does a California school have to hold the IEP meeting after an assessment?",
        "60 calendar days from the date the school receives your written consent to the assessment plan, not counting days between school years or school breaks longer than 5 school days (Cal. Educ. Code §56043(c), §56344(a)).",
      ],
      [
        "Does winter break count toward the 60 days in California?",
        "Not if it's longer than 5 school days. A typical 2 to 3 week winter break pauses the clock. A single holiday, or a break of 5 school days or fewer, still counts.",
      ],
      [
        "How fast does the school have to send me an assessment plan?",
        "Within 15 calendar days of the referral, not counting breaks longer than 5 school days. If the referral comes 10 days or fewer before the end of the school year, the plan is due within the first 10 days of the next school year.",
      ],
    ],
  },
  IL: {
    name: "Illinois",
    slug: "illinois-iep-timeline-calculator",
    lastChecked: "2026-11-03",
    years: [
      { first: "2026-08-19", last: "2027-06-04" },
      { first: "2027-08-18", last: "2028-06-02" },
    ],
    closures: `# Example closures - replace with your district calendar
2026-09-07  # Labor Day
2026-10-12  # Columbus Day
2026-11-11  # Veterans Day
2026-11-25 to 2026-11-27  # Thanksgiving
2026-12-21 to 2027-01-01  # Winter break
2027-01-18  # MLK Day
2027-02-12  # Lincoln's Birthday
2027-02-15  # Presidents' Day
2027-03-01  # Casimir Pulaski Day
2027-03-22 to 2027-03-26  # Spring break
2027-05-31  # Memorial Day
2027-09-06  # Labor Day
2027-10-11  # Columbus Day
2027-11-11  # Veterans Day
2027-11-24 to 2027-11-26  # Thanksgiving
2027-12-20 to 2027-12-31  # Winter break
2028-01-17  # MLK Day
2028-02-21  # Presidents' Day
2028-03-06  # Casimir Pulaski Day
2028-03-20 to 2028-03-24  # Spring break
2028-05-29  # Memorial Day`,
    intro:
      "Illinois counts its evaluation deadline in school days: the evaluation, the eligibility decision and the IEP meeting must all be done within 60 school days after the parent signs consent. If fewer than 60 school days are left in the school year, the deadline moves to before the first day of the next school year. Enter the consent date and this calculator works out which rule applies.",
    rules: [
      ["Decide whether to evaluate after a request", "14 school days", "23 Ill. Adm. Code §226.110(c)(3)"],
      ["Evaluation, eligibility and IEP meeting", "60 school days from the date the parent signs consent", "23 Ill. Adm. Code §226.110(d)"],
      ["Fewer than 60 school days left in the year", "Before the first day of the next school year", "23 Ill. Adm. Code §226.110(d)"],
      ["IEP meeting after a separate eligibility meeting", "Within 30 days", "23 Ill. Adm. Code §226.110(j)"],
      ["Reevaluation", "At least every 3 years", "34 CFR §300.303(b)(2)"],
    ],
    faq: [
      [
        "How many days does an Illinois school have to complete an evaluation?",
        "60 school days from the date the parent signs written consent, under 23 Ill. Adm. Code §226.110(d). That deadline covers the evaluation, the eligibility decision and the IEP meeting.",
      ],
      [
        "What happens if I sign consent near the end of the school year?",
        "If fewer than 60 school days remain in the school year after consent, the eligibility decision and IEP meeting must happen before the first day of the following school year.",
      ],
      [
        "How long does the school have to respond to my request for an evaluation?",
        "14 school days to decide whether an evaluation is needed and, if so, to send you the consent form (§226.110(c)(3)).",
      ],
    ],
  },
};
