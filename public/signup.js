// Email signup: posts to MailerLite and shows the checklist link either way,
// so a parent never leaves empty-handed if the request fails.
document.querySelectorAll(".signup-form").forEach(function (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var box = form.closest(".signup");
    var done = box.querySelector(".signup-done");
    var btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Sending...";
    fetch(form.action, { method: "POST", body: new FormData(form) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error("not ok");
      })
      .catch(function () {
        done.innerHTML = 'Something went wrong on our side, sorry. You can still <a href="/checklist/">open the checklist here</a>.';
      })
      .then(function () {
        form.hidden = true;
        done.hidden = false;
      });
  });
});
