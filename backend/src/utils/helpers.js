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
  if (!lastCode) return 'P00001';

  const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
  return `P${String(num).padStart(5, '0')}`;
};

// ==============================================
// GENERATE CANDIDATE CODE
// ==============================================
const generateCandidateCode = (lastCode) => {
  if (!lastCode) return 'C0001';

  const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
  return `C${String(num).padStart(4, '0')}`;
};

// ==============================================
// GENERATE OFFER LETTER REFERENCE
// Format: PLLP-YYYY-NNN (e.g., PLLP-2026-101)
// ==============================================
const generateOfferLetterRef = (year, lastNumber) => {
  const nextNumber = (lastNumber || 100) + 1;
  return `PLLP-${year}-${nextNumber}`;
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
// VALIDATE UAN NUMBER (EPFO Universal Account Number)
// ==============================================
const isValidUAN = (uan) => {
  const uanRegex = /^\d{12}$/;
  return uanRegex.test(uan);
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
// SLEEP/DELAY
// ==============================================
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
  formatDate,
  getMonthName,
  getDaysInMonth,
  calculateAge,
  generateEmployeeCode,
  generateCandidateCode,
  generateOfferLetterRef,
  isValidEmail,
  isValidMobile,
  isValidAadhaar,
  isValidPAN,
  isValidIFSC,
  isValidUAN,
  formatCurrency,
  sleep
};
