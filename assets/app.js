/* UI glue — all tax math lives in engine.js, nothing is computed here. */
"use strict";
const T = window.TaxEngine;
const $ = (id) => document.getElementById(id);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

/* ── tabs ── */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("tab-" + btn.dataset.tab).classList.add("active");
  });
});

/* ── shared renderers ── */
function regimeCard(el, title, tag, gross, bd, isWinner) {
  el.classList.toggle("winner", isWinner);
  const rows = [
    ["Taxable income", inr(bd.taxable)],
    ["Slab tax", inr(bd.slabTax)],
  ];
  if (bd.rebate) rows.push(["87A rebate", "− " + inr(bd.rebate)]);
  if (bd.marginalRelief) rows.push(["Marginal relief", "− " + inr(bd.marginalRelief)]);
  if (bd.surcharge) rows.push(["Surcharge", "+ " + inr(bd.surcharge)]);
  if (bd.surchargeRelief) rows.push(["Surcharge relief", "− " + inr(bd.surchargeRelief)]);
  rows.push(["Health & edu cess 4%", "+ " + inr(bd.cess)]);
  el.innerHTML =
    `<h3>${title} ${isWinner ? "🏆" : ""}</h3><div class="tag">${tag}</div>` +
    `<div class="big">${inr(bd.total)}</div><div class="tag">total tax</div>` +
    `<div class="takehome">${inr(gross - bd.total)} take-home · ${inr((gross - bd.total) / 12)}/month</div>` +
    `<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}` +
    `<tr class="total"><td>Effective rate</td><td>${gross ? ((bd.total / gross) * 100).toFixed(1) : 0}%</td></tr></table>`;
}

function verdict(el, newTotal, oldTotal, labels) {
  const diff = Math.abs(newTotal - oldTotal);
  if (diff < 1) { el.textContent = "Both options cost the same here."; return; }
  const winner = newTotal < oldTotal ? labels[0] : labels[1];
  el.classList.toggle("warn", newTotal >= oldTotal);
  el.textContent = `${winner} saves you ${inr(diff)} this year (${inr(diff / 12)}/month).`;
}

/* ── salaried ── */
function fteDeductions() {
  return {
    c80: +$("d-c80").value || 0,
    nps: +$("d-nps").value || 0,
    d80: +$("d-d80").value || 0,
    hra: +$("d-hra").value || 0,
    homeLoan: +$("d-homeloan").value || 0,
    other: +$("d-other").value || 0,
    employerNPS: +$("d-empnps").value || 0,
  };
}

function renderFTE() {
  const gross = +$("fte-gross").value || 0;
  const age = $("fte-age").value;
  const d = fteDeductions();
  const nb = T.newRegimeTax(T.salariedTaxable(gross, "new", d));
  const ob = T.oldRegimeTax(T.salariedTaxable(gross, "old", d), age);
  regimeCard($("fte-new"), "New regime", "₹75k std deduction + employer NPS", gross, nb, nb.total <= ob.total);
  regimeCard($("fte-old"), "Old regime", "₹50k std deduction + your investments", gross, ob, ob.total < nb.total);
  verdict($("fte-verdict"), nb.total, ob.total, ["New regime", "Old regime"]);
}

