// ===================================
// INPUT VALIDATORS
// ===================================

/**
 * Validate Aadhaar number (12 digits)
 * @param {string} aadhaar - Aadhaar number
 * @returns {Object} Validation result
 */
const validateAadhaar = (aadhaar) => {
  if (!aadhaar) {
    return { valid: false, message: 'Aadhaar number is required' };
  }

  // Remove spaces
  const cleanAadhaar = aadhaar.replace(/\s/g, '');

  // Must be exactly 12 digits
  if (!/^\d{12}$/.test(cleanAadhaar)) {
    return { valid: false, message: 'Aadhaar must be exactly 12 digits' };
  }

  // First digit cannot be 0 or 1
  if (cleanAadhaar[0] === '0' || cleanAadhaar[0] === '1') {
    return { valid: false, message: 'Invalid Aadhaar number format' };
  }

  return { valid: true, value: cleanAadhaar };
};

/**
 * Validate PAN number (ABCDE1234F format)
 * @param {string} pan - PAN number
 * @returns {Object} Validation result
 */
const validatePAN = (pan) => {
  if (!pan) {
    return { valid: false, message: 'PAN number is required' };
  }

  // Convert to uppercase and remove spaces
  const cleanPAN = pan.toUpperCase().replace(/\s/g, '');

  // PAN format: 5 letters + 4 digits + 1 letter
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPAN)) {
    return { valid: false, message: 'PAN must be in format: ABCDE1234F' };
  }

  // 4th character indicates holder type
  const validTypes = ['A', 'B', 'C', 'F', 'G', 'H', 'L', 'J', 'P', 'T', 'E'];
  if (!validTypes.includes(cleanPAN[3])) {
    return { valid: false, message: 'Invalid PAN number format' };
  }

  return { valid: true, value: cleanPAN };
};

/**
 * Validate Indian mobile number (10 digits starting with 6-9)
 * @param {string} mobile - Mobile number
 * @returns {Object} Validation result
 */
const validateMobile = (mobile) => {
  if (!mobile) {
    return { valid: false, message: 'Mobile number is required' };
  }

  // Remove spaces, dashes, and country code
  let cleanMobile = mobile.replace(/[\s\-]/g, '');

  // Remove +91 or 91 prefix if present
  if (cleanMobile.startsWith('+91')) {
    cleanMobile = cleanMobile.substring(3);
  } else if (cleanMobile.startsWith('91') && cleanMobile.length === 12) {
    cleanMobile = cleanMobile.substring(2);
  }

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleanMobile)) {
    return { valid: false, message: 'Mobile must be exactly 10 digits' };
  }

  // Must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(cleanMobile)) {
    return { valid: false, message: 'Mobile must start with 6, 7, 8, or 9' };
  }

  return { valid: true, value: cleanMobile };
};

/**
 * Validate email address
 * @param {string} email - Email address
 * @returns {Object} Validation result
 */
const validateEmail = (email) => {
  if (!email) {
    return { valid: true, value: null }; // Email is optional
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, message: 'Invalid email format' };
  }

  return { valid: true, value: cleanEmail };
};

/**
 * Validate IFSC code (11 characters: 4 letters + 0 + 6 alphanumeric)
 * @param {string} ifsc - IFSC code
 * @returns {Object} Validation result
 */
const validateIFSC = (ifsc) => {
  if (!ifsc) {
    return { valid: false, message: 'IFSC code is required' };
  }

  const cleanIFSC = ifsc.toUpperCase().replace(/\s/g, '');

  // IFSC format: 4 letters + 0 + 6 alphanumeric
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIFSC)) {
    return { valid: false, message: 'Invalid IFSC code format' };
  }

  return { valid: true, value: cleanIFSC };
};

/**
 * Validate bank account number (9-18 digits)
 * @param {string} account - Account number
 * @returns {Object} Validation result
 */
const validateAccountNumber = (account) => {
  if (!account) {
    return { valid: false, message: 'Account number is required' };
  }

  const cleanAccount = account.replace(/\s/g, '');

  // Account number: 9-18 digits
  if (!/^\d{9,18}$/.test(cleanAccount)) {
    return { valid: false, message: 'Account number must be 9-18 digits' };
  }

  return { valid: true, value: cleanAccount };
};

/**
 * Validate pincode (6 digits)
 * @param {string} pincode - Pincode
 * @returns {Object} Validation result
 */
const validatePincode = (pincode) => {
  if (!pincode) {
    return { valid: true, value: null }; // Optional
  }

  const cleanPincode = pincode.replace(/\s/g, '');

  // Pincode: exactly 6 digits, first digit 1-9
  if (!/^[1-9]\d{5}$/.test(cleanPincode)) {
    return { valid: false, message: 'Pincode must be 6 digits' };
  }

  return { valid: true, value: cleanPincode };
};

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date string
 * @param {boolean} required - Is field required
 * @returns {Object} Validation result
 */
