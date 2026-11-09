# Indian Tax Calculator — FY 2026-27

**Live: [sh-shukla.github.io/income-tax-calculator](https://sh-shukla.github.io/income-tax-calculator/)**

Old vs new regime for salaried people, 44ADA presumptive vs regular books for contractors/freelancers — with the parts most calculators skip: §87A marginal relief, surcharge marginal relief, deduction caps, advance-tax schedules and the compliance fine print.

## What it answers

- **Salaried (FTE):** which regime wins for *your* salary and *your* investments (80C, NPS, 80D, HRA, home-loan interest, employer NPS), with a full breakdown — slab tax, rebate, marginal relief, surcharge, cess — and monthly take-home.
- **Contractor / freelancer / remote-for-foreign-company:** 44ADA (§58, Income-tax Act 2025) presumptive taxation vs regular books, eligibility (₹50L / ₹75L at ≥95% digital receipts), advance-tax instalments, GST registration triggers, 194J TDS recovery.
- **[Cheatsheet](CHEATSHEET.md):** old-vs-new take-home from ₹10L to ₹2Cr, generated from the same engine.

## Correctness

The engine ([assets/engine.js](assets/engine.js)) is the single source of truth — UI, cheatsheet and tests all consume it. Every tricky number is pinned by a test against a **published worked example**, not against the implementation ([tests/engine.test.js](tests/engine.test.js)):

```bash
node tests/engine.test.js       # 23 assertions, incl. ₹12.1L → ₹10,400 marginal relief
node scripts/gen-cheatsheet.js  # regenerates CHEATSHEET.md
```

Covered: 87A rebate (₹60k/₹12L new, ₹12.5k/₹5L old) · 87A marginal relief window (to ~₹12.71L) · surcharge 10/15/25% (new, capped) and 10/15/25/37% (old) · surcharge marginal relief at every threshold · age-based exemptions · deduction caps · 44ADA limits and the 5-year lock-out · advance tax 15/45/75/100 vs the single 44ADA instalment.

## Sources

Rates verified (Nov 2026) across: [ClearTax](https://cleartax.in/s/income-tax-slabs) · [CAclubindia on FY 2026-27 slabs & relief](https://www.caclubindia.com/articles/new-tax-regime-fy-202627-complete-slab-rebate-marginal-relief-reference-56353.asp) · [BankBazaar](https://ndtvmoney.bankbazaar.com/tax/income-tax-slabs.html) · [filingsetu on §87A](https://filingsetu.in/blog/section-87a-rebate) · [finnovate on 44ADA](https://www.finnovate.in/learn/blog/section-44ada-presumptive-tax-for-professionals-explained) · [tax2win freelancer guide](https://tax2win.in/guide/income-tax-return-filing-for-freelancers) · [wisemonk advance-tax dates](https://www.wisemonk.io/blogs/advance-tax-for-freelancers-dates). Key fact: **Budget 2026 changed no slabs** — FY 2026-27 keeps the Budget-2025 structure under the Income-tax Act 2025 (§87A → §156, §44ADA → §58).

## Scope & disclaimer

Resident individuals, normal income only — no capital gains, ESOP perquisites, foreign assets or AMT. Educational tool, **not tax advice**: confirm with the [Income Tax Department's calculator](https://incometax.gov.in) or a CA before filing or choosing a regime.

## License

MIT
