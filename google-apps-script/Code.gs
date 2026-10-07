/**
 * Engagement RSVP → Google Sheet
 *
 * Paste this file into Extensions → Apps Script of your RSVP Google Sheet,
 * then Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the Web app URL into rsvpSheetUrl in js/config.js.
 * Full steps: README.md, "RSVP form → Google Sheet".
 */

const SHEET_NAME = "RSVP";
const HEADERS = ["Submitted at", "Name", "Phone", "Adults", "Children", "Total pax", "Meal", "Invited by"];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Spam trap: real guests never fill this hidden field.
  if (p.website) return reply_({ ok: true });

  const name = clean_(p.name, 120);
  if (!name) return reply_({ ok: false, error: "Name is required" });

  const adults = count_(p.adults, 1);
  const children = count_(p.children, 0);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      name,
      clean_(p.phone, 30),
      adults,
      children,
      adults + children,
      clean_(p.meal, 30),
      clean_(p.invitedBy, 40),
    ]);
  } finally {
    lock.releaseLock();
  }
  return reply_({ ok: true });
}

// Opening the Web app URL in a browser shows this, so you can check it is live.
function doGet() {
  return reply_({ ok: true, message: "RSVP endpoint is running." });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Trim, limit length, and stop text being read as a spreadsheet formula.
function clean_(value, max) {
  const s = String(value || "").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function count_(value, min) {
  const n = parseInt(value, 10);
  return isNaN(n) ? min : Math.max(min, Math.min(20, n));
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
