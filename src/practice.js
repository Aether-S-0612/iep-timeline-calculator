// IEP meeting practice page. Talks to /api/practice; keeps the transcript only in memory.
(function () {
  const P = window.IEPPractice;
  const $ = (id) => document.getElementById(id);
  const setup = $("p-setup"), chat = $("p-chat"), log = $("p-log"), form = $("p-form");
  const input = $("p-input"), send = $("p-send"), finishBtn = $("p-finish"), status = $("p-status"), result = $("p-result");
  if (!setup) return;

  let state, scenario, history = [], busy = false, done = false;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function factList(facts) {
    const ul = el("ul", "p-facts");
    for (const f of facts || []) {
      const li = el("li", null, f.text + " ");
      const a = el("a", null, f.cite);
      a.href = f.url;
      a.target = "_blank";
      a.rel = "noopener";
      li.appendChild(a);
      ul.appendChild(li);
    }
    return ul;
  }

  function addSchool(text) {
    const li = el("li", "p-msg p-school");
    li.appendChild(el("span", "p-who", "School"));
    li.appendChild(el("p", null, text));
    log.appendChild(li);
    li.scrollIntoView({ block: "nearest" });
  }

  function addParent(text) {
    const li = el("li", "p-msg p-parent");
    li.appendChild(el("span", "p-who", "You"));
    li.appendChild(el("p", null, text));
    log.appendChild(li);
  }

  function addCoach(c, facts) {
    const li = el("li", "p-coach");
    li.appendChild(el("span", "p-who", "Tip"));
    li.appendChild(el("p", null, c.tip));
    const checks = el("p", "small p-checks");
    checks.textContent = [
      (c.calm ? "✓" : "○") + " calm",
      (c.specific ? "✓" : "○") + " specific ask",
      (c.in_writing_or_dates ? "✓" : "○") + " in writing or a date",
    ].join("   ");
    li.appendChild(checks);
    if (facts && facts.length) li.appendChild(factList(facts));
    log.appendChild(li);
  }

  function rounds() {
    return history.filter((m) => m.role === "parent").length;
  }

  function setBusy(b, msg) {
    busy = b;
    send.disabled = b || done;
    finishBtn.disabled = b || rounds() === 0;
    input.disabled = b || done;
    status.textContent = msg || "";
  }

  async function post(mode) {
    const r = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, scenario, mode, history }),
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!data.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  }

  setup.addEventListener("submit", (e) => {
    e.preventDefault();
    state = $("p-state").value;
    scenario = $("p-scenario").value;
    history = [{ role: "school", text: P.SCENARIOS[scenario].opener }];
    done = false;
    log.innerHTML = "";
    result.hidden = true;
    result.innerHTML = "";
    chat.hidden = false;
    addSchool(history[0].text);
    setBusy(false, "Rounds left: " + P.LIMITS.maxRounds);
    input.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || done) return;
    const text = input.value.trim();
    if (!text) return;
    history.push({ role: "parent", text });
    addParent(text);
    input.value = "";
    setBusy(true, "The school is thinking…");
    try {
      const d = await post("turn");
      history.push({ role: "school", text: d.school_reply });
      addCoach(d.coach, d.facts);
      addSchool(d.school_reply);
      const left = P.LIMITS.maxRounds - rounds();
      if (d.ended || left <= 0) done = true;
      setBusy(false, done ? "That's the end of this practice. Get your phrase card below." : "Rounds left: " + left);
    } catch (err) {
      history.pop(); // let them try the same line again
      log.removeChild(log.lastChild);
      input.value = text;
      setBusy(false, err.message);
    }
  });

  finishBtn.addEventListener("click", async () => {
    if (busy || rounds() === 0) return;
    setBusy(true, "Writing your phrase card…");
    try {
      const d = await post("finish");
      done = true;
      result.innerHTML = "";
      result.appendChild(el("h2", null, "Your phrase card"));
      result.appendChild(el("p", null, d.summary));
      const ol = el("ol", "p-phrases");
      for (const p of d.phrases) ol.appendChild(el("li", null, p));
      result.appendChild(ol);
      if (d.facts && d.facts.length) {
        result.appendChild(el("h3", null, "Rules worth knowing"));
        result.appendChild(factList(d.facts));
      }
      const s = P.STATES[state];
      const more = el("p", "small");
      more.innerHTML = `Check your dates with the <a href="${s.calc}">${s.name} calculator</a>. If the school misses a date, the <a href="/letter-pack/">letter pack</a> has follow-up letters you can send.`;
      result.appendChild(more);
      const pr = el("button", "ghost no-print", "Print this card");
      pr.type = "button";
      pr.onclick = () => window.print();
      result.appendChild(pr);
      result.hidden = false;
      result.scrollIntoView({ behavior: "smooth" });
      setBusy(false, "");
    } catch (err) {
      setBusy(false, err.message);
    }
  });
})();
