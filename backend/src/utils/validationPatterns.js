/**
 * Canonical validation regexes — the single source of truth.
 *
 * These patterns were duplicated as literals across helpers.js (boolean checks
 * on raw input) and validators.js ({valid,message} on cleaned input), and the
 * UAN pattern again in ecrController.js. Import from here so a format change is
 * made once. Callers keep their own input-handling (raw vs cleaned) and return
 * shape (boolean vs {valid,message}); only the pattern is shared.
 */
module.exports = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MOBILE: /^[6-9]\d{9}$/,        // 10 digits, starts 6-9
  AADHAAR: /^\d{12}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  UAN: /^\d{12}$/,               // EPFO Universal Account Number
};
