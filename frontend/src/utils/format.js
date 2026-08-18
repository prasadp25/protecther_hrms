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

// Short date, e.g. "05 Sep 2026". Empty/invalid values render as "-".
export const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Date + time, e.g. "05 Sep 2026, 02:30 pm". For audit logs / timestamps.
export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};
