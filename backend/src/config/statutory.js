/**
 * Statutory payroll rates, caps and defaults — the single source of truth.
 *
 * These are government-notified figures (PF/EPF, EPS, ESI, Bonus, Gratuity).
 * They previously lived as inline literals across payslipCalculator.js,
 * candidateController.js, ecrController.js and complianceController.js, which
 * meant a rate change had to be edited in four places and could silently drift.
 * Import from here instead. Values are unchanged from the originals.
 */

// ---- Provident Fund (EPF) ----
const PF_EMPLOYEE_RATE = 0.12;      // 12% of EPF wages
const PF_MAX_CONTRIBUTION = 1800;   // cap: 12% of the 15,000 wage ceiling
const EPF_WAGES_CAP = 15000;        // EPF/EPS wage ceiling
const EPS_RATE = 0.0833;            // 8.33% employer pension share
const EPF_EMPLOYER_DIFF_RATE = 0.0367; // 3.67% employer EPF (after EPS) — for the PF register

// ---- ESI ----
const ESI_EMPLOYEE_RATE = 0.0075;   // 0.75%
const ESI_EMPLOYER_RATE = 0.0325;   // 3.25%
const ESI_GROSS_CEILING = 21000;    // ESI applies when gross < 21,000

// ---- Statutory Bonus (Payment of Bonus Act 1965) ----
const BONUS_RATE = 0.0833;          // 8.33%
const BONUS_WAGE_CAP = 7000;        // bonus computed on min(basic, 7000)
const BONUS_ELIGIBILITY_BASIC = 21000; // only if basic <= 21,000

// ---- Gratuity (Payment of Gratuity Act 1972) ----
const GRATUITY_RATE = 0.0481;       // 4.81% of basic (= 15/26/12)

// ---- Deduction defaults ----
const DEFAULT_PF_DEDUCTION = 1800;
const DEFAULT_PT_DEDUCTION = 200;

module.exports = {
  PF_EMPLOYEE_RATE,
  PF_MAX_CONTRIBUTION,
  EPF_WAGES_CAP,
  EPS_RATE,
  EPF_EMPLOYER_DIFF_RATE,
  ESI_EMPLOYEE_RATE,
  ESI_EMPLOYER_RATE,
  ESI_GROSS_CEILING,
  BONUS_RATE,
  BONUS_WAGE_CAP,
  BONUS_ELIGIBILITY_BASIC,
  GRATUITY_RATE,
  DEFAULT_PF_DEDUCTION,
  DEFAULT_PT_DEDUCTION,
};
