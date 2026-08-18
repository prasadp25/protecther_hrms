import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

/**
 * Build and download the site-wise payslips Excel workbook.
 * Extracted verbatim from PayslipView.jsx (pure data → file; no component state
 * beyond the values passed in).
 */
export const exportPayslips = ({ filteredPayslips, employees, sites, selectedMonth, selectedSite }) => {
  if (filteredPayslips.length === 0) {
    toast.error('No payslips to export');
    return;
  }

  // Deduplicate payslips by payslip_id
  const seenIds = new Set();
  const uniquePayslips = filteredPayslips.filter(payslip => {
    if (seenIds.has(payslip.payslipId)) {
      return false;
    }
    seenIds.add(payslip.payslipId);
    return true;
  });

  // Group payslips by site
  const payslipsBySite = {};

  uniquePayslips.forEach(payslip => {
    const employee = employees.find(emp => emp.employee_id === payslip.employeeId);
    const siteId = employee?.site_id || 'UNASSIGNED';

    if (!payslipsBySite[siteId]) {
      payslipsBySite[siteId] = [];
    }

    payslipsBySite[siteId].push({
      employee,
      payslip
    });
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Get month name from selected month or use current
  const monthDate = selectedMonth ? new Date(selectedMonth + '-01') : new Date();
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Create a sheet for each site
  Object.keys(payslipsBySite).forEach(siteId => {
    const siteData = payslipsBySite[siteId];
    const site = sites.find(s => String(s.siteId) === String(siteId));
    const siteName = site ? site.siteName : 'Unassigned';

    // Get working days from first payslip (should be same for all in the month)
    const workingDays = siteData[0]?.payslip.totalDaysInMonth || siteData[0]?.payslip.totalWorkingDays || 30;

    // Create array of arrays for clean structure
    const wsData = [];

    // Row 1: Site Header
    wsData.push([siteName.toUpperCase(), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 2: Statement info
    wsData.push([`Salary Statement: ${monthName}`, '', '', '', '', `Days in Month: ${workingDays}`, '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 3: Section Headers
    wsData.push([
      '', '', '', '', '', '',
      'Fixed Salary', '', '', '', '', '',
      'Earnings (Pro-rata)', '', '', '', '',
      'Deductions', '', '', '', '', '',
      'Final', '', ''
    ]);

    // Row 4: Column Headers
    wsData.push([
      'Sr No',
      'EMP CODE',
      'Name',
      'Designation',
      'Location',
      'Days',
      // Fixed Salary (7 cols: BASIC, HRA, Incentive, Bonus, Gratuity, Gross, Net)
      'BASIC', 'HRA', 'Incentive', 'Bonus', 'Gratuity', 'Gross', 'Net',
      // Earnings (Pro-rata) (6 cols: BASIC, HRA, Incentive, Bonus, Gratuity, Gross)
      'BASIC', 'HRA', 'Incentive', 'Bonus', 'Gratuity', 'Gross',
      // Deductions
      'PF', 'Mediclaim', 'PT', 'Advance', 'ESIC', 'Total Ded',
      // Final
      'Net Pay', 'IFSC', 'Account'
    ]);

    // Data rows
    siteData.forEach(({ employee, payslip }, index) => {
      const daysInMonth = payslip.totalDaysInMonth || payslip.totalWorkingDays || 30;
      const daysPresent = payslip.daysPresent || 0;

      // Fixed salary from salary structure (via API)
      const fixedBasic = payslip.fixedBasic || 0;
      const fixedHRA = payslip.fixedHRA || 0;
      const fixedIncentive = payslip.fixedIncentive || 0;
      const fixedGross = payslip.fixedGross || 0;
      const fixedNet = payslip.fixedNet || 0;

      // Earned/Pro-rata values (stored in payslip)
      const earnedBasic = payslip.basicSalary || 0;
      const earnedHRA = payslip.hra || 0;
      const earnedIncentive = payslip.otherAllowances || 0;
      const earnedGross = payslip.grossSalary || 0;

      // Deductions
      const pfDeduction = payslip.pfDeduction || 0;
      const mediclaim = payslip.healthInsurance || 0;
      const pt = payslip.professionalTax || 0;
      const advance = payslip.advanceDeduction || 0;
      const esic = payslip.esiDeduction || 0;
      const totalDeductions = payslip.totalDeductions || (pfDeduction + mediclaim + pt + advance + esic);

      // Bonus and Gratuity values
      const bonus = payslip.bonus || 0;
      const gratuity = payslip.gratuity || 0;

      // Calculate fixed bonus and gratuity for display
      const fixedBonus = payslip.fixedBasic <= 21000 ? Math.round(Math.min(payslip.fixedBasic || 0, 7000) * 0.0833) : 0;
      const fixedGratuity = Math.round((payslip.fixedBasic || 0) * 0.0481);

      const row = [
        index + 1,                                    // Sr No
        payslip.employeeCode,                         // EMP CODE
        payslip.employeeName,                         // Name
        employee?.designation || payslip.designation || '-',  // Designation
        siteName,                                     // Location
        `${daysPresent}/${daysInMonth}`,              // Days (X/Y format)
        // Fixed Salary (BASIC + HRA + Incentive + Bonus + Gratuity = Gross)
        fixedBasic,                                   // BASIC
        fixedHRA,                                     // HRA
        fixedIncentive,                               // Incentive (reduced by bonus & gratuity)
        fixedBonus,                                   // Bonus
        fixedGratuity,                                // Gratuity (4.81% of Basic)
        fixedGross,                                   // Gross (includes bonus & gratuity)
        fixedNet,                                     // Net (Gross - Deductions)
        // Earnings (Pro-rata) (BASIC + HRA + Incentive + Bonus + Gratuity = Gross)
        earnedBasic,                                  // BASIC
        earnedHRA,                                    // HRA
        earnedIncentive,                              // Incentive (reduced by bonus & gratuity)
        bonus,                                        // Bonus
        gratuity,                                     // Gratuity (4.81% of earned Basic)
        earnedGross,                                  // Gross (includes bonus & gratuity)
        // Deductions
        pfDeduction,                                  // PF
        mediclaim,                                    // Mediclaim
        pt,                                           // PT
        advance,                                      // Advance
        esic,                                         // ESIC
        totalDeductions,                              // Total Ded
        // Final
        payslip.netSalary,                            // Net Pay (Gross - Deductions)
        payslip.ifscCode || employee?.ifsc_code || '',       // IFSC
        payslip.accountNumber || employee?.account_number || ''  // Account
      ];
      wsData.push(row);
    });

    // Summary row - fixed values from salary structure (via API)
    const totalFixedBasic = siteData.reduce((sum, item) => sum + (item.payslip.fixedBasic || 0), 0);
    const totalFixedHRA = siteData.reduce((sum, item) => sum + (item.payslip.fixedHRA || 0), 0);
    const totalFixedIncentive = siteData.reduce((sum, item) => sum + (item.payslip.fixedIncentive || 0), 0);
    const totalFixedGross = siteData.reduce((sum, item) => sum + (item.payslip.fixedGross || 0), 0);
    const totalFixedNet = siteData.reduce((sum, item) => sum + (item.payslip.fixedNet || 0), 0);

    const totalPF = siteData.reduce((sum, item) => sum + (item.payslip.pfDeduction || 0), 0);
    const totalMediclaim = siteData.reduce((sum, item) => sum + (item.payslip.healthInsurance || 0), 0);
    const totalPT = siteData.reduce((sum, item) => sum + (item.payslip.professionalTax || 0), 0);
    const totalAdvance = siteData.reduce((sum, item) => sum + (item.payslip.advanceDeduction || 0), 0);
    const totalESIC = siteData.reduce((sum, item) => sum + (item.payslip.esiDeduction || 0), 0);
    const totalDeductions = siteData.reduce((sum, item) => sum + (item.payslip.totalDeductions || 0), 0);

    // Earned values (already pro-rated in payslip)
    const totalEarnedBasic = siteData.reduce((sum, item) => sum + (item.payslip.basicSalary || 0), 0);
    const totalEarnedHRA = siteData.reduce((sum, item) => sum + (item.payslip.hra || 0), 0);
    const totalEarnedIncentive = siteData.reduce((sum, item) => sum + (item.payslip.otherAllowances || 0), 0);
    const totalEarnedGross = siteData.reduce((sum, item) => sum + (item.payslip.grossSalary || 0), 0);
    const totalNet = siteData.reduce((sum, item) => sum + (item.payslip.netSalary || 0), 0);
    const totalBonus = siteData.reduce((sum, item) => sum + (item.payslip.bonus || 0), 0);
    const totalGratuity = siteData.reduce((sum, item) => sum + (item.payslip.gratuity || 0), 0);

    // Calculate total fixed bonus and gratuity
    const totalFixedBonus = siteData.reduce((sum, item) => {
      const fb = item.payslip.fixedBasic || 0;
      return sum + (fb <= 21000 ? Math.round(Math.min(fb, 7000) * 0.0833) : 0);
    }, 0);
    const totalFixedGratuity = siteData.reduce((sum, item) => {
      return sum + Math.round((item.payslip.fixedBasic || 0) * 0.0481);
    }, 0);

    wsData.push([
      '',
      'TOTAL',
      `${siteData.length} employees`,
      '', '', '',
      // Fixed Salary totals (BASIC + HRA + Incentive + Bonus + Gratuity = Gross)
      totalFixedBasic, totalFixedHRA, totalFixedIncentive, totalFixedBonus, totalFixedGratuity, totalFixedGross, totalFixedNet,
      // Earnings totals (BASIC + HRA + Incentive + Bonus + Gratuity = Gross)
      totalEarnedBasic, totalEarnedHRA, totalEarnedIncentive, totalBonus, totalGratuity, totalEarnedGross,
      // Deductions totals
      totalPF, totalMediclaim, totalPT, totalAdvance, totalESIC, totalDeductions,
      // Final total
      totalNet, '', ''
    ]);

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge cells for headers
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); // Site name
    ws['!merges'].push({ s: { r: 2, c: 6 }, e: { r: 2, c: 12 } }); // Fixed Salary header (7 cols: BASIC, HRA, Incentive, Bonus, Gratuity, Gross, Net)
    ws['!merges'].push({ s: { r: 2, c: 13 }, e: { r: 2, c: 18 } }); // Earnings header (6 cols: BASIC, HRA, Incentive, Bonus, Gratuity, Gross)
    ws['!merges'].push({ s: { r: 2, c: 19 }, e: { r: 2, c: 24 } }); // Deductions header (6 cols: PF, Mediclaim, PT, Advance, ESIC, Total)
    ws['!merges'].push({ s: { r: 2, c: 25 }, e: { r: 2, c: 27 } }); // Final header (3 cols: Net Pay, IFSC, Account)

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // Sr No
      { wch: 10 },  // EMP CODE
      { wch: 20 },  // Name
      { wch: 15 },  // Designation
      { wch: 15 },  // Location
      { wch: 8 },   // Days
      // Fixed Salary (7 cols: BASIC + HRA + Incentive + Bonus + Gratuity = Gross, Net)
      { wch: 10 },  // BASIC
      { wch: 8 },   // HRA
      { wch: 10 },  // Incentive
      { wch: 8 },   // Bonus
      { wch: 8 },   // Gratuity
      { wch: 10 },  // Gross
      { wch: 10 },  // Net
      // Earnings (6 cols: BASIC + HRA + Incentive + Bonus + Gratuity = Gross)
      { wch: 10 },  // BASIC
      { wch: 8 },   // HRA
      { wch: 10 },  // Incentive
      { wch: 8 },   // Bonus
      { wch: 8 },   // Gratuity
      { wch: 10 },  // Gross
      // Deductions (6 cols)
      { wch: 8 },   // PF
      { wch: 10 },  // Mediclaim
      { wch: 6 },   // PT
      { wch: 8 },   // Advance
      { wch: 8 },   // ESIC
      { wch: 10 },  // Total Ded
      // Final (3 cols)
      { wch: 12 },  // Net Pay
      { wch: 12 },  // IFSC
      { wch: 15 }   // Account
    ];

    // Add sheet to workbook
    const sheetName = siteName.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Generate filename
  const monthText = selectedMonth ? `_${selectedMonth}` : '';
  const filterText = selectedSite !== 'ALL'
    ? `_${sites.find(s => String(s.siteId) === String(selectedSite))?.siteCode || 'Site'}`
    : '_AllSites';
  const filename = `Payslips${monthText}${filterText}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);
};
