/**
 * Google Apps Script (tempelkan ke Extensions → Apps Script)
 * Backend untuk GitHub Pages via JSONP (bebas CORS).
 *
 * Cara pakai:
 *  - list:  ?action=list&key=API_KEY&callback=cb
 *  - add :  ?action=add&key=API_KEY&nama=...&status=...&hari=YYYY-MM-DD&biaya=...&lokasi=...&callback=cb
 */

const API_KEY = "GANTI_API_KEY_DI_SINI";
const SHEET_NAME = "Data";

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const callback = p.callback;

  if (!p.key || p.key !== API_KEY) {
    return output({ ok: false, error: "unauthorized" }, callback);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_NAME);

  const action = String(p.action || "list").toLowerCase();

  if (action === "add") {
    const nama = String(p.nama || "").trim();
    const status = String(p.status || "").trim();
    const hari = String(p.hari || "").trim(); // yyyy-mm-dd
    const biaya = Number(p.biaya || 0);
    const lokasi = String(p.lokasi || "").trim();

    if (!nama || !status || !hari || !lokasi) {
      return output({ ok: false, error: "missing_fields" }, callback);
    }

    const tz = Session.getScriptTimeZone() || "Asia/Jakarta";
    const stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX");

    // Lock untuk mengurangi risiko race condition saat banyak submit
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow([stamp, nama, status, hari, biaya, lokasi]);
    } finally {
      lock.releaseLock();
    }

    return output({ ok: true }, callback);
  }

  if (action === "list") {
    const values = sheet.getDataRange().getValues();
    const rows = values.slice(1).map(r => ({
      timestamp: r[0],
      nama: r[1],
      status_pembayaran: r[2],
      hari_kegiatan: r[3],
      biaya: r[4],
      lokasi: r[5],
    }));
    return output({ ok: true, data: rows }, callback);
  }

  if (action === "health") {
    return output({ ok: true, status: "up" }, callback);
  }

  return output({ ok: false, error: "unknown_action" }, callback);
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  // Pastikan header ada
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["timestamp","nama","status_pembayaran","hari_kegiatan","biaya","lokasi"]);
  } else {
    const headers = sheet.getRange(1,1,1,6).getValues()[0];
    const expected = ["timestamp","nama","status_pembayaran","hari_kegiatan","biaya","lokasi"];
    if (headers.join("|") !== expected.join("|")) {
      // kalau sheet sudah ada tapi header beda, jangan overwrite; tetap lanjut.
      // Anda bisa rapikan manual kalau diperlukan.
    }
  }

  return sheet;
}

function output(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
