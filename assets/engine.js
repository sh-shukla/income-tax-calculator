/* Indian income-tax engine — FY 2026-27 (AY 2027-28), Income-tax Act 2025.
 *
 * Verified Nov 2026 against multiple sources (ClearTax, CAclubindia,
 * BankBazaar, filingsetu, rupaywise, finnovate — see README "Sources"):
 *   - Budget 2026 changed nothing: FY 2026-27 keeps the Budget-2025 structure.
 *   - New regime: 0–4L nil, then 5/10/15/20/25% per 4L band, 30% above 24L;
 *     standard deduction ₹75,000; §87A (now §156) rebate ₹60,000 up to ₹12L
 *     taxable with marginal relief; surcharge 10/15/25% capped at 25%.
 *   - Old regime: 2.5L/3L/5L basic exemption by age, 5%/20%/30% slabs,
 *     standard deduction ₹50,000, §87A rebate ₹12,500 up to ₹5L,
 *     surcharge 10/15/25/37%.
 *   - 44ADA (now §58): 50% deemed profit; ₹50L receipts, ₹75L when ≥95%
 *     of receipts are digital.
 * All amounts in ₹. Scope: resident individuals, normal income only
 * (no special-rate income like capital gains).
 */
(function (root) {
  "use strict";

  const CESS = 0.04;

  const NEW_REGIME = {
    stdDeduction: 75000,
    slabs: [
      [400000, 0],
      [800000, 0.05],
      [1200000, 0.10],
      [1600000, 0.15],
      [2000000, 0.20],
      [2400000, 0.25],
      [Infinity, 0.30],
    ],
    rebateLimit: 1200000,
    rebateMax: 60000,
    surcharge: [
      [50000000 * 0, 0], // placeholder, filled below
    ],
  };
  NEW_REGIME.surcharge = [
    [5000000, 0.10],
    [10000000, 0.15],
    [20000000, 0.25],
  ];

  const OLD_REGIME = {
    stdDeduction: 50000,
    exemption: { below60: 250000, senior: 300000, superSenior: 500000 },
    rebateLimit: 500000,
    rebateMax: 12500,
    surcharge: [
      [5000000, 0.10],
      [10000000, 0.15],
      [20000000, 0.25],
      [50000000, 0.37],
    ],
  };

  function slabTaxNew(taxable) {
    let tax = 0;
    let prev = 0;
    for (const [upto, rate] of NEW_REGIME.slabs) {
      if (taxable > prev) tax += (Math.min(taxable, upto) - prev) * rate;
      prev = upto;
    }
    return tax;
  }

  function slabTaxOld(taxable, age) {
    const ex = OLD_REGIME.exemption[age || "below60"];
    const bands = [
      [ex, 0],
      [Math.max(ex, 500000), 0.05],
      [1000000, 0.20],
      [Infinity, 0.30],
    ];
    let tax = 0;
    let prev = 0;
    for (const [upto, rate] of bands) {
      if (taxable > prev && upto > prev) tax += (Math.min(taxable, upto) - prev) * rate;
      prev = Math.max(prev, upto);
    }
    return tax;
  }

  // Surcharge with marginal relief: at each threshold, (tax + surcharge)
  // may not exceed what someone at the threshold pays plus every rupee above it.
  function applySurcharge(taxable, baseTax, table, slabFn) {
    let rate = 0;
    let threshold = 0;
    for (const [limit, r] of table) {
      if (taxable > limit) {
        rate = r;
        threshold = limit;
      }
    }
    if (rate === 0) return { surcharge: 0, relief: 0 };
    const raw = baseTax * rate;
    const atThreshold = slabFn(threshold);
    let prevRate = 0;
    for (const [limit, r] of table) {
      if (threshold > limit) prevRate = r;
    }
    const capped = atThreshold * (1 + prevRate) + (taxable - threshold);
    const total = baseTax + raw;
    if (total > capped) {
      return { surcharge: raw, relief: total - capped };
    }
    return { surcharge: raw, relief: 0 };
  }

  // Tax on taxable income under the new regime, with full breakdown.
  function newRegimeTax(taxable) {
    taxable = Math.max(0, Math.round(taxable));
    const base = slabTaxNew(taxable);
    let rebate = 0;
    let marginalRelief = 0;
    let afterRebate = base;
    if (taxable <= NEW_REGIME.rebateLimit) {
      rebate = Math.min(base, NEW_REGIME.rebateMax);
      afterRebate = base - rebate;
    } else {
      // §87A marginal relief: tax never exceeds the excess over ₹12L.
      const excess = taxable - NEW_REGIME.rebateLimit;
      if (base > excess) {
        marginalRelief = base - excess;
        afterRebate = excess;
      }
    }
    const { surcharge, relief } = applySurcharge(taxable, afterRebate, NEW_REGIME.surcharge, slabTaxNew);
    const beforeCess = afterRebate + surcharge - relief;
    const cess = beforeCess * CESS;
    return breakdown(taxable, base, rebate, marginalRelief, surcharge, relief, cess, beforeCess);
  }

  function oldRegimeTax(taxable, age) {
    taxable = Math.max(0, Math.round(taxable));
    const base = slabTaxOld(taxable, age);
    let rebate = 0;
    if (taxable <= OLD_REGIME.rebateLimit) rebate = Math.min(base, OLD_REGIME.rebateMax);
    const afterRebate = base - rebate;
    const { surcharge, relief } = applySurcharge(
      taxable, afterRebate, OLD_REGIME.surcharge, (t) => slabTaxOld(t, age)
    );
    const beforeCess = afterRebate + surcharge - relief;
    const cess = beforeCess * CESS;
    return breakdown(taxable, base, rebate, 0, surcharge, relief, cess, beforeCess);
  }

  function breakdown(taxable, slabTax, rebate, marginalRelief, surcharge, surchargeRelief, cess, beforeCess) {
    const total = Math.round(beforeCess + cess);
    return {
      taxable,
      slabTax: Math.round(slabTax),
      rebate: Math.round(rebate),
      marginalRelief: Math.round(marginalRelief),
      surcharge: Math.round(surcharge),
      surchargeRelief: Math.round(surchargeRelief),
      cess: Math.round(cess),
      total,
    };
  }

  // Salaried: gross CTC-ish salary → taxable income per regime.
  // Old-regime deductions are capped at their legal maxima here so the UI
  // can pass raw inputs. HRA exemption is taken as computed by the user.
  function salariedTaxable(gross, regime, d) {
    d = d || {};
    if (regime === "new") {
      const empNPS = Math.min(d.employerNPS || 0, gross * 0.14);
      return Math.max(0, gross - NEW_REGIME.stdDeduction - empNPS);
    }
    const caps = {
      c80: Math.min(d.c80 || 0, 150000),          // 80C
      nps: Math.min(d.nps || 0, 50000),            // 80CCD(1B)
      d80: Math.min(d.d80 || 0, 100000),           // 80D self+parents ceiling
      hra: d.hra || 0,                             // computed HRA exemption
      homeLoan: Math.min(d.homeLoan || 0, 200000), // 24(b)
      tta: Math.min(d.tta || 0, 10000),            // 80TTA
      other: d.other || 0,
      employerNPS: Math.min(d.employerNPS || 0, gross * 0.10),
    };
    const sum = Object.values(caps).reduce((a, b) => a + b, 0);
    return Math.max(0, gross - OLD_REGIME.stdDeduction - sum);
  }

  // Contractor path. 44ADA (§58, ITA 2025): professionals with receipts up
  // to ₹50L (₹75L when ≥95% digital) may declare 50% of receipts as income.
  function presumptiveEligibility(receipts, digitalShare) {
    if (receipts <= 5000000) return { eligible: true, limit: 5000000 };
    if (receipts <= 7500000 && digitalShare >= 0.95) return { eligible: true, limit: 7500000 };
    return { eligible: false, limit: digitalShare >= 0.95 ? 7500000 : 5000000 };
  }

  function contractorIncome(receipts, opts) {
    opts = opts || {};
    const digitalShare = opts.digitalShare == null ? 1 : opts.digitalShare;
    const el = presumptiveEligibility(receipts, digitalShare);
    const presumptive = el.eligible ? receipts * Math.max(0.5, opts.profitShare || 0.5) : null;
    const regular = Math.max(0, receipts - (opts.expenses || 0));
    return { eligibility: el, presumptiveIncome: presumptive, regularIncome: regular };
  }

  // Advance tax instalments (liability above ₹10,000).
  function advanceTaxSchedule(totalTax, presumptive) {
    if (totalTax <= 10000) return [];
    if (presumptive) return [{ due: "15 Mar", cumulative: 1.0, amount: totalTax }];
    return [
      { due: "15 Jun", cumulative: 0.15, amount: Math.round(totalTax * 0.15) },
      { due: "15 Sep", cumulative: 0.45, amount: Math.round(totalTax * 0.45) },
      { due: "15 Dec", cumulative: 0.75, amount: Math.round(totalTax * 0.75) },
      { due: "15 Mar", cumulative: 1.0, amount: totalTax },
    ];
  }

  const TaxEngine = {
    FY: "2026-27",
    newRegimeTax,
    oldRegimeTax,
    salariedTaxable,
    contractorIncome,
    presumptiveEligibility,
    advanceTaxSchedule,
    NEW_REGIME,
    OLD_REGIME,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = TaxEngine;
  else root.TaxEngine = TaxEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
