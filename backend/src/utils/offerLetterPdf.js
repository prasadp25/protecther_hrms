/**
 * Server-side offer letter PDF generation.
 *
 * Port of the drawing code that used to live in the frontend
 * OfferLetterGenerator - kept visually identical (same jspdf +
 * jspdf-autotable libraries, same layout) so letters generated
 * server-side match the ones HR downloaded before.
 */
const path = require('path');
const fs = require('fs');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

const LOGO_PATH = path.join(__dirname, '../assets/offer-letter-logo.jpg');
let cachedLogoDataUri = null;

const getLogoDataUri = () => {
  if (!cachedLogoDataUri && fs.existsSync(LOGO_PATH)) {
    cachedLogoDataUri = 'data:image/jpeg;base64,' + fs.readFileSync(LOGO_PATH).toString('base64');
  }
  return cachedLogoDataUri;
};

const formatCurrency = (amount) => {
  if (!amount) return '0';
  return new Intl.NumberFormat('en-IN').format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Build the offer letter PDF.
 * @param {Object} candidate - candidate row (with site_name if joined)
 * @param {Object} offer - { offer_letter_ref, offer_letter_date, expected_joining_date, reporting_manager, site_name }
 * @returns {Buffer} PDF file contents
 */
const buildOfferLetterPdf = (candidate, offer) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 15;

  // Header with Logo
  const logo = getLogoDataUri();
  if (logo) {
    doc.addImage(logo, 'JPEG', margin, y, 50, 20);
  }

  // Company details on the right side
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text('PROTECTHER LLP', pageWidth - margin, y + 5, { align: 'right' });
  doc.text('+91 9699791896 | hr@protecther.in', pageWidth - margin, y + 10, { align: 'right' });
  doc.text('Pune, Maharashtra, India', pageWidth - margin, y + 15, { align: 'right' });

  y += 30;

  // Horizontal line separator
  doc.setDrawColor(150, 180, 80);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Reference and Date
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Ref. No: ' + (offer.offer_letter_ref || 'Pending Assignment'), margin, y);
  doc.text('Date: ' + formatDate(offer.offer_letter_date), pageWidth - margin, y, { align: 'right' });
  y += 15;

  // To Section
  doc.setFont('helvetica', 'normal');
  doc.text('To,', margin, y); y += 6;
  const prefix = candidate.gender === 'Female' ? 'Ms.' : 'Mr.';
  doc.text(prefix + ' ' + candidate.first_name + ' ' + candidate.last_name, margin, y); y += 6;
  if (candidate.address) { doc.text(candidate.address, margin, y); y += 6; }
  if (candidate.city || candidate.state) {
    doc.text((candidate.city || '') + (candidate.city && candidate.state ? ', ' : '') + (candidate.state || '') + (candidate.pincode ? ' - ' + candidate.pincode : ''), margin, y);
    y += 6;
  }
  doc.text('Contact No.: ' + candidate.mobile, margin, y); y += 6;
  if (candidate.email) { doc.text('E Mail ID - ' + candidate.email, margin, y); y += 6; }
  y += 8;

  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('Subject: Offer of Employment for the Position - ' + candidate.designation, margin, y);
  y += 12;

  // Dear Section
  doc.setFont('helvetica', 'normal');
  doc.text('Dear ' + candidate.first_name + ' Congratulations!', margin, y);
  y += 8;
  const intro = 'We are pleased to offer you the position for ' + candidate.designation + ' and welcome you to the PROTECTHER LLP.';
  const introLines = doc.splitTextToSize(intro, pageWidth - 2 * margin);
  doc.text(introLines, margin, y);
  y += introLines.length * 6 + 6;

  // Terms and Conditions
  doc.setFont('helvetica', 'bold');
  doc.text('Here with attached terms and conditions:', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');

  const terms = [
    '1. Your date of joining will be ' + formatDate(offer.expected_joining_date) + '. You will initially be reporting to ' + (offer.reporting_manager || 'your manager') + ' at ' + (offer.site_name || 'the assigned site') + '. Based on operational requirements, you may be transferred to other project sites across PAN India as per management decision.',
    '2. You will be paid a total remuneration of Rs. ' + formatCurrency(candidate.ctc) + '/- (CTC), which includes the employer\'s contributions towards PF/Mediclaim, if applicable etc. The allowances, benefits and other terms and conditions of your employment will be as per Company policies as applicable from time to time. Minimum ' + (candidate.notice_period || 15) + ' days of notice period will be considered for your notice period in case of letter of resignation.',
    '3. We expect you to join on or before the date mentioned above, in line with discussion with you, otherwise this offer will stand withdrawn automatically. We also reserve to cancel this offer in case any information furnished by you is found to be false.',
    '4. On joining the company, you shall be on probation for ' + (candidate.probation_period || 6) + ' months, this may be reduced or extended based on your performance or conduct. You will abide by the rules and regulations of the Company as may be in force from time to time.',
    '5. Failed to serve the notice period and probation period will go for further legal proceeding such as termination or suspension.',
    '6. Any employee going on unapproved leaves of more than 15 days will go for the legal proceeding direct termination/suspension.'
  ];

  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, pageWidth - 2 * margin);
    if (y + lines.length * 5 > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  });

  // Page 2 - Documents and Salary
  doc.addPage();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DOCUMENTS REQUIRED BEFORE JOINING', margin, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const documents = [
    'Updated CV',
    'Proof for Birth date (PAN Card / ADHAR Card / Birth Certificate / Leaving Certificate / Transfer Certificate)',
    'Proof of Identity (Passport / Driving License / Voter ID Card)',
    'Academic and Professional Certificates',
    'Softcopy of recent photograph in JPEG format',
    'Release Certificate / Resignation acceptance from last employer',
    'Pay slip and bank statement for last 3 months',
    'UAN or PF details'
  ];

  documents.forEach(docItem => {
    doc.text('• ' + docItem, margin + 5, y);
    y += 6;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Your tentative salary break-up as below:', margin, y);
  y += 10;

  // Salary Table
  autoTable(doc, {
    startY: y,
    head: [['Particulars', 'Amount', 'Deductions', 'Amount']],
    body: [
      ['Basic', formatCurrency(candidate.basic_salary), 'PF', formatCurrency(candidate.pf_deduction)],
      ['HRA', formatCurrency(candidate.hra), 'PT', formatCurrency(candidate.pt_deduction)],
      ['Conveyance', formatCurrency(candidate.conveyance_allowance), 'Mediclaim', formatCurrency(candidate.mediclaim_deduction)],
      ['Other Allowances', formatCurrency(candidate.other_allowances), '', ''],
      ['Gross Salary', formatCurrency(candidate.gross_salary), 'Total Deductions', formatCurrency(candidate.total_deductions)],
      ['', '', 'Net Payment', formatCurrency(candidate.net_salary)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 15;

  // Note
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Note - This is for your reference, if any changes it will be as per the government statutory norms.', margin, y);
  y += 6;
  doc.text('PT will be 300 for month of February.', margin, y);
  y += 15;

  // Signature Section
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Thanking you,', margin, y);
  doc.text('Agreed and Accepted', pageWidth - margin - 50, y);
  y += 6;
  doc.text('For PROTECTHER LLP', margin, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Ms. Ayushi Shukla', margin, y);
  doc.text(prefix + ' ' + candidate.first_name + ' ' + candidate.last_name, pageWidth - margin - 50, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('HR Head and Talent Acquisition', margin, y);
  doc.text('(Signature & Date)', pageWidth - margin - 50, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('www.protecther.in | hr@protecther.in | +91 9699791896', pageWidth / 2, 285, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
};

module.exports = { buildOfferLetterPdf };
