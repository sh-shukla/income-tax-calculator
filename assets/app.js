/* Configurator glue — all tax math lives in engine.js. */
"use strict";
const T = window.TaxEngine;
const $ = (id) => document.getElementById(id);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmt = (n) => Math.round(n).toLocaleString("en-IN");
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
    const e = 1 - Math.pow(1 - p, 3);
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

/* ── giant money input + log-scale slider ──
   A linear 3L–2Cr slider wastes most of its travel above 1Cr; a log scale
   keeps the common range (10–50L) under your thumb. */
function bigInput({ inputId, sliderId, min, max, chipsId, onChange }) {
  const input = $(inputId), slider = $(sliderId);
  const toVal = (t) => {
    const raw = min * Math.pow(max / min, t / 1000);
    const step = raw >= 10000000 ? 500000 : raw >= 1000000 ? 50000 : 10000;
    return Math.round(raw / step) * step;
  };
  const toT = (v) => Math.round(1000 * Math.log(Math.max(v, min) / min) / Math.log(max / min));
  let value = parseInt(input.value.replace(/[^0-9]/g, ""), 10) || min;

  function paint() {
    input.value = fmt(value);
    const t = Math.min(Math.max(toT(value), 0), 1000);
    slider.value = t;
    slider.style.setProperty("--fill", t / 10 + "%");
    if (chipsId) {
      document.querySelectorAll(`#${chipsId} button`).forEach((b) =>
        b.classList.toggle("on", +b.dataset.v === value));
    }
  }
  slider.addEventListener("input", () => { value = toVal(+slider.value); paint(); onChange(value); });
  input.addEventListener("input", () => {
    value = parseInt(input.value.replace(/[^0-9]/g, ""), 10) || 0;
    const t = Math.min(Math.max(toT(Math.max(value, min)), 0), 1000);
    slider.value = t;
    slider.style.setProperty("--fill", t / 10 + "%");
    onChange(value);
  });
  input.addEventListener("blur", paint);
  if (chipsId) {
    document.querySelectorAll(`#${chipsId} button`).forEach((b) =>
      b.addEventListener("click", () => { value = +b.dataset.v; paint(); onChange(value); }));
  }
  paint();
  return { get: () => value };
}

