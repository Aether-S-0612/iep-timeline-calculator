// Page wiring for a state calculator. Reads its defaults from window.STATE_CONFIG.
(function () {
  const cfg = window.STATE_CONFIG;
  const $ = (id) => document.getElementById(id);
  const form = $("calc-form");
  const out = $("results");
  let lastRows = [];

  function today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function pretty(s) {
    if (!s) return "Could not calculate - check the school calendar dates";
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      weekday: "short", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  function read() {
    return {
      consent: $("consent").value,
      iepDate: $("iep-date").value || null,
      intellectualDisability: $("id-box") ? $("id-box").checked : false,
      years: [
        { first: $("y1-first").value, last: $("y1-last").value },
        { first: $("y2-first").value, last: $("y2-last").value },
      ],
      closures: $("closures").value,
    };
  }

  // Plain-language meaning of each step, for parents reading this for the first time.
  const MEANING = {
    eval: "The school finishes testing your child and shares what it found.",
    iep: "You and the school team sit down together and agree on the plan and support.",
    impl: "Your child should actually start getting the help in the plan.",
    annual: "The team meets again to check progress and update the plan.",
    reeval: "The school looks again at whether your child still needs support, and what kind.",
  };

  function daysFrom(t, s) {
    const a = Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
    const b = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }

  function when(t, s) {
    if (!s) return "";
    const d = daysFrom(t, s);
    if (d === 0) return "today";
    if (d === 1) return "tomorrow";
    if (d > 0) return "in " + d + " days";
    return "passed";
  }

  function render() {
    const input = read();
    if (!input.consent) {
      out.hidden = true;
      return;
    }
    lastRows = IEPCalc.compute(cfg.code, input);
    const t = today();
    $("result-rows").innerHTML = lastRows
      .map((r) => {
        const past = r.date && r.date < t;
        const w = when(t, r.date);
        return (
          '<li class="row' + (past ? " past" : "") + '">' +
          '<div class="row-label">' + esc(r.label) + "</div>" +
          '<div class="row-date">' + esc(pretty(r.date)) + (w ? ' <span class="tag">' + w + "</span>" : "") + "</div>" +
          (MEANING[r.key] ? '<div class="row-meaning">' + esc(MEANING[r.key]) + "</div>" : "") +
          '<div class="row-basis">' + esc(r.basis) + ' &middot; <a href="' + r.citeUrl + '" target="_blank" rel="noopener">' + esc(r.cite) + "</a></div>" +
          (r.note ? '<div class="row-note">' + esc(r.note) + "</div>" : "") +
          "</li>"
        );
      })
      .join("");
    out.hidden = false;
  }

  function download() {
    if (!lastRows.length) return;
    const blob = new Blob([IEPCalc.toICS(cfg.code, lastRows)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "iep-deadlines-" + cfg.code.toLowerCase() + ".ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function init() {
    $("y1-first").value = cfg.years[0].first;
    $("y1-last").value = cfg.years[0].last;
    $("y2-first").value = cfg.years[1].first;
    $("y2-last").value = cfg.years[1].last;
    $("closures").value = cfg.closures;
    $("consent").value = today();
    form.addEventListener("input", render);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      render();
    });
    $("ics").addEventListener("click", download);
    $("print").addEventListener("click", () => window.print());
    render();
  }

  init();
})();
