/**
 * Shared display formatters for the admin UI + employee portal.
 *
 * formatCurrency was hand-rolled in ~13 components with the SAME core format
 * (₹ + Indian digit grouping + 0 decimals) but slightly different empty-value
 * handling. This is the single canonical version.
 *
 * NOT for PDF templates: backend/src/utils/payslipPdf.js and the @react-pdf
 * PayslipPDFTemplateNew deliberately render "Rs." (font/consistency reasons);
 * OfferLetterGenerator renders a plain number without a symbol. Those keep their
 * own formatting on purpose.
 */

// Indian Rupee, whole rupees (no paise). Empty/invalid values render as "-".
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '-';
  const n = Number(amount);
  if (Number.isNaN(n)) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};
