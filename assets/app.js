/* UI glue — all tax math lives in engine.js, nothing is computed here. */
"use strict";
const T = window.TaxEngine;
const $ = (id) => document.getElementById(id);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── animated numbers ── */
const tweens = new WeakMap();
function countUp(el, value, render) {
  render = render || inr;
  const prev = tweens.get(el) ?? 0;
  tweens.set(el, value);
  if (reduced || Math.abs(value - prev) < 1) { el.textContent = render(value); return; }
  const t0 = performance.now(), dur = 380;
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = render(prev + (value - prev) * e);
    if (p < 1 && tweens.get(el) === value) requestAnimationFrame(tick);
  })(t0);
}

/* ── segmented controls ── */
function segment(container, onPick) {
  const pill = container.querySelector(".seg-pill");
  const btns = [...container.querySelectorAll(".seg-btn")];
  function move(btn) {
    pill.style.width = btn.offsetWidth + "px";
    pill.style.transform = `translateX(${btn.offsetLeft - 3}px)`;
  }
  btns.forEach((btn) => btn.addEventListener("click", () => {
    btns.forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    move(btn);
    onPick(btn);
  }));
  requestAnimationFrame(() => move(container.querySelector(".seg-btn.active")));
  addEventListener("resize", () => move(container.querySelector(".seg-btn.active")));
}

segment($("main-tabs"), (btn) => {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  $("tab-" + btn.dataset.tab).classList.add("active");
  scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
});

