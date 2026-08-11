/**
 * Server-side payslip PDF generation.
 *
 * Faithful reproduction of the old browser-side PayslipPDFTemplateNew
 * (@react-pdf) using jsPDF + jspdf-autotable, so the payslip an employee
 * downloads is generated on the server from the payslip DB row rather than
 * assembled in their browser. Same company header, employee/bank block,
 * earnings/deductions table, gross/net/bonus rows, amount-in-words and
 * footer, in the same order.
 *
 * Takes the joined payslip row (snake_case, as returned by the employee
 * portal getPayslipById query) and returns a PDF Buffer.
 */
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

// "Rs." rather than the rupee glyph, matching the old template (Helvetica
// has no rupee symbol). Indian digit grouping (1,00,000).
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs.0';
  const num = Math.round(parseFloat(amount) || 0);
  const numStr = Math.abs(num).toString();
  let result = '';
  let count = 0;
  for (let i = numStr.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) result = ',' + result;
    result = numStr[i] + result;
    count++;
  }
  return `Rs.${num < 0 ? '-' : ''}${result}`;
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero Rupees Only';
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

const n = (v) => parseFloat(v) || 0;

const formatDMY = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  // dd/mm/yyyy (en-GB), matching the old template
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/**
 * @param {Object} p - joined payslip row (snake_case)
 * @returns {Buffer}
 */
const buildPayslipPdf = (p) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const mid = margin + contentWidth / 2;

  const monthStr = p.month ? String(p.month) : '';
  const monthYear = monthStr
    ? new Date(monthStr + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '-';

  // ---- Company header (the employee's OWN company, from the DB) ----
  const companyName = (p.company_name || 'Company').toUpperCase();
  // Build the address line from whatever company address parts are stored;
  // omit it entirely if none are set (rather than showing another company's).
  const addressLine = [p.company_address, p.company_city, p.company_state, p.company_pincode]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(', ');

  let y = margin + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 14;
  if (addressLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(addressLine, pageWidth / 2, y, { align: 'center' });
    y += 14;
  } else {
    y += 4;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Pay Slip for the month of ${monthYear}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // ---- Employee + bank details (two columns, bordered) ----
  const leftRows = [
    ['Emp. Code', p.employee_code || '-'],
    ['Name', `${p.first_name || ''} ${p.last_name || ''}`.trim() || '-'],
    ['Designation', p.designation || '-'],
    ['Department', p.department || '-'],
    ['Grade', p.grade || '-'],
    ['DOJ', formatDMY(p.date_of_joining)],
  ];
  const rightRows = [
    ['Location', p.site_name || 'PUNE'],
    ['Bank', p.bank_name || '-'],
    ['Bank A/c No.', p.account_number || '-'],
    ['IFSC Code', p.ifsc_code || '-'],
    ['PAN', p.pan_no || '-'],
    ['PF No.', p.pf_no || p.uan_no || '-'],
  ];
  const detailBody = leftRows.map((lr, i) => {
    const rr = rightRows[i] || ['', ''];
    return [lr[0], lr[1], rr[0], rr[1]];
  });
  // Payable days on its own trailing right-aligned row
  detailBody.push(['', '', 'Payable Days:', String(p.days_present ?? 0)]);

  autoTable(doc, {
    startY: y,
    body: detailBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.175 },
      1: { cellWidth: contentWidth * 0.325 },
      2: { fontStyle: 'bold', cellWidth: contentWidth * 0.175 },
      3: { cellWidth: contentWidth * 0.325 },
    },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ---- Earnings + Deductions (two side-by-side tables under one band) ----
  const half = contentWidth / 2;

  // Header band "Earnings | Deductions"
  autoTable(doc, {
    startY: y,
    head: [['Earnings', 'Deductions']],
    body: [],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.5 },
    columnStyles: { 0: { cellWidth: half }, 1: { cellWidth: half } },
    margin: { left: margin, right: margin },
  });
  const tablesTop = doc.lastAutoTable.finalY;

  // Earnings (left half): Description + Amount, mirroring the deductions side
  // (the old Rate/Monthly/Arrear/Total repeated the same number and left
  // Arrear always blank, which confused employees).
  const basic = n(p.basic_salary);
  const hra = n(p.hra);
  const allowance = n(p.other_allowances); // the single real allowance line
  autoTable(doc, {
    startY: tablesTop,
    head: [['Description', 'Amount']],
    body: [
      ['BASIC SAL', formatCurrency(basic)],
      ['HRA', formatCurrency(hra)],
      ['ALLOWANCE', formatCurrency(allowance)],
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7, halign: 'center' },
    columnStyles: {
      0: { cellWidth: half * 0.7 },
      1: { cellWidth: half * 0.3, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    tableWidth: half,
  });
  const earnEnd = doc.lastAutoTable.finalY;

  // Deductions (right half): Description, Amount
  const pf = n(p.pf_deduction);
  const pt = n(p.professional_tax);
  const mediclaim = n(p.mediclaim_deduction) || n(p.health_insurance);
  const advance = n(p.advance_deduction);
  const esi = n(p.esi_deduction);
  autoTable(doc, {
    startY: tablesTop,
    head: [['Description', 'Amount']],
    body: [
      ['PROV. FUND', formatCurrency(pf)],
      ['PROF TAX', formatCurrency(pt)],
      ['MEDICLAIM', formatCurrency(mediclaim)],
      ['SALARY ADVANCE', formatCurrency(advance)],
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7, halign: 'center' },
    columnStyles: {
      0: { cellWidth: half * 0.7 },
      1: { cellWidth: half * 0.3, halign: 'right' },
    },
    margin: { left: mid, right: margin },
    tableWidth: half,
  });
  const dedEnd = doc.lastAutoTable.finalY;

  // ---- Totals below the taller of the two tables ----
  const grossPay = n(p.gross_salary);
  // Match the old template's GROSS DEDUCTION formula exactly (recomputed, not stored total)
  const totalDeductions = pf + mediclaim + esi + advance + pt;
  const netPay = n(p.net_salary);

  // Bonus is not shown as a separate line: the statutory bonus is already
  // included inside gross (carved out of the incentive), so net pay already
  // accounts for it. Showing a "+ bonus / net pay with bonus" line was
  // misleading (the total never changed). Net Pay stands on its own.
  const totalsRows = [
    [`GROSS PAY   ${formatCurrency(grossPay)}`, `GROSS DEDUCTION   ${formatCurrency(totalDeductions)}`],
    [`NET PAY`, formatCurrency(netPay)],
  ];

  autoTable(doc, {
    startY: Math.max(earnEnd, dedEnd),
    body: totalsRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0], halign: 'center' },
    columnStyles: { 0: { cellWidth: half }, 1: { cellWidth: half } },
    margin: { left: margin, right: margin },
  });
  let ty = doc.lastAutoTable.finalY;

  // Amount in words band (full width)
  autoTable(doc, {
    startY: ty,
    body: [[`Amount in words: ${numberToWords(netPay)}`]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, fontStyle: 'italic', halign: 'center', fillColor: [224, 224, 224], lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
    columnStyles: { 0: { cellWidth: contentWidth } },
    margin: { left: margin, right: margin },
  });
  ty = doc.lastAutoTable.finalY + 15;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 102);
  doc.text('This is a computer-generated pay slip and no signature is required.', pageWidth / 2, ty, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
};

module.exports = { buildPayslipPdf };
