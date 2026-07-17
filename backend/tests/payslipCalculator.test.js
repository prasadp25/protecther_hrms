const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculatePayslip } = require('../src/utils/payslipCalculator');

// Standard structure: ₹20,000 CTC — 15k basic + 5k incentive, PF + ESI enabled
const structure20k = {
  basic_salary: 15000,
  hra: 0,
  special_allowance: 0,
  incentive_allowance: 5000,
  pf_deduction: 1800,
  esi_deduction: 150,
  professional_tax: 200,
  mediclaim_deduction: 0,
  other_deductions: 0
};

describe('calculatePayslip - full month, ₹20k CTC (basic 15k)', () => {
  const r = calculatePayslip(structure20k, 30, 30);

  test('bonus is 8.33% of min(basic, 7000) when basic <= 21000', () => {
    assert.equal(r.bonus, Math.round(7000 * 0.0833)); // 583
  });

  test('gratuity is 4.81% of earned basic', () => {
    assert.equal(r.gratuity, Math.round(15000 * 0.0481)); // 722
  });

  test('bonus and gratuity are carved out of incentive, so gross equals CTC', () => {
    assert.equal(r.actualIncentive, 5000 - r.bonus - r.gratuity);
    assert.equal(r.actualGross, 20000);
    assert.equal(r.fixedGross, 20000);
  });

  test('PF capped at 1800 when basic >= 15000', () => {
    assert.equal(r.pfDeduction, 1800);
  });

  test('ESI is 0.75% of gross when gross <= 21000', () => {
    assert.equal(r.esiDeduction, Math.round(20000 * 0.0075)); // 150
  });

  test('net = gross - deductions', () => {
    const expectedDeductions = 1800 + 150 + 200;
    assert.equal(r.totalDeductions, expectedDeductions);
    assert.equal(r.netSalary, 20000 - expectedDeductions);
    assert.equal(r.netPayableWithBonus, r.netSalary);
  });
});

describe('calculatePayslip - proration (15 of 30 days)', () => {
  const r = calculatePayslip(structure20k, 15, 30);

  test('basic prorates by days present', () => {
    assert.equal(r.actualBasic, 7500);
  });

  test('gross prorates to half of CTC', () => {
    assert.equal(r.actualGross, 10000);
  });

  test('PF is 12% of earned basic when under the 1800 cap', () => {
    assert.equal(r.pfDeduction, Math.round(7500 * 0.12)); // 900
  });

  test('bonus uses min(earned basic, 7000) as base', () => {
    assert.equal(r.bonus, Math.round(7000 * 0.0833)); // earned 7500 > 7000 -> base 7000
  });

  test('gratuity is 4.81% of earned (not fixed) basic', () => {
    assert.equal(r.gratuity, Math.round(7500 * 0.0481)); // 361
  });

  test('professional tax is NOT prorated', () => {
    assert.equal(r.professionalTax, 200);
  });

  test('attendance fields', () => {
    assert.equal(r.totalWorkingDays, 30);
    assert.equal(r.daysAbsent, 15);
  });
});

describe('calculatePayslip - high earner (basic 30k, CTC 40k)', () => {
  const structure40k = {
    ...structure20k,
    basic_salary: 30000,
    incentive_allowance: 10000
  };
  const r = calculatePayslip(structure40k, 30, 30);

  test('no bonus when basic > 21000', () => {
    assert.equal(r.bonus, 0);
  });

  test('no ESI when gross > 21000', () => {
    assert.equal(r.esiDeduction, 0);
  });

  test('PF still capped at 1800', () => {
    assert.equal(r.pfDeduction, 1800);
  });

  test('gratuity still applies and gross still equals CTC', () => {
    assert.equal(r.gratuity, Math.round(30000 * 0.0481)); // 1443
    assert.equal(r.actualGross, 40000);
  });
});

describe('calculatePayslip - toggles and edge cases', () => {
  test('PF skipped when structure has pf_deduction = 0', () => {
    const r = calculatePayslip({ ...structure20k, pf_deduction: 0 }, 30, 30);
    assert.equal(r.pfDeduction, 0);
  });

  test('ESI skipped when structure has esi_deduction = 0', () => {
    const r = calculatePayslip({ ...structure20k, esi_deduction: 0 }, 30, 30);
    assert.equal(r.esiDeduction, 0);
  });

  test('advance deduction flows into total deductions and net', () => {
    const base = calculatePayslip(structure20k, 30, 30);
    const withAdvance = calculatePayslip(structure20k, 30, 30, 2000);
    assert.equal(withAdvance.totalDeductions, base.totalDeductions + 2000);
    assert.equal(withAdvance.netSalary, base.netSalary - 2000);
  });

  test('zero days present gives zero gross', () => {
    const r = calculatePayslip(structure20k, 0, 30);
    assert.equal(r.actualGross, 0);
    assert.equal(r.pfDeduction, 0);
    // fixed deductions still apply, so net goes negative - current known behavior
    assert.equal(r.netSalary, -200);
  });

  test('31-day month prorates against 31', () => {
    const r = calculatePayslip(structure20k, 31, 31);
    assert.equal(r.actualBasic, 15000);
    assert.equal(r.actualGross, 20000);
  });

  test('numeric strings from mysql are handled', () => {
    const r = calculatePayslip({
      ...structure20k,
      basic_salary: '15000.00',
      incentive_allowance: '5000.00'
    }, 30, 30);
    assert.equal(r.actualGross, 20000);
  });

  // KNOWN QUIRK (documented, not endorsed): when incentive is smaller than
  // bonus + gratuity, the carve-out clamps at 0 and gross EXCEEDS the CTC.
  test('quirk: tiny incentive makes gross exceed CTC (carve-out clamps at 0)', () => {
    const r = calculatePayslip({ ...structure20k, incentive_allowance: 1000 }, 30, 30);
    // CTC = 16000, but gross = 15000 + 0 + bonus 583 + gratuity 722 = 16305
    assert.equal(r.actualIncentive, 0);
    assert.equal(r.actualGross, 16305);
  });
});
