/**
 * Convert a rupee amount to Indian-English words, e.g.
 *   41376 -> "Forty One Thousand Three Hundred Seventy Six Rupees Only"
 * Used for the "Amount in words" line on payslips.
 *
 * IMPORTANT: keep this byte-for-byte in sync with the frontend copy at
 * frontend/src/utils/numberToWords.js. The server-generated payslip PDF
 * (employee portal) and the client-generated one (admin @react-pdf) both render
 * this, so if the two drift they will state different words for the same net pay.
 * numberToWords.test.js pins the expected output for representative amounts.
 */
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero Rupees Only';
  // Negative net pay (e.g. a zero-days-present month where only fixed deductions
  // like PT/mediclaim apply) would otherwise make convertLakhs return undefined
  // and crash — render it as "Minus …".
  if (num < 0) return 'Minus ' + numberToWords(-num);
  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
  };
  const convertLakhs = (n) => {
    if (n < 1000) return convertHundreds(n);
    if (n < 100000) return convertHundreds(Math.floor(n / 1000)) + ' Thousand ' + convertLakhs(n % 1000);
    if (n < 10000000) return convertHundreds(Math.floor(n / 100000)) + ' Lakh ' + convertLakhs(n % 100000);
    return convertHundreds(Math.floor(n / 10000000)) + ' Crore ' + convertLakhs(n % 10000000);
  };
  return convertLakhs(Math.floor(num)).trim() + ' Rupees Only';
};

module.exports = { numberToWords };
