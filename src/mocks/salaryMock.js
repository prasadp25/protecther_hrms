// Mock salary data for the HRMS system

export const mockSalaryStructures = [
  {
    salaryId: 1,
    employeeId: 1,
    employeeCode: 'EMP001',
    employeeName: 'Rajesh Kumar',
    effectiveFrom: '2024-01-01',
    // Earnings
    basicSalary: 25000,
    hra: 10000, // House Rent Allowance
    da: 5000, // Dearness Allowance
    conveyanceAllowance: 2000,
    medicalAllowance: 1500,
    specialAllowance: 3000,
    otherAllowances: 1000,
    // Deductions
    pfDeduction: 1800, // 12% of basic
    esiDeduction: 750, // ESI
    professionalTax: 200,
    tds: 2000,
    loanDeduction: 0,
    otherDeductions: 0,
    // Calculated fields
    grossSalary: 47500,
    totalDeductions: 4750,
    netSalary: 42750,
    status: 'ACTIVE',
  },
  {
    salaryId: 2,
    employeeId: 2,
    employeeCode: 'EMP002',
    employeeName: 'Priya Sharma',
    effectiveFrom: '2024-01-01',
    basicSalary: 30000,
    hra: 12000,
    da: 6000,
    conveyanceAllowance: 2500,
    medicalAllowance: 1500,
    specialAllowance: 4000,
    otherAllowances: 1500,
    pfDeduction: 2160,
    esiDeduction: 0,
    professionalTax: 200,
    tds: 3000,
    loanDeduction: 0,
    otherDeductions: 0,
    grossSalary: 57500,
    totalDeductions: 5360,
    netSalary: 52140,
    status: 'ACTIVE',
  },
  {
    salaryId: 3,
    employeeId: 3,
    employeeCode: 'EMP003',
    employeeName: 'Amit Patel',
    effectiveFrom: '2024-02-01',
    basicSalary: 20000,
    hra: 8000,
    da: 4000,
    conveyanceAllowance: 1600,
    medicalAllowance: 1250,
    specialAllowance: 2500,
    otherAllowances: 800,
    pfDeduction: 1440,
    esiDeduction: 563,
    professionalTax: 200,
    tds: 1200,
    loanDeduction: 0,
    otherDeductions: 0,
    grossSalary: 38150,
    totalDeductions: 3403,
    netSalary: 34747,
    status: 'ACTIVE',
  },
  {
    salaryId: 4,
    employeeId: 4,
    employeeCode: 'EMP004',
    employeeName: 'Sunita Verma',
    effectiveFrom: '2024-01-15',
    basicSalary: 35000,
    hra: 14000,
    da: 7000,
    conveyanceAllowance: 3000,
    medicalAllowance: 1500,
    specialAllowance: 5000,
    otherAllowances: 2000,
    pfDeduction: 2520,
    esiDeduction: 0,
    professionalTax: 200,
    tds: 4000,
    loanDeduction: 1000,
    otherDeductions: 0,
    grossSalary: 67500,
    totalDeductions: 7720,
    netSalary: 59780,
    status: 'ACTIVE',
  },
];

