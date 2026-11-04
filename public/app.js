// Page wiring for a state calculator. Reads its defaults from window.STATE_CONFIG.
(function () {
  // Clicking anywhere in a date box opens the calendar (not just the small icon),
  // without focusing a year/month/day part, which the browser would highlight.
  document.querySelectorAll('input[type="date"]').forEach((el) => {
    if (!el.showPicker) return;
    // Mouse only: on phones the system date wheel opens by itself, and blocking the tap breaks it.
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      try { el.showPicker(); e.preventDefault(); } catch (err) {}
    });
  });
  // Key entry works on every page that has a [data-unlock] form (state pages and /unlock/).
  document.querySelectorAll("form[data-unlock]").forEach((f) => {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = f.querySelector(".key-msg");
      const key = f.key.value.trim();
      if (!key) return;
      msg.textContent = "Checking...";
      try {
        const r = await fetch("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
        const d = await r.json();
        if (!d.ok) { msg.textContent = d.error || "That key didn't work."; return; }
        try { localStorage.setItem("iep-letter-unlocked", "1"); } catch (err) {}
        let back = null;
        try { back = localStorage.getItem("iep-last-page"); } catch (err) {}
        if (f.dataset.after === "back") location.href = back || "/";
        else location.reload();
      } catch (err) {
        msg.textContent = "Couldn't check the key right now. Please try again in a minute.";
      }
    });
  });

  const cfg = window.STATE_CONFIG;
  if (!cfg) return;
  try { localStorage.setItem("iep-last-page", location.pathname); } catch (err) {}
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
    renderProgress(t);
    out.hidden = false;
    renderLetter(input, t);
  }

  // "Where am I?" map: consent is done; the first step whose date hasn't come yet is "you are here".
  const SHORT = { eval: "Evaluation", iep: "IEP meeting", impl: "Services start" };
  function renderProgress(t) {
    const steps = lastRows.filter((r) => SHORT[r.key] || (r.key === "iep" && r.date));
    const named = steps.map((r) => ({ name: SHORT[r.key] || r.label, date: r.date }));
    if (cfg.code === "IL") named.forEach((x) => { if (x.name === "IEP meeting") x.name = "Evaluation and IEP meeting"; });
    const all = [{ name: "Consent signed", done: true }].concat(named);
    const here = all.findIndex((x) => !x.done && x.date && x.date >= t);
    const items = all.map((x, i) => {
      let cls = "", note = "";
      if (x.done) { cls = "done"; note = "You did this"; }
      else if (i === here) { cls = "here"; note = "You are here: due " + when(t, x.date); }
      else if (x.date && x.date < t) { cls = "late"; note = "Date passed. Did it happen?"; }
      return '<li class="' + cls + '"><span class="dot"></span><span class="p-name">' + esc(x.name) + '</span>' + (note ? '<span class="p-note">' + esc(note) + "</span>" : "") + "</li>";
    }).join("");
    const doneCount = here === -1 ? all.length : here;
    $("progress").innerHTML = '<p class="p-head">Step ' + Math.min(doneCount + 1, all.length) + " of " + all.length + ". " +
      (here === -1 ? "Every date in this timeline has passed. If a step hasn't happened, the letter below can help." : "You've already done the hardest part: asking.") +
      "</p><ol>" + items + "</ol>";
  }

  // ---- Paid follow-up letter ----
  const pay = window.PAYWALL || { live: false };
  const params = new URLSearchParams(location.search);
  const letterOn = !!window.IEPLetter && $("letter") && (pay.live || params.has("preview"));
  function unlocked() {
    if (params.get("preview") === "full") return true;
    try { return localStorage.getItem("iep-letter-unlocked") === "1"; } catch (e) { return false; }
  }
  const FAKE = "Please reply in writing within five school days and tell me the date this will be completed, the reason for the delay, and who is responsible. ";

  function renderLetter(input, t) {
    if (!letterOn) return;
    const modeEl = document.querySelector('input[name="l-mode"]:checked');
    const mode = modeEl ? modeEl.value : "auto";
    const L = IEPLetter.buildLetter(cfg.code, lastRows, input.consent, t, {
      child: $("l-child").value, parent: $("l-parent").value, school: $("l-school").value, recipient: $("l-recipient").value,
      mode, firstSent: $("l-first-sent").value || null, meetingDate: $("l-meeting").value || input.iepDate || null,
    });
    // The "auto" letter switches between confirming and following up, so its label follows today's date.
    const autoKind = mode === "auto" ? L.kind : IEPLetter.buildLetter(cfg.code, lastRows, input.consent, t, {}).kind;
    $("l-mode-auto-label").textContent = autoKind === "overdue" ? "A date has passed" : "Confirm the dates";
    $("l-escalate-fields").hidden = mode !== "escalate";
    $("l-recap-fields").hidden = mode !== "recap";
    $("why-polite").textContent = IEPLetter.WHY_POLITE[L.kind] || "";
    const para = (x) => "<p>" + esc(x).replace(/\n/g, "<br>") + "</p>";
    const open = unlocked();
    $("letter-eyebrow").textContent = { overdue: "A deadline has passed", escalate: "No reply yet", recap: "After the meeting" }[L.kind] || "Get the dates in writing";
    $("letter-subject").textContent = L.subject;
    $("letter-free").innerHTML = L.paragraphs.slice(0, L.preview).map(para).join("");
    $("letter-rest").innerHTML = open ? L.paragraphs.slice(L.preview).map(para).join("") : "";
    $("letter-lock").hidden = open;
    $("letter-actions").hidden = !open;
    $("letter-edit-note").hidden = !open;
    $("letter-edit-note").textContent = L.kind === "recap"
      ? "Fill in the parts in [brackets] with what was said at the meeting, and delete any line you don't need, before sending."
      : "Something already happened, like you got the report? Edit those lines in your email before sending.";
    $("prep-pack").hidden = !open;
    if (open) {
      $("prep-pack").innerHTML = '<h3 class="prep-title">IEP meeting prep</h3>' +
        IEPLetter.buildPrepPack(cfg.code, $("l-child").value).map((sec) =>
          "<h4>" + esc(sec.title) + "</h4><ul>" + sec.items.map((i) => "<li>" + esc(i).replace(/https:\/\/[^\s]+/g, (u) => '<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https:\/\/(www\.)?/, "").split("/")[0] + "</a>") + "</li>").join("") + "</ul>"
        ).join("") +
        "<h4>Words you'll hear</h4><dl class=\"glossary\">" +
        IEPLetter.buildGlossary(cfg.code).map(([w, d]) => "<dt>" + esc(w) + "</dt><dd>" + esc(d) + "</dd>").join("") + "</dl>" +
        '<button type="button" class="ghost" id="print-prep">Print the prep checklist</button>';
      $("print-prep").onclick = () => { document.body.classList.add("print-prep"); window.print(); document.body.classList.remove("print-prep"); };
    }
    if (!open) {
      document.querySelector(".letter-fake").innerHTML = "<p>" + FAKE.repeat(2) + "</p><p>" + FAKE + "</p>";
      document.querySelectorAll("#letter .price").forEach((n) => (n.textContent = pay.price || ""));
      const buy = $("buy");
      if (pay.checkoutUrl && (pay.checkoutLive || params.has("preview"))) { buy.href = pay.checkoutUrl; buy.classList.remove("disabled"); }
      else { buy.removeAttribute("href"); buy.classList.add("disabled"); buy.textContent = "Coming soon"; }
    } else {
      const text = IEPLetter.toText(L);
      const to = ($("l-to") ? $("l-to").value : "").split(/[,;\s]+/).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).join(",");
      $("send-gmail").href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to) + "&su=" + encodeURIComponent(L.subject) + "&body=" + encodeURIComponent(text);
      $("send-mail").href = "mailto:" + to + "?subject=" + encodeURIComponent(L.subject) + "&body=" + encodeURIComponent(text);
      // Gmail's web compose link doesn't open a draft on phones; there, the mail app (mailto) is the main button.
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
      if (ios) {
        // iPhone: open the Gmail app directly (works when the app is installed).
        $("send-gmail").href = "googlegmail:///co?to=" + encodeURIComponent(to) + "&subject=" + encodeURIComponent(L.subject) + "&body=" + encodeURIComponent(text);
        $("send-gmail").removeAttribute("target");
        $("send-gmail").textContent = "Send with Gmail app";
        $("send-mail").textContent = "Open in my email app";
      } else if (mobile) {
        // Android: the mail-app button lets the parent pick Gmail.
        $("send-gmail").hidden = true;
        $("send-mail").classList.remove("ghost");
        $("send-mail").textContent = "Open in my email app (Gmail)";
      }
      $("copy-letter").onclick = () => {
        navigator.clipboard && navigator.clipboard.writeText("Subject: " + L.subject + "\n\n" + text).then(() => {
          $("copy-letter").textContent = "Copied";
          setTimeout(() => ($("copy-letter").textContent = "Copy letter"), 1500);
        });
      };
      ["send-gmail", "send-mail"].forEach((id) => $(id).addEventListener("click", () => ($("letter-sent-note").hidden = false)));
    }
    $("letter").hidden = false;
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
    // Remember what the parent typed on this page, so a reload doesn't wipe it.
    const saveKey = "iep-form-" + cfg.code;
    const fields = Array.from(document.querySelectorAll("#" + form.id + " input, #" + form.id + " textarea, #letter input"))
      .filter((el) => el.id && el.type !== "submit" && el.type !== "button" && !el.closest("[data-unlock]"));
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey) || "{}");
      fields.forEach((el) => {
        if (!(el.id in saved)) return;
        if (el.type === "checkbox" || el.type === "radio") el.checked = !!saved[el.id];
        else el.value = saved[el.id];
      });
    } catch (e) {}
    const save = () => {
      const data = {};
      fields.forEach((el) => { data[el.id] = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value; });
      try { localStorage.setItem(saveKey, JSON.stringify(data)); } catch (e) {}
    };
    form.addEventListener("input", () => { save(); render(); });
    if ($("letter")) $("letter").addEventListener("input", () => { save(); render(); });
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
