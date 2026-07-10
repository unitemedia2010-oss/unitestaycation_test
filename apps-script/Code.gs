const SPREADSHEET_ID = '1sd9TKGa2v-6KJWzFjPLGXJ2aOTPXCZdi-ExnkNGrsUM';
const SHEET_NAME = 'Bookings';

const HEADERS = [
  'id',
  'createdAt',
  'updatedAt',
  'stayDate',
  'checkoutDate',
  'startTime',
  'endTime',
  'branch',
  'roomId',
  'roomName',
  'customerName',
  'phone',
  'email',
  'source',
  'status',
  'packageLabel',
  'nights',
  'guests',
  'total',
  'deposit',
  'paid',
  'balance',
  'paymentMethod',
  'assignedTo',
  'note',
  'billName',
  'billUploadedAt',
  'billUrl',
  'payments',
  'externalRef',
  'supabaseUpdatedAt',
  'sheetSyncedAt'
];

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'ping');
  const callback = e && e.parameter && e.parameter.callback;

  if (action === 'ping') {
    return jsonOutput({ ok: true, message: 'Unite Staycation Sheet API is live.' }, callback);
  }

  if (action === 'schema') {
    return jsonOutput({ ok: true, headers: HEADERS }, callback);
  }

  if (action === 'list') {
    const sheet = getBookingSheet_();
    return jsonOutput({ ok: true, rows: readRows_(sheet) }, callback);
  }

  return jsonOutput({ ok: false, error: `Unknown action: ${action}` }, callback);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload_(e);
    const action = String(payload.action || 'upsert');
    const sheet = getBookingSheet_();

    if (action === 'append') {
      const row = normalizeRow_(payload.booking || payload);
      sheet.appendRow(HEADERS.map(header => row[header] || ''));
      return jsonOutput({ ok: true, action, id: row.id });
    }

    if (action === 'upsert') {
      const row = normalizeRow_(payload.booking || payload);
      const rowIndex = findRowById_(sheet, row.id);
      const values = HEADERS.map(header => row[header] || '');

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([values]);
        return jsonOutput({ ok: true, action, mode: 'updated', id: row.id, rowIndex });
      }

      sheet.appendRow(values);
      return jsonOutput({ ok: true, action, mode: 'inserted', id: row.id, rowIndex: sheet.getLastRow() });
    }

    return jsonOutput({ ok: false, error: `Unknown action: ${action}` });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    lock.releaseLock();
  }
}

function getBookingSheet_() {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  const missingHeader = HEADERS.some((header, index) => current[index] !== header);
  if (missingHeader) {
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function readRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => HEADERS.reduce((item, header, index) => {
      item[header] = row[index];
      return item;
    }, {}));
}

function normalizeRow_(source) {
  const now = new Date().toISOString();
  const row = {};
  HEADERS.forEach(header => row[header] = source[header] == null ? '' : source[header]);
  if (!row.id) row.id = `US-${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd')}-${Utilities.getUuid().slice(0, 6).toUpperCase()}`;
  if (!row.createdAt) row.createdAt = now;
  row.updatedAt = row.updatedAt || now;
  row.sheetSyncedAt = now;
  return row;
}

function findRowById_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return -1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const found = ids.findIndex(row => String(row[0]) === String(id));
  return found >= 0 ? found + 2 : -1;
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function jsonOutput(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
