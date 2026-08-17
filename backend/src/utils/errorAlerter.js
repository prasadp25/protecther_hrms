/**
 * Error alerting — emails an admin when the API hits a server (5xx) error.
 *
 * Safe by design:
 *  - Disabled unless ERROR_ALERT_EMAIL is set (deploying the code is a no-op
 *    until a recipient is configured).
 *  - Only 5xx errors trigger an alert (client errors like 400/401/404 don't).
 *  - Throttled: identical errors (same name + message + path) are muted for a
 *    cooldown window so a burst can't flood the inbox.
 *  - Fire-and-forget and fully wrapped in try/catch: alerting can never delay
 *    or break the request it is reporting on.
 */
const { sendEmail } = require('./emailService');

const COOLDOWN_MS = (parseInt(process.env.ERROR_ALERT_COOLDOWN_MIN, 10) || 15) * 60 * 1000;
const lastSent = new Map(); // signature -> timestamp

const escapeHtml = (s) => String(s ?? '').replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));

const withinCooldown = (sig) => {
  const now = Date.now();
  const prev = lastSent.get(sig) || 0;
  if (now - prev < COOLDOWN_MS) return true;
  lastSent.set(sig, now);
  // Occasional prune so the map can't grow unbounded.
  if (lastSent.size > 200) {
    for (const [k, t] of lastSent) if (now - t > COOLDOWN_MS) lastSent.delete(k);
  }
  return false;
};

/**
 * @param {Error} error   the error (expects .name/.message/.statusCode/.stack)
 * @param {Object} ctx    { method, path, userId }
 */
const alertError = (error, ctx = {}) => {
  try {
    const to = process.env.ERROR_ALERT_EMAIL;
    if (!to) return; // alerting off until a recipient is configured

    const status = error?.statusCode || 500;
    if (status < 500) return; // only server errors

    const sig = `${error?.name || 'Error'}|${(error?.message || '').slice(0, 120)}|${ctx.path || ''}`;
    if (withinCooldown(sig)) return;

    const fields = {
      Time: new Date().toISOString(),
      Environment: process.env.NODE_ENV || 'unknown',
      Method: ctx.method || '-',
      Path: ctx.path || '-',
      User: ctx.userId || 'anonymous',
      Status: status,
      Error: error?.name || 'Error',
      Message: error?.message || '',
    };
    const subject = `[HRMS ALERT] ${fields.Error}: ${String(fields.Message).slice(0, 80)}`;
    const rowsHtml = Object.entries(fields)
      .map(([k, v]) => `<tr><td style="padding:4px 8px"><b>${k}</b></td><td style="padding:4px 8px">${escapeHtml(v)}</td></tr>`)
      .join('');
    const html = `
      <h2 style="color:#b91c1c">HRMS server error</h2>
      <table style="border-collapse:collapse;border:1px solid #ddd">${rowsHtml}</table>
      <pre style="background:#f5f5f5;padding:10px;white-space:pre-wrap;font-size:12px">${escapeHtml(String(error?.stack || '').slice(0, 3000))}</pre>
      <p style="color:#888;font-size:12px">Further identical alerts are muted for ${COOLDOWN_MS / 60000} min.</p>`;
    const text = `HRMS server error\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${String(error?.stack || '').slice(0, 3000)}`;

    // Never await / never throw into the caller.
    Promise.resolve(sendEmail(to, subject, html, text)).catch(() => {});
  } catch {
    /* alerting must never break anything */
  }
};

module.exports = { alertError };
