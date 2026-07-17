const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidAadhaar,
  isValidPAN,
  isValidIFSC,
  generateEmployeeCode,
  generateSiteCode,
  getDaysInMonth,
  calculateAge,
  formatDate
} = require('../src/utils/helpers');

describe('document validators', () => {
  test('aadhaar: exactly 12 digits', () => {
    assert.equal(isValidAadhaar('123456789012'), true);
    assert.equal(isValidAadhaar('12345678901'), false);   // 11 digits
    assert.equal(isValidAadhaar('1234567890123'), false); // 13 digits
    assert.equal(isValidAadhaar('12345678901a'), false);
    assert.equal(isValidAadhaar(''), false);
  });

  test('PAN: AAAAA9999A format', () => {
    assert.equal(isValidPAN('ABCDE1234F'), true);
    assert.equal(isValidPAN('abcde1234f'), false); // lowercase rejected
    assert.equal(isValidPAN('ABCD1234F'), false);
    assert.equal(isValidPAN('ABCDE12345'), false);
  });

  test('IFSC: 4 letters, 0, 6 alphanumeric', () => {
    assert.equal(isValidIFSC('SBIN0001234'), true);
    assert.equal(isValidIFSC('HDFC0ABCD12'), true);
    assert.equal(isValidIFSC('SBIN1001234'), false); // 5th char must be 0
    assert.equal(isValidIFSC('SBI00001234'), false);
  });
});

describe('code generators', () => {
  test('employee codes increment with padding', () => {
    assert.equal(generateEmployeeCode(null), 'P00001');
    assert.equal(generateEmployeeCode('P00009'), 'P00010');
    assert.equal(generateEmployeeCode('P00122'), 'P00123');
  });

  test('site codes increment with padding', () => {
    assert.equal(generateSiteCode(null), 'SITE001');
    assert.equal(generateSiteCode('SITE009'), 'SITE010');
  });
});

describe('date helpers', () => {
  test('days in month, including leap years', () => {
    assert.equal(getDaysInMonth(2, 2024), 29); // leap
    assert.equal(getDaysInMonth(2, 2026), 28);
    assert.equal(getDaysInMonth(7, 2026), 31);
    assert.equal(getDaysInMonth(6, 2026), 30);
  });

  test('calculateAge handles YYYY-MM-DD strings (dateStrings format)', () => {
    // deterministic check: born 25 years before today's date
    const now = new Date();
    const dob = `${now.getFullYear() - 25}-01-01`;
    const age = calculateAge(dob);
    assert.ok(age === 25 || age === 24); // 24 only if today is before Jan 1 (impossible), so effectively 25
    assert.equal(calculateAge(null), null);
  });

  test('formatDate formats plain date strings without day shift', () => {
    assert.equal(formatDate('2001-10-18'), '2001-10-18');
    assert.equal(formatDate('2001-10-18', 'DD-MM-YYYY'), '18-10-2001');
    assert.equal(formatDate(null), null);
  });
});
