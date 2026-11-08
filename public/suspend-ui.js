// UI for the suspension page. Needs calc.js (IEPCalc) and suspend.js (SuspendCalc). Config in window.SUSPEND_CFG.
(function () {
  var cfg = window.SUSPEND_CFG;
  var $ = function (id) { return document.getElementById(id); };
  var list = $("s-list");
  function addRow(v) {
    var n = list.children.length + 1;
    var li = document.createElement("li");
    li.innerHTML = '<label>Suspension ' + n + ': <input type="number" min="0" max="180" inputmode="numeric" class="s-days" value="' + (v || "") + '"> school days</label>';
    list.appendChild(li);
  }
  [3, 2].forEach(addRow);
  $("s-add").onclick = function () { addRow(""); list.lastChild.querySelector("input").focus(); };
  $("s-state").onchange = function () { $("s-id-wrap").hidden = this.value !== "PA"; run(); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(d) {
    return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  function run() {
    var st = $("s-state").value;
    var days = [].map.call(document.querySelectorAll(".s-days"), function (i) { return +i.value || 0; });
    var r = SuspendCalc.assess({ state: st, days: days, intellectual: st === "PA" && $("s-id").checked });
    var html = '<p class="s-total"><strong>' + r.total + ' school day' + (r.total === 1 ? "" : "s") + '</strong> out of school this year' + (r.longest ? ' · longest single suspension: ' + r.longest : "") + '</p>';
    var dec = $("s-decision").value;
    if (dec && (r.placement === "yes" || r.placement === "maybe")) {
      var c = cfg[st];
      var due = IEPCalc.addSchoolDays(IEPCalc.makeCal({ years: c.years, closures: c.closures }), dec, 10);
      if (due) html += '<p class="s-due">Manifestation review due by <strong>' + fmt(due) + '</strong> (10 school days after ' + fmt(dec) + ', using a typical ' + esc(c.name) + ' school calendar. Your district\'s days off can move it.)</p>';
    }
    html += r.rows.map(function (row) {
      return '<div class="s-row s-' + row.tone + '"><h3>' + esc(row.title) + '</h3><p>' + esc(row.text) + '</p><p class="small">' + esc(row.cite) + '</p></div>';
    }).join("");
    $("s-out").innerHTML = html;
  }
  document.addEventListener("input", function (e) { if (e.target.closest("#s-form")) run(); });
  $("s-id").onchange = run;
  run();
})();