const validateDate = (date, required = false) => {
  if (!date) {
    if (required) {
      return { valid: false, message: 'Date is required' };
    }
    return { valid: true, value: null };
  }

  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, message: 'Date must be in YYYY-MM-DD format' };
  }

  // Check if valid date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, message: 'Invalid date' };
  }

  return { valid: true, value: date };
};

/**
 * Validate employee data for creation
 * @param {Object} data - Employee data
 * @returns {Object} Validation result with errors array
 */
const validateEmployeeData = (data) => {
  const errors = [];
  const cleanedData = { ...data };

  // Required fields check
  if (!data.first_name || data.first_name.trim() === '') {
    errors.push('First name is required');
  }

  if (!data.last_name || data.last_name.trim() === '') {
    errors.push('Last name is required');
  }

  // Validate Aadhaar
  if (data.aadhaar_no) {
    const aadhaarResult = validateAadhaar(data.aadhaar_no);
    if (!aadhaarResult.valid) {
      errors.push(aadhaarResult.message);
    } else {
      cleanedData.aadhaar_no = aadhaarResult.value;
    }
  }

  // Validate PAN
  if (data.pan_no) {
    const panResult = validatePAN(data.pan_no);
    if (!panResult.valid) {
      errors.push(panResult.message);
    } else {
      cleanedData.pan_no = panResult.value;
    }
  }

  // Validate Mobile
  if (data.mobile) {
    const mobileResult = validateMobile(data.mobile);
    if (!mobileResult.valid) {
      errors.push(mobileResult.message);
    } else {
      cleanedData.mobile = mobileResult.value;
    }
  } else {
    errors.push('Mobile number is required');
  }

  // Validate alternate mobile (optional)
  if (data.alternate_mobile) {
    const altMobileResult = validateMobile(data.alternate_mobile);
    if (!altMobileResult.valid) {
      errors.push('Alternate mobile: ' + altMobileResult.message);
    } else {
      cleanedData.alternate_mobile = altMobileResult.value;
    }
  }

  // Validate Email (optional)
  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.valid) {
      errors.push(emailResult.message);
    } else {
      cleanedData.email = emailResult.value;
    }
  }

  // Validate IFSC
  if (data.ifsc_code) {
    const ifscResult = validateIFSC(data.ifsc_code);
    if (!ifscResult.valid) {
      errors.push(ifscResult.message);
    } else {
      cleanedData.ifsc_code = ifscResult.value;
    }
  }

  // Validate Account Number
  if (data.account_number) {
    const accountResult = validateAccountNumber(data.account_number);
    if (!accountResult.valid) {
      errors.push(accountResult.message);
    } else {
      cleanedData.account_number = accountResult.value;
    }
  }

  // Validate Pincode (optional)
  if (data.pincode) {
    const pincodeResult = validatePincode(data.pincode);
    if (!pincodeResult.valid) {
      errors.push(pincodeResult.message);
    } else {
      cleanedData.pincode = pincodeResult.value;
    }
  }

  // Validate dates
  if (data.dob) {
    const dobResult = validateDate(data.dob);
    if (!dobResult.valid) {
      errors.push('Date of Birth: ' + dobResult.message);
    }
  }

  if (data.date_of_joining) {
    const dojResult = validateDate(data.date_of_joining, true);
    if (!dojResult.valid) {
      errors.push('Date of Joining: ' + dojResult.message);
    }
  } else {
    errors.push('Date of Joining is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    data: cleanedData
  };
};

/**
 * Validate attendance data
 * @param {number} daysPresent - Days present
 * @param {number} totalDays - Total days in month
 * @returns {Object} Validation result
 */
const validateAttendance = (daysPresent, totalDays) => {
  if (daysPresent === null || daysPresent === undefined) {
    return { valid: false, message: 'Days present is required' };
  }

  const days = parseFloat(daysPresent);

  if (isNaN(days)) {
    return { valid: false, message: 'Days present must be a number' };
  }

  if (days < 0) {
    return { valid: false, message: 'Days present cannot be negative' };
  }

  if (days > totalDays) {
    return { valid: false, message: `Days present cannot exceed ${totalDays}` };
  }

  // Allow half days (0.5 increments)
  if (days % 0.5 !== 0) {
    return { valid: false, message: 'Days present must be in 0.5 increments' };
  }

  return { valid: true, value: days };
};

module.exports = {
  validateAadhaar,
  validatePAN,
  validateMobile,
  validateEmail,
  validateIFSC,
  validateAccountNumber,
  validatePincode,
  validateDate,
  validateEmployeeData,
  validateAttendance
};
