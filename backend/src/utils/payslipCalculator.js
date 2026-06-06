/**
 * Payslip Calculation Helper
 * Centralizes all payslip calculation logic to avoid code duplication
 */

/**
 * Calculate payslip amounts for an employee based on salary structure and attendance
 * @param {Object} salaryData - Active salary structure from database
 * @param {number} actualDaysPresent - Days present from attendance record
 * @param {number} daysInMonth - Total days in the month (calendar days)
 * @param {number} advanceDeduction - Optional advance deduction amount
 * @returns {Object} Calculated payslip components
 */
const calculatePayslip = (salaryData, actualDaysPresent, daysInMonth, advanceDeduction = 0) => {
  // Fixed Salary Components (from salary structure)
  const fixedBasic = parseFloat(salaryData.basic_salary);
  const fixedHra = parseFloat(salaryData.hra || 0);
  const fixedAllowance = parseFloat(salaryData.special_allowance || 0);
  const fixedIncentiveRaw = parseFloat(salaryData.incentive_allowance || salaryData.other_allowances || 0);

  // Fixed bonus: 8.33% of min(basic, 7000) if basic <= 21000
  // Bonus is CARVED OUT from Other Allowances (not added on top)
  const fixedBonusEligible = fixedBasic <= 21000;
  const fixedBonusBase = Math.min(fixedBasic, 7000);
  const fixedBonus = fixedBonusEligible ? Math.round(fixedBonusBase * 0.0833) : 0;

  // Fixed gratuity: 4.81% of Basic (Payment of Gratuity Act 1972)
  // Formula: (Basic × 15) / 26 / 12 = Basic × 0.0481
  // Gratuity is CARVED OUT from Other Allowances (not added on top)
  const fixedGratuity = Math.round(fixedBasic * 0.0481);

  // Deduct bonus and gratuity from incentive/other allowances so total stays same as CTC
  const fixedIncentive = Math.max(0, fixedIncentiveRaw - fixedBonus - fixedGratuity);

  // Gross = Basic + HRA + Allowance + Incentive + Bonus + Gratuity = Original CTC (unchanged)
  const fixedGross = fixedBasic + fixedHra + fixedAllowance + fixedIncentive + fixedBonus + fixedGratuity;

  // Calculate actual (prorated) components
  const actualBasic = Math.round((fixedBasic / daysInMonth) * actualDaysPresent);
  const actualHra = Math.round((fixedHra / daysInMonth) * actualDaysPresent);
  const actualAllowance = Math.round((fixedAllowance / daysInMonth) * actualDaysPresent);

  // Bonus: Payment of Bonus Act 1965 - 8.33% of min(earned basic, 7000)
  // Bonus is CARVED OUT from Other Allowances (part of CTC, not extra)
  const bonusEligible = fixedBasic <= 21000;
  const bonusBase = Math.min(actualBasic, 7000);
  const bonus = bonusEligible ? Math.round(bonusBase * 0.0833) : 0;

  // Gratuity: 4.81% of Earned Basic (Payment of Gratuity Act 1972)
  // Gratuity is CARVED OUT from Other Allowances (part of CTC, not extra)
  const gratuity = Math.round(actualBasic * 0.0481);

  // Deduct bonus and gratuity from incentive so total gross stays same as prorated CTC
  const actualIncentiveRaw = Math.round((fixedIncentiveRaw / daysInMonth) * actualDaysPresent);
  const actualIncentive = Math.max(0, actualIncentiveRaw - bonus - gratuity);

  // Gross = Basic + HRA + Allowance + Incentive + Bonus + Gratuity = Prorated CTC (unchanged)
  const actualGross = actualBasic + actualHra + actualAllowance + actualIncentive + bonus + gratuity;

  // PF Calculation: 12% of Earned Basic (as per EPFO rules)
  // Wage ceiling: ₹15,000 basic = max PF ₹1,800
  const pfApplicable = salaryData.pf_deduction > 0;
  const pfDeduction = pfApplicable ? Math.min(Math.round(actualBasic * 0.12), 1800) : 0;

  // ESI Calculation: 0.75% of Earned Gross (applicable if monthly gross ≤ ₹21,000)
  const esiApplicable = salaryData.esi_deduction > 0 && fixedGross <= 21000;
  const esiDeduction = esiApplicable ? Math.round(actualGross * 0.0075) : 0;

  // Fixed Deductions (constant - not attendance based)
  const professionalTax = parseFloat(salaryData.professional_tax || 0);
  const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction || 0);
  const otherDeductions = parseFloat(salaryData.other_deductions || 0);

  const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;

  // Net Salary = Earned Gross - Deductions
  // Since bonus is already included in gross, net salary includes bonus
  const netSalary = Math.round(actualGross - totalDeductions);
  const netPayableWithBonus = netSalary;

  // Calculate fixed values for reference (full month without absence)
  const fixedPF = pfApplicable ? Math.min(Math.round(fixedBasic * 0.12), 1800) : 0;
  const fixedESI = (salaryData.esi_deduction > 0 && fixedGross <= 21000) ? Math.round(fixedGross * 0.0075) : 0;
  const fixedTotalDeductions = fixedPF + fixedESI + professionalTax + mediclaimDeduction + otherDeductions;
  const fixedNetSalary = fixedGross - fixedTotalDeductions;

  return {
    // Actual (prorated) values
    actualBasic,
    actualHra,
    actualAllowance,
    actualIncentive,
    actualGross,
    bonus,
    gratuity,

    // Fixed values (full month)
    fixedBasic,
    fixedHra,
    fixedAllowance,
    fixedIncentive,
    fixedGross,
    fixedNetSalary,

    // Deductions
    pfDeduction,
    esiDeduction,
    professionalTax,
    mediclaimDeduction,
    advanceDeduction,
    otherDeductions,
    totalDeductions,

    // Net amounts
    netSalary,
    netPayableWithBonus,

    // Attendance
    totalWorkingDays: daysInMonth,
    daysAbsent: daysInMonth - actualDaysPresent
  };
};

module.exports = {
  calculatePayslip
};
