const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { numberToWords } = require('../src/utils/numberToWords');

// These expected outputs pin the payslip "amount in words" format. The frontend
// copy (frontend/src/utils/numberToWords.js) MUST produce the same strings so the
// server-generated and client-generated payslips never disagree.
describe('numberToWords (payslip amount in words)', () => {
  test('zero and boundaries', () => {
    assert.equal(numberToWords(0), 'Zero Rupees Only');
    assert.equal(numberToWords(1), 'One Rupees Only');
    assert.equal(numberToWords(10), 'Ten Rupees Only');
    assert.equal(numberToWords(19), 'Nineteen Rupees Only');
    assert.equal(numberToWords(100), 'One Hundred Rupees Only');
  });

  test('representative net-pay amounts', () => {
    assert.equal(numberToWords(41376), 'Forty One Thousand Three Hundred Seventy Six Rupees Only');
    assert.equal(numberToWords(18000), 'Eighteen Thousand Rupees Only');
    assert.equal(numberToWords(24000), 'Twenty Four Thousand Rupees Only');
    assert.equal(numberToWords(100000), 'One Lakh Rupees Only');
    assert.equal(numberToWords(1234567), 'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only');
  });

  test('negative and fractional', () => {
    assert.equal(numberToWords(-570), 'Minus Five Hundred Seventy Rupees Only');
    assert.equal(numberToWords(576.9), 'Five Hundred Seventy Six Rupees Only'); // floors
  });
});