/* ── regime card ── */
function regimeCard(el, title, tag, gross, bd, isWinner) {
  if (!el.dataset.built) {
    el.dataset.built = "1";
    el.innerHTML = `<span class="crown"></span><h3></h3><div class="tag"></div>
      <div class="big" data-num></div><div class="sub">total tax · <span data-rate></span> effective</div>
      <div class="bar"><i></i></div>
      <div class="barlabel"><span data-th></span><span data-mo></span></div>
      <table></table>`;
  }
  el.classList.toggle("winner", isWinner);
  el.querySelector(".crown").textContent = isWinner ? "🏆" : "";
  el.querySelector("h3").textContent = title;
  el.querySelector(".tag").textContent = tag;
  countUp(el.querySelector("[data-num]"), bd.total);
  el.querySelector("[data-rate]").textContent = (gross ? (bd.total / gross) * 100 : 0).toFixed(1) + "%";
  const keep = gross ? Math.max(0, 100 - (bd.total / gross) * 100) : 100;
  el.querySelector(".bar i").style.width = keep + "%";
  el.querySelector("[data-th]").textContent = inr(gross - bd.total) + " take-home";
  el.querySelector("[data-mo]").textContent = inr((gross - bd.total) / 12) + "/mo";
  const rows = [["Taxable income", inr(bd.taxable)], ["Slab tax", inr(bd.slabTax)]];
  if (bd.rebate) rows.push(["87A rebate", "− " + inr(bd.rebate)]);
  if (bd.marginalRelief) rows.push(["Marginal relief", "− " + inr(bd.marginalRelief)]);
  if (bd.surcharge) rows.push(["Surcharge", "+ " + inr(bd.surcharge)]);
  if (bd.surchargeRelief) rows.push(["Surcharge relief", "− " + inr(bd.surchargeRelief)]);
  rows.push(["Cess 4%", "+ " + inr(bd.cess)]);
  rows.push(["Total", inr(bd.total)]);
  el.querySelector("table").innerHTML = rows
    .map(([k, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ""}><td>${k}</td><td>${v}</td></tr>`)
    .join("");
}

function verdict(el, newTotal, oldTotal, labels) {
  const diff = Math.abs(newTotal - oldTotal);
  el.classList.toggle("warn", newTotal >= oldTotal && diff >= 1);
  if (diff < 1) { el.textContent = "Both options cost the same here."; return; }
  const winner = newTotal < oldTotal ? labels[0] : labels[1];
  el.textContent = `${winner} saves you ${inr(diff)} this year — ${inr(diff / 12)} every month.`;
}

/* ── salaried ── */
function fteDeductions() {
  return {
    c80: +$("d-c80").value || 0, nps: +$("d-nps").value || 0,
    d80: +$("d-d80").value || 0, hra: +$("d-hra").value || 0,
    homeLoan: +$("d-homeloan").value || 0, other: +$("d-other").value || 0,
    employerNPS: +$("d-empnps").value || 0,
  };
}
function renderFTE() {
  const gross = +$("fte-gross").value || 0;
  const d = fteDeductions();
  const nb = T.newRegimeTax(T.salariedTaxable(gross, "new", d));
  const ob = T.oldRegimeTax(T.salariedTaxable(gross, "old", d), $("fte-age").value);
  regimeCard($("fte-new"), "New regime", "₹75k standard deduction + employer NPS", gross, nb, nb.total <= ob.total);
  regimeCard($("fte-old"), "Old regime", "₹50k standard deduction + your investments", gross, ob, ob.total < nb.total);
  verdict($("fte-verdict"), nb.total, ob.total, ["New regime", "Old regime"]);
}

/* ── contractor ── */
function renderContractor() {
  const receipts = +$("ct-receipts").value || 0;
  const digital = +$("ct-digital").value;
  const c = T.contractorIncome(receipts, { digitalShare: digital, expenses: +$("ct-expenses").value || 0 });
  const regBd = T.newRegimeTax(Math.max(0, c.regularIncome));
  const adaEl = $("ct-44ada"), regEl = $("ct-regular");
  let adaBd = null;

  if (c.presumptiveIncome != null) {
    const adaNew = T.newRegimeTax(c.presumptiveIncome);
    const adaOld = T.oldRegimeTax(Math.max(0, c.presumptiveIncome - (+$("ct-deductions").value || 0)));
    adaBd = adaNew.total <= adaOld.total ? adaNew : adaOld;
    const rn = adaBd === adaNew ? "new regime" : "old regime + investments";
    regimeCard(adaEl, "44ADA presumptive", `50% deemed income · ${rn} · ITR-4`, receipts, adaBd, adaBd.total <= regBd.total);
    regimeCard(regEl, "Regular books", "receipts − expenses · new regime · ITR-3", receipts, regBd, regBd.total < adaBd.total);
    verdict($("ct-verdict"), adaBd.total, regBd.total, ["44ADA — no books, no audit —", "Regular books"]);
  } else {
    delete adaEl.dataset.built;
    adaEl.classList.remove("winner");
    adaEl.innerHTML = `<h3>44ADA presumptive</h3><div class="tag">not available at these receipts</div>
      <p class="note" style="margin-top:12px">${inr(receipts)} exceeds the limit — ₹50L, or ₹75L only when ≥95% of receipts are digital (§58, ITA 2025). Regular books with ITR-3 apply; a tax audit may too.</p>`;
    regimeCard(regEl, "Regular books", "receipts − expenses · new regime · ITR-3", receipts, regBd, true);
    const v = $("ct-verdict");
    v.classList.add("warn");
    v.textContent = "Above the 44ADA limit — regular books it is: " + inr(regBd.total) + " tax.";
  }

  const winning = adaBd && adaBd.total <= regBd.total ? adaBd : regBd;
  const presumptive = !!(adaBd && adaBd.total <= regBd.total);
  const sched = T.advanceTaxSchedule(winning.total, presumptive);
  $("ct-advance").innerHTML = "<h3>Advance tax</h3>" +
    (sched.length === 0
      ? `<p class="note">Liability ≤ ₹10,000 — no advance tax needed.</p>`
      : (presumptive ? `<p class="note">44ADA perk: everything in one instalment.</p>` : "") +
        `<table><tr><th>Due</th><th>Cumulative</th><th>Amount</th></tr>` +
        sched.map((s) => `<tr><td>${s.due}</td><td>${s.cumulative * 100}%</td><td>${inr(s.amount)}</td></tr>`).join("") +
        `</table><p class="note" style="margin-top:10px">Miss a date and interest runs at 1%/month (234B/C). Client TDS counts toward these.</p>`);
}

/* ── cheatsheet ── */
const CS_GROSSES = [1000000, 1200000, 1275000, 1500000, 1800000, 2000000, 2500000, 3000000, 4000000, 5000000, 6000000, 7500000, 10000000, 15000000, 20000000];
let csDed = 0;
function renderCheatsheet() {
  const d = { c80: Math.min(csDed, 150000), nps: Math.min(Math.max(csDed - 150000, 0), 50000), d80: Math.min(Math.max(csDed - 200000, 0), 25000), other: Math.max(csDed - 225000, 0) };
  const head = `<thead><tr><th>Gross</th><th>New: tax</th><th>New: /month</th><th>Old: tax</th><th>Old: /month</th><th>Winner saves</th></tr></thead>`;
  const rows = CS_GROSSES.map((g) => {
    const nt = T.newRegimeTax(T.salariedTaxable(g, "new")).total;
    const ot = T.oldRegimeTax(T.salariedTaxable(g, "old", d)).total;
    const newWins = nt <= ot;
    return `<tr><td>${inr(g)}</td><td>${inr(nt)}</td><td>${inr((g - nt) / 12)}</td>` +
      `<td>${inr(ot)}</td><td>${inr((g - ot) / 12)}</td>` +
      `<td><span class="chip ${newWins ? "new" : "old"}">${newWins ? "New" : "Old"} · ${inr(Math.abs(nt - ot))}</span></td></tr>`;
  }).join("");
  $("cs-table").innerHTML = head + "<tbody>" + rows + "</tbody>";
}
segment($("cs-seg"), (btn) => { csDed = +btn.dataset.ded; renderCheatsheet(); });

/* ── slider ↔ input sync ── */
function pair(inputId, sliderId, render) {
  $(sliderId).addEventListener("input", () => { $(inputId).value = $(sliderId).value; render(); });
  $(inputId).addEventListener("input", () => { $(sliderId).value = $(inputId).value; });
}
pair("fte-gross", "fte-slider", renderFTE);
pair("ct-receipts", "ct-slider", renderContractor);

document.querySelectorAll("#tab-fte input, #tab-fte select").forEach((el) => el.addEventListener("input", renderFTE));
document.querySelectorAll("#tab-contractor input, #tab-contractor select").forEach((el) => el.addEventListener("input", renderContractor));

renderFTE();
renderContractor();
renderCheatsheet();