/* ── compare tile ── */
function tile(el, title, tag, gross, bd, isWinner, openMath) {
  if (!el.dataset.built) {
    el.dataset.built = "1";
    el.innerHTML = `<span class="badge"></span><h3></h3><div class="tag"></div>
      <div class="big" data-num></div><div class="sub">in hand every month</div>
      <div class="mid"><span data-tax></span> <em>total tax · <span data-rate></span> effective</em></div>
      <div class="bar"><i></i></div>
      <div class="barlabel"><b data-th></b><span data-yr></span></div>
      <details${openMath ? " open" : ""}><summary>See the math</summary><table></table></details>`;
  }
  el.querySelector(".badge").textContent = isWinner ? "Best for you" : "";
  el.querySelector("h3").textContent = title;
  el.querySelector(".tag").textContent = tag;
  countUp(el.querySelector("[data-num]"), (gross - bd.total) / 12, (n) => inr(n) + "/mo");
  countUp(el.querySelector("[data-tax]"), bd.total);
  el.querySelector("[data-rate]").textContent = (gross ? (bd.total / gross) * 100 : 0).toFixed(1) + "%";
  el.querySelector(".bar i").style.width = (gross ? Math.max(0, 100 - (bd.total / gross) * 100) : 100) + "%";
  el.querySelector("[data-th]").textContent = inr(gross - bd.total) + " kept this year";
  el.querySelector("[data-yr]").textContent = "";
  const rows = [["Taxable income", inr(bd.taxable)], ["Slab tax", inr(bd.slabTax)]];
  if (bd.rebate) rows.push(["87A rebate", "− " + inr(bd.rebate)]);
  if (bd.marginalRelief) rows.push(["Marginal relief", "− " + inr(bd.marginalRelief)]);
  if (bd.surcharge) rows.push(["Surcharge", "+ " + inr(bd.surcharge)]);
  if (bd.surchargeRelief) rows.push(["Surcharge relief", "− " + inr(bd.surchargeRelief)]);
  rows.push(["Cess 4%", "+ " + inr(bd.cess)], ["Total", inr(bd.total)]);
  el.querySelector("table").innerHTML = rows
    .map(([k, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ""}><td>${k}</td><td>${v}</td></tr>`).join("");
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
let fteValue;
function renderFTE() {
  const gross = fteValue.get();
  const d = fteDeductions();
  const nb = T.newRegimeTax(T.salariedTaxable(gross, "new", d));
  const ob = T.oldRegimeTax(T.salariedTaxable(gross, "old", d), $("fte-age").value);
  const best = Math.min(nb.total, ob.total);
  const bestName = nb.total <= ob.total ? "New regime" : "Old regime";
  countUp($("fte-keep"), gross - best);
  $("fte-keepsub").innerHTML =
    `with the <strong>${bestName.toLowerCase()}</strong> — ${inr((gross - best) / 12)} in hand every month` +
    (Math.abs(nb.total - ob.total) >= 1 ? ` · saves <strong>${inr(Math.abs(nb.total - ob.total))}</strong> over the other` : "");
  tile($("fte-new"), "New regime", "₹75k standard deduction + employer NPS", gross, nb, nb.total <= ob.total);
  tile($("fte-old"), "Old regime", "₹50k standard deduction + your investments", gross, ob, ob.total < nb.total);
}

/* ── contractor ── */
let ctValue, ctDigital = 1;
function renderContractor() {
  const receipts = ctValue.get();
  const c = T.contractorIncome(receipts, { digitalShare: ctDigital, expenses: +$("ct-expenses").value || 0 });
  const regBd = T.newRegimeTax(Math.max(0, c.regularIncome));
  const adaEl = $("ct-44ada"), regEl = $("ct-regular");
  let adaBd = null;

  if (c.presumptiveIncome != null) {
    const adaNew = T.newRegimeTax(c.presumptiveIncome);
    const adaOld = T.oldRegimeTax(Math.max(0, c.presumptiveIncome - (+$("ct-deductions").value || 0)));
    adaBd = adaNew.total <= adaOld.total ? adaNew : adaOld;
    const rn = adaBd === adaNew ? "new regime" : "old regime + investments";
    tile(adaEl, "44ADA presumptive", `50% deemed income · ${rn} · ITR-4`, receipts, adaBd, adaBd.total <= regBd.total);
    tile(regEl, "Regular books", "receipts − expenses · new regime · ITR-3", receipts, regBd, regBd.total < adaBd.total);
  } else {
    delete adaEl.dataset.built;
    adaEl.innerHTML = `<h3>44ADA presumptive</h3><div class="tag">not available at these receipts</div>
      <p class="note" style="margin-top:14px">${inr(receipts)} is past the limit — ₹50L, or ₹75L only when ≥95% of receipts are digital (§58, ITA 2025). Regular books with ITR-3 apply; a tax audit may too.</p>`;
    tile(regEl, "Regular books", "receipts − expenses · new regime · ITR-3", receipts, regBd, true);
  }

  const winBd = adaBd && adaBd.total <= regBd.total ? adaBd : regBd;
  const winName = adaBd && adaBd.total <= regBd.total ? "44ADA — no books, no audit" : "regular books";
  countUp($("ct-keep"), receipts - winBd.total);
  $("ct-keepsub").innerHTML = `with <strong>${winName}</strong> — ${inr((receipts - winBd.total) / 12)} in hand every month`;

  const presumptive = !!(adaBd && adaBd.total <= regBd.total);
  const sched = T.advanceTaxSchedule(winBd.total, presumptive);
  $("ct-advance").innerHTML =
    (sched.length === 0
      ? `<p class="tl-note">Liability ≤ ₹10,000 — no advance tax needed.</p>`
      : sched.map((s) => `<div class="tl-card"><div class="due">${s.due}</div><div class="amt">${inr(s.amount)}</div><div class="cum">${s.cumulative * 100}% cumulative</div></div>`).join("") +
        `<p class="tl-note">${presumptive ? "44ADA perk: everything in one instalment. " : ""}Miss a date and interest runs 1%/month (234B/C). Client TDS counts toward these.</p>`);
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
    return `<tr><td>${inr(g)}</td><td>${inr(nt)}</td><td>${inr((g - nt) / 12)}</td><td>${inr(ot)}</td><td>${inr((g - ot) / 12)}</td>` +
      `<td><span class="chip ${newWins ? "new" : "old"}">${newWins ? "New" : "Old"} · ${inr(Math.abs(nt - ot))}</span></td></tr>`;
  }).join("");
  $("cs-table").innerHTML = head + "<tbody>" + rows + "</tbody>";
}
segment($("cs-seg"), (btn) => { csDed = +btn.dataset.ded; renderCheatsheet(); });
segment($("ct-digital-seg"), (btn) => { ctDigital = +btn.dataset.v; renderContractor(); });

/* ── wire up ── */
fteValue = bigInput({ inputId: "fte-gross", sliderId: "fte-slider", min: 300000, max: 20000000, chipsId: "fte-chips", onChange: renderFTE });
ctValue = bigInput({ inputId: "ct-receipts", sliderId: "ct-slider", min: 500000, max: 10000000, onChange: renderContractor });
["d-c80", "d-nps", "d-d80", "d-hra", "d-homeloan", "d-other", "d-empnps", "fte-age"].forEach((id) => $(id).addEventListener("input", renderFTE));
["ct-expenses", "ct-deductions"].forEach((id) => $(id).addEventListener("input", renderContractor));

renderFTE();
renderContractor();
renderCheatsheet();