// Mock payslip records
export const mockPayslips = [
  {
    payslipId: 1,
    employeeId: 1,
    employeeCode: 'EMP001',
    employeeName: 'Rajesh Kumar',
    month: '2024-09',
    salaryId: 1,
    // Working days
    totalWorkingDays: 26,
    daysPresent: 26,
    daysAbsent: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
    overtime: 0,
    overtimeAmount: 0,
    // Salary components
    basicSalary: 25000,
    hra: 10000,
    da: 5000,
    conveyanceAllowance: 2000,
    medicalAllowance: 1500,
    specialAllowance: 3000,
    otherAllowances: 1000,
    // Deductions
    pfDeduction: 1800,
    esiDeduction: 750,
    professionalTax: 200,
    tds: 2000,
    loanDeduction: 0,
    otherDeductions: 0,
    // Totals
    grossSalary: 47500,
    totalDeductions: 4750,
    netSalary: 42750,
    paymentDate: '2024-10-01',
    paymentStatus: 'PAID',
    paymentMethod: 'BANK_TRANSFER',
    remarks: 'Salary for September 2024',
  },
  {
    payslipId: 2,
    employeeId: 2,
    employeeCode: 'EMP002',
    employeeName: 'Priya Sharma',
    month: '2024-09',
    salaryId: 2,
    totalWorkingDays: 26,
    daysPresent: 24,
    daysAbsent: 2,
    paidLeaves: 0,
    unpaidLeaves: 2,
    overtime: 0,
    overtimeAmount: 0,
    basicSalary: 27692, // Reduced for 2 days absence
    hra: 11076,
    da: 5538,
    conveyanceAllowance: 2307,
    medicalAllowance: 1384,
    specialAllowance: 3692,
    otherAllowances: 1384,
    pfDeduction: 1992,
    esiDeduction: 0,
    professionalTax: 200,
    tds: 2769,
    loanDeduction: 0,
    otherDeductions: 0,
    grossSalary: 53073,
    totalDeductions: 4961,
    netSalary: 48112,
    paymentDate: '2024-10-01',
    paymentStatus: 'PAID',
    paymentMethod: 'BANK_TRANSFER',
    remarks: 'Salary for September 2024 - 2 days unpaid leave deducted',
  },
  {
    payslipId: 3,
    employeeId: 1,
    employeeCode: 'EMP001',
    employeeName: 'Rajesh Kumar',
    month: '2024-10',
    salaryId: 1,
    totalWorkingDays: 27,
    daysPresent: 27,
    daysAbsent: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
    overtime: 8,
    overtimeAmount: 2000,
    basicSalary: 25000,
    hra: 10000,
    da: 5000,
    conveyanceAllowance: 2000,
    medicalAllowance: 1500,
    specialAllowance: 3000,
    otherAllowances: 1000,
    pfDeduction: 1800,
    esiDeduction: 750,
    professionalTax: 200,
    tds: 2200,
    loanDeduction: 0,
    otherDeductions: 0,
    grossSalary: 49500,
    totalDeductions: 4950,
    netSalary: 44550,
    paymentDate: null,
    paymentStatus: 'PENDING',
    paymentMethod: null,
    remarks: 'Salary for October 2024 - 8 hours overtime included',
  },
];

// Function to calculate salary
export const calculateSalary = (salaryStructure, workingDays = 26, daysPresent = 26, overtimeHours = 0) => {
  const perDayBasic = salaryStructure.basicSalary / workingDays;
  const perDayGross = salaryStructure.grossSalary / workingDays;
  const hourlyRate = perDayBasic / 8;

  // Calculate adjusted salary based on attendance
  const attendanceRatio = daysPresent / workingDays;

  const adjustedBasic = Math.round(salaryStructure.basicSalary * attendanceRatio);
  const adjustedHra = Math.round(salaryStructure.hra * attendanceRatio);
  const adjustedDa = Math.round(salaryStructure.da * attendanceRatio);
  const adjustedConveyance = Math.round(salaryStructure.conveyanceAllowance * attendanceRatio);
  const adjustedMedical = Math.round(salaryStructure.medicalAllowance * attendanceRatio);
  const adjustedSpecial = Math.round(salaryStructure.specialAllowance * attendanceRatio);
  const adjustedOther = Math.round(salaryStructure.otherAllowances * attendanceRatio);

  const overtimeAmount = Math.round(overtimeHours * hourlyRate * 2); // Overtime at 2x rate

  const adjustedGross = adjustedBasic + adjustedHra + adjustedDa + adjustedConveyance +
                        adjustedMedical + adjustedSpecial + adjustedOther + overtimeAmount;

  // Calculate deductions (PF based on adjusted basic)
  const adjustedPf = Math.round(adjustedBasic * 0.12);
  const adjustedEsi = adjustedGross <= 21000 ? Math.round(adjustedGross * 0.0075) : 0;
  const adjustedPt = salaryStructure.professionalTax;
  const adjustedTds = Math.round(salaryStructure.tds * attendanceRatio);

  const totalDeductions = adjustedPf + adjustedEsi + adjustedPt + adjustedTds +
                         salaryStructure.loanDeduction + salaryStructure.otherDeductions;

  const netSalary = adjustedGross - totalDeductions;

  return {
    basicSalary: adjustedBasic,
    hra: adjustedHra,
    da: adjustedDa,
    conveyanceAllowance: adjustedConveyance,
    medicalAllowance: adjustedMedical,
    specialAllowance: adjustedSpecial,
    otherAllowances: adjustedOther,
    overtimeAmount,
    grossSalary: adjustedGross,
    pfDeduction: adjustedPf,
    esiDeduction: adjustedEsi,
    professionalTax: adjustedPt,
    tds: adjustedTds,
    loanDeduction: salaryStructure.loanDeduction,
    otherDeductions: salaryStructure.otherDeductions,
    totalDeductions,
    netSalary,
  };
};

// Function to generate payslip ID
let nextPayslipId = mockPayslips.length + 1;
export const generatePayslipId = () => nextPayslipId++;
