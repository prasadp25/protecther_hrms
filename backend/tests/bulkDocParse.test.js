const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseBulkDocFilename } = require('../src/controllers/employeeController');

describe('parseBulkDocFilename', () => {
  test('parses code + aadhaar from underscore-separated name', () => {
    assert.deepEqual(parseBulkDocFilename('P0012_aadhaar.jpg'), { code: 'P0012', type: 'aadhaar' });
  });

  test('parses 5-digit codes (P00112)', () => {
    assert.deepEqual(parseBulkDocFilename('P00112_pan.pdf'), { code: 'P00112', type: 'pan' });
  });

  test('is case-insensitive and tolerates spaces', () => {
    assert.deepEqual(parseBulkDocFilename('p0012 PAN card.pdf'), { code: 'P0012', type: 'pan' });
  });

  test('accepts common aadhaar misspellings', () => {
    assert.equal(parseBulkDocFilename('P0012-adhar.png').type, 'aadhaar');
    assert.equal(parseBulkDocFilename('P0012_aadhar.png').type, 'aadhaar');
  });

  test('recognizes photo variants', () => {
    assert.equal(parseBulkDocFilename('P0012_photo.jpg').type, 'photo');
    assert.equal(parseBulkDocFilename('P0012 pic.jpg').type, 'photo');
  });

  test('code anywhere in the name still matches', () => {
    assert.equal(parseBulkDocFilename('aadhaar_P0045.jpg').code, 'P0045');
  });

  test('returns null type when no doc keyword present', () => {
    const r = parseBulkDocFilename('P0012_scan.jpg');
    assert.equal(r.code, 'P0012');
    assert.equal(r.type, null);
  });

  test('returns null code when no employee code present', () => {
    const r = parseBulkDocFilename('aadhaar_card.jpg');
    assert.equal(r.code, null);
    assert.equal(r.type, 'aadhaar');
  });

  test('returns both null for an unrelated filename', () => {
    assert.deepEqual(parseBulkDocFilename('random.jpg'), { code: null, type: null });
  });

  test('handles empty/undefined input safely', () => {
    assert.deepEqual(parseBulkDocFilename(''), { code: null, type: null });
    assert.deepEqual(parseBulkDocFilename(undefined), { code: null, type: null });
  });
});
