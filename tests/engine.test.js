// Engine tests. Every expected value was verified against published worked
// examples (ClearTax / CAclubindia / filingsetu, Nov 2026) before being
// asserted here — the test encodes the sources, not the implementation.
"use strict";
const assert = require("assert");
const T = require("../assets/engine.js");

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log("  ✓ " + name);
  } catch (e) {
    failed++;
    console.error("  ✗ " + name + " — " + e.message);
  }
}

console.log("new regime (FY 2026-27)");
check("₹12L taxable → zero tax (₹60k 87A rebate)", () => {
  assert.strictEqual(T.newRegimeTax(1200000).total, 0);
});
check("₹12.10L → ₹10,400 via marginal relief (published example)", () => {
  const r = T.newRegimeTax(1210000);
  assert.strictEqual(r.total, 10400);
  assert.ok(r.marginalRelief > 0);
});
check("₹12.25L → ₹26,000 via marginal relief (published example)", () => {
  assert.strictEqual(T.newRegimeTax(1225000).total, 26000);
});
check("₹12.75L → relief window over, full slab ₹74,100", () => {
  const r = T.newRegimeTax(1275000);
  assert.strictEqual(r.marginalRelief, 0);
  assert.strictEqual(r.total, 74100);
});
check("₹25L → ₹3,43,200 (standard published example)", () => {
  assert.strictEqual(T.newRegimeTax(2500000).total, 343200);
});
check("salaried ₹12.75L gross → zero tax after ₹75k std deduction", () => {
  const taxable = T.salariedTaxable(1275000, "new");
  assert.strictEqual(taxable, 1200000);
  assert.strictEqual(T.newRegimeTax(taxable).total, 0);
});
check("₹50L → ₹10.8L slab tax, no surcharge", () => {
  const r = T.newRegimeTax(5000000);
  assert.strictEqual(r.surcharge, 0);
  assert.strictEqual(r.total, Math.round(1080000 * 1.04));
});
check("₹50.1L → surcharge marginal relief caps at ₹10.9L + cess", () => {
  const r = T.newRegimeTax(5010000);
  assert.ok(r.surchargeRelief > 0);
  assert.strictEqual(r.total, Math.round(1090000 * 1.04));
});
check("₹2.5Cr → surcharge capped at 25% in new regime", () => {
  const r = T.newRegimeTax(25000000);
  const base = r.slabTax;
  assert.ok(Math.abs(r.surcharge - base * 0.25) < 1);
});

console.log("old regime");
check("₹10L taxable → ₹1,17,000 (classic example)", () => {
  assert.strictEqual(T.oldRegimeTax(1000000).total, 117000);
});
check("₹5L taxable → zero via ₹12,500 rebate", () => {
  assert.strictEqual(T.oldRegimeTax(500000).total, 0);
});
check("senior citizen exemption ₹3L respected (visible pre-rebate)", () => {
  assert.strictEqual(T.oldRegimeTax(300000, "senior").slabTax, 0);
  // below-60 has ₹2,500 slab tax at ₹3L, though 87A wipes the total
  assert.strictEqual(T.oldRegimeTax(300000, "below60").slabTax, 2500);
  assert.strictEqual(T.oldRegimeTax(300000, "below60").total, 0);
});
check("deduction caps enforced (80C capped at 1.5L, NPS 50k, 24b 2L)", () => {
  const taxable = T.salariedTaxable(2000000, "old", {
    c80: 500000, nps: 90000, homeLoan: 400000, d80: 25000,
  });
  // 20L - 50k std - 1.5L - 50k - 2L - 25k = 15,25,000
  assert.strictEqual(taxable, 1525000);
});
check("₹6Cr old regime → 37% surcharge band applies", () => {
  const r = T.oldRegimeTax(60000000);
  assert.ok(Math.abs(r.surcharge - r.slabTax * 0.37) < 1);
});

console.log("contractor / 44ADA (§58 ITA 2025)");
check("₹45L receipts eligible regardless of mode", () => {
  assert.ok(T.presumptiveEligibility(4500000, 0).eligible);
});
check("₹60L needs ≥95% digital", () => {
  assert.ok(!T.presumptiveEligibility(6000000, 0.9).eligible);
  assert.ok(T.presumptiveEligibility(6000000, 0.96).eligible);
});
check("₹80L never eligible", () => {
  assert.ok(!T.presumptiveEligibility(8000000, 1).eligible);
});
check("₹60L digital receipts → ₹30L deemed → ₹4,99,200 new-regime tax", () => {
  const c = T.contractorIncome(6000000, { digitalShare: 1 });
  assert.strictEqual(c.presumptiveIncome, 3000000);
  assert.strictEqual(T.newRegimeTax(c.presumptiveIncome).total, 499200);
});
check("regular path: receipts − expenses", () => {
  const c = T.contractorIncome(6000000, { digitalShare: 0.5, expenses: 2200000 });
  assert.strictEqual(c.presumptiveIncome, null);
  assert.strictEqual(c.regularIncome, 3800000);
});
check("advance tax: presumptive = one instalment on 15 Mar", () => {
  const s = T.advanceTaxSchedule(499200, true);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].due, "15 Mar");
});
check("advance tax: regular = 15/45/75/100", () => {
  const s = T.advanceTaxSchedule(400000, false);
  assert.strictEqual(s.length, 4);
  assert.strictEqual(s[1].amount, 180000);
});
check("no advance tax under ₹10k liability", () => {
  assert.strictEqual(T.advanceTaxSchedule(9000, true).length, 0);
});

if (failed) {
  console.error("\n" + failed + " test(s) FAILED");
  process.exit(1);
}
console.log("\nall tests passed");
