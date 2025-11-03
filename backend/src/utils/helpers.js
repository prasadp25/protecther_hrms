// ==============================================
// DATE FORMATTING
// ==============================================
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

// ==============================================
// GET MONTH NAME
// ==============================================
const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
};

// ==============================================
// GET DAYS IN MONTH
// ==============================================
const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

// ==============================================
// CALCULATE AGE
// ==============================================
const calculateAge = (dob) => {
  if (!dob) return null;

  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// ==============================================
// GENERATE EMPLOYEE CODE
// ==============================================
const generateEmployeeCode = (lastCode) => {
  if (!lastCode) return 'P0001';

  const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
  return `P${String(num).padStart(4, '0')}`;
};

// ==============================================
// GENERATE SITE CODE
// ==============================================
const generateSiteCode = (lastCode) => {
  if (!lastCode) return 'SITE001';

  const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
  return `SITE${String(num).padStart(3, '0')}`;
};

// ==============================================
// SANITIZE INPUT
// ==============================================
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, ''); // Remove < and > to prevent XSS
};

// ==============================================
// CALCULATE SALARY COMPONENTS
// ==============================================
const calculateSalaryComponents = (salaryData) => {
  const basicSalary = parseFloat(salaryData.basic_salary) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const da = parseFloat(salaryData.da) || 0;
  const conveyanceAllowance = parseFloat(salaryData.conveyance_allowance) || 0;
  const medicalAllowance = parseFloat(salaryData.medical_allowance) || 0;
  const otherAllowances = parseFloat(salaryData.other_allowances) || 0;

  const pf = parseFloat(salaryData.pf) || 0;
  const esi = parseFloat(salaryData.esi) || 0;
  const professionalTax = parseFloat(salaryData.professional_tax) || 0;
  const tds = parseFloat(salaryData.tds) || 0;
  const otherDeductions = parseFloat(salaryData.other_deductions) || 0;

  const grossSalary = basicSalary + hra + da + conveyanceAllowance + medicalAllowance + otherAllowances;
  const totalDeductions = pf + esi + professionalTax + tds + otherDeductions;
  const netSalary = grossSalary - totalDeductions;

  return {
    gross_salary: grossSalary,
    total_deductions: totalDeductions,
    net_salary: netSalary
  };
};

// ==============================================
// CALCULATE WORKING HOURS
// ==============================================
const calculateWorkingHours = (checkInTime, checkOutTime, date = null) => {
  if (!checkInTime || !checkOutTime) return null;

  const dateStr = date || new Date().toISOString().split('T')[0];
  const checkIn = new Date(`${dateStr} ${checkInTime}`);
  const checkOut = new Date(`${dateStr} ${checkOutTime}`);

  const hours = (checkOut - checkIn) / (1000 * 60 * 60);
  return Math.max(0, parseFloat(hours.toFixed(2)));
};

// ==============================================
// VALIDATE EMAIL
// ==============================================
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ==============================================
// VALIDATE MOBILE NUMBER (10 digits)
// ==============================================
const isValidMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

// ==============================================
// VALIDATE AADHAAR NUMBER (12 digits)
// ==============================================
const isValidAadhaar = (aadhaar) => {
  const aadhaarRegex = /^\d{12}$/;
  return aadhaarRegex.test(aadhaar);
};

// ==============================================
// VALIDATE PAN NUMBER
// ==============================================
const isValidPAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

// ==============================================
// VALIDATE IFSC CODE
// ==============================================
const isValidIFSC = (ifsc) => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
};

// ==============================================
// PAGINATION HELPER
// ==============================================
const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  return {
    limit: limitNum,
    offset: offset,
    page: pageNum
  };
};

// ==============================================
// BUILD PAGINATION RESPONSE
// ==============================================
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    data: data,
    pagination: {
      total: total,
      page: page,
      limit: limit,
      totalPages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// ==============================================
// FORMAT CURRENCY (INR)
// ==============================================
const formatCurrency = (amount) => {
  if (!amount) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// ==============================================
// GENERATE RANDOM PASSWORD
// ==============================================
const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
};

// ==============================================
// SLEEP/DELAY
// ==============================================
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ==============================================
// REMOVE UNDEFINED/NULL VALUES FROM OBJECT
// ==============================================
const cleanObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

module.exports = {
  formatDate,
  getMonthName,
  getDaysInMonth,
  calculateAge,
  generateEmployeeCode,
  generateSiteCode,
  sanitizeInput,
  calculateSalaryComponents,
  calculateWorkingHours,
  isValidEmail,
  isValidMobile,
  isValidAadhaar,
  isValidPAN,
  isValidIFSC,
  paginate,
  buildPaginationResponse,
  formatCurrency,
  generatePassword,
  sleep,
  cleanObject
};
