/**
 * Shared payroll constants for the salary-entry forms.
 *
 * SPLIT_OPTIONS and PT_RULES were duplicated byte-for-byte in SalaryForm.jsx and
 * CandidateForm.jsx; a change to a split ratio or a state PT slab had to be made
 * in both. Import them from here instead.
 *
 * NOTE: the backend (backend/src/config/statutory.js + payslipCalculator.js) is
 * the authoritative source for what an employee is actually PAID. These frontend
 * constants drive the data-entry UI (CTC → components preview). The statutory
 * rates below are provided so the form previews match the backend; keep them in
 * sync with backend/src/config/statutory.js.
 */

// CTC split presets. HRA is a percentage of Basic (not Gross).
export const SPLIT_OPTIONS = {
  'high-basic': { basic: 87.11, hraOfBasic: 5, label: 'High Basic (87.11%) - Best for PF' },
  '40-40': { basic: 40, hraOfBasic: 40, label: '40% Basic, HRA 40% of Basic' },
  '50-40': { basic: 50, hraOfBasic: 40, label: '50% Basic, HRA 40% of Basic' },
};

// State-wise Professional Tax (monthly).
export const PT_RULES = {
  maharashtra: { name: 'Maharashtra', calculate: (gross) => gross > 10000 ? 200 : gross > 7500 ? 175 : 0 },
  karnataka: { name: 'Karnataka', calculate: (gross) => gross > 15000 ? 200 : gross > 10000 ? 150 : 0 },
  gujarat: { name: 'Gujarat', calculate: (gross) => gross > 12000 ? 200 : gross > 9000 ? 150 : 0 },
  tamilnadu: { name: 'Tamil Nadu', calculate: (gross) => gross > 21000 ? 208 : gross > 15000 ? 180 : 0 },
  westbengal: { name: 'West Bengal', calculate: (gross) => gross > 10000 ? 200 : gross > 6000 ? 150 : 0 },
  custom: { name: 'Custom (Manual Entry)', calculate: () => 0 },
};

// Statutory rates/caps — mirror of backend/src/config/statutory.js.
export const PF_EMPLOYEE_RATE = 0.12;
export const PF_MAX_CONTRIBUTION = 1800;
export const PF_WAGE_CEILING = 15000;      // basic >= 15000 → PF capped at 1800
export const BONUS_RATE = 0.0833;
export const BONUS_WAGE_CAP = 7000;
export const BONUS_ELIGIBILITY_BASIC = 21000;
export const GRATUITY_RATE = 0.0481;
export const DEFAULT_MEDICLAIM = 370;