/* ── contractor ── */
function renderContractor() {
  const receipts = +$("ct-receipts").value || 0;
  const digital = +$("ct-digital").value;
  const expenses = +$("ct-expenses").value || 0;
  const oldDed = +$("ct-deductions").value || 0;
  const c = T.contractorIncome(receipts, { digitalShare: digital, expenses });

  const adaEl = $("ct-44ada");
  const regEl = $("ct-regular");

  // Regular books: income minus expenses, new regime (usually better; shown plainly).
  const regBd = T.newRegimeTax(Math.max(0, c.regularIncome));
  let adaBd = null;

  if (c.presumptiveIncome != null) {
    // 44ADA: best of new regime vs old regime with chapter VI-A investments.
    const adaNew = T.newRegimeTax(c.presumptiveIncome);
    const adaOld = T.oldRegimeTax(Math.max(0, c.presumptiveIncome - oldDed));
    adaBd = adaNew.total <= adaOld.total ? adaNew : adaOld;
    const regimeName = adaBd === adaNew ? "new regime" : "old regime + investments";
    regimeCard(adaEl, "44ADA presumptive", `50% of receipts deemed income · ${regimeName} · ITR-4`, receipts, adaBd, adaBd.total <= regBd.total);
    regimeCard(regEl, "Regular books", "receipts − actual expenses · new regime · ITR-3", receipts, regBd, regBd.total < adaBd.total);
    verdict($("ct-verdict"), adaBd.total, regBd.total, ["44ADA (no books, no audit)", "Regular books"]);
  } else {
    adaEl.classList.remove("winner");
    adaEl.innerHTML = `<h3>44ADA presumptive</h3><div class="tag">not available</div>
      <p class="note">Receipts ${inr(receipts)} exceed the limit (₹50L, or ₹75L only when ≥95% of receipts are digital — §58, ITA 2025). Regular books with ITR-3 it is; a tax audit may apply.</p>`;
    regimeCard(regEl, "Regular books", "receipts − actual expenses · new regime · ITR-3", receipts, regBd, true);
    $("ct-verdict").classList.add("warn");
    $("ct-verdict").textContent = "Above the 44ADA limit — regular books apply. Tax below: " + inr(regBd.total);
  }

  // Advance tax schedule for whichever option wins.
  const winning = adaBd && adaBd.total <= regBd.total ? adaBd : regBd;
  const presumptive = !!(adaBd && adaBd.total <= regBd.total);
  const sched = T.advanceTaxSchedule(winning.total, presumptive);
  $("ct-advance").innerHTML =
    "<h3>Advance tax</h3>" +
    (sched.length === 0
      ? `<p class="note">Liability ≤ ₹10,000 — no advance tax needed.</p>`
      : (presumptive ? `<p class="note">44ADA perk: one single instalment.</p>` : "") +
        `<table><tr><th>Due date</th><th>Cumulative</th><th>Amount</th></tr>` +
        sched.map((s) => `<tr><td>${s.due}</td><td>${s.cumulative * 100}%</td><td>${inr(s.amount)}</td></tr>`).join("") +
        `</table><p class="note">Miss these and interest runs at 1%/month (234B/234C). TDS already deducted by clients counts toward them.</p>`);
}

/* ── cheatsheet ── */
const CS_GROSSES = [1000000, 1200000, 1275000, 1500000, 1800000, 2000000, 2500000, 3000000, 4000000, 5000000, 6000000, 7500000, 10000000, 15000000, 20000000];

function renderCheatsheet() {
  const ded = +$("cs-preset").value;
  const d = { c80: Math.min(ded, 150000), nps: Math.min(Math.max(ded - 150000, 0), 50000), d80: Math.min(Math.max(ded - 200000, 0), 25000), other: Math.max(ded - 225000, 0) };
  const head = `<tr><th>Gross</th><th>New: tax</th><th>New: take-home/mo</th><th>Old: tax</th><th>Old: take-home/mo</th><th>Winner saves</th></tr>`;
  const rows = CS_GROSSES.map((g) => {
    const nt = T.newRegimeTax(T.salariedTaxable(g, "new")).total;
    const ot = T.oldRegimeTax(T.salariedTaxable(g, "old", d)).total;
    const newWins = nt <= ot;
    return `<tr><td>${inr(g)}</td><td>${inr(nt)}</td><td>${inr((g - nt) / 12)}</td>` +
      `<td>${inr(ot)}</td><td>${inr((g - ot) / 12)}</td>` +
      `<td class="${newWins ? "win-new" : "win-old"}">${newWins ? "New" : "Old"} · ${inr(Math.abs(nt - ot))}</td></tr>`;
  }).join("");
  $("cs-table").innerHTML = head + rows;
}

/* ── wire up ── */
document.querySelectorAll("#tab-fte input, #tab-fte select").forEach((el) => el.addEventListener("input", renderFTE));
document.querySelectorAll("#tab-contractor input, #tab-contractor select").forEach((el) => el.addEventListener("input", renderContractor));
$("cs-preset").addEventListener("input", renderCheatsheet);

renderFTE();
renderContractor();
renderCheatsheet();
