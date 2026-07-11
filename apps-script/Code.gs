// Unite Staycation V15 Google Sheet Backup
// Script Properties bắt buộc: SUPABASE_URL, SUPABASE_ANON_KEY
// Deploy: Web app > Execute as Me > Anyone with link.
// Mỗi request phải mang Supabase access token hợp lệ và role vận hành.

const SHEET_NAME = 'Bookings';
const ALLOWED_ROLES = ['super_admin', 'admin', 'cskh', 'accountant'];
const HEADERS = [
  'id','createdAt','updatedAt','checkinAt','checkoutAt','branch','roomId','roomName','roomUnitCode','roomUnitName',
  'customerName','phone','email','source','status','packageLabel','guests','total','deposit','paid','balance',
  'paymentMethod','assignedTo','note','externalRef','depositBillUrl','fullPaymentBillUrl','depositBillPath','fullPaymentBillPath','sheetSyncedAt'
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const auth = verifySupabaseUser_(body.accessToken || '');
    if (!auth.ok) return json_({ ok: false, error: auth.error || 'Unauthorized' });

    const booking = sanitizeBooking_(body.booking || {});
    if (!booking.id) return json_({ ok: false, error: 'Thiếu booking.id' });

    const sheet = getSheet_();
    upsertBooking_(sheet, booking);
    return json_({ ok: true, role: auth.role });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function verifySupabaseUser_(accessToken) {
  if (!accessToken) return { ok: false, error: 'Thiếu access token' };
  const props = PropertiesService.getScriptProperties();
  const baseUrl = String(props.getProperty('SUPABASE_URL') || '').replace(/\/$/, '');
  const anonKey = props.getProperty('SUPABASE_ANON_KEY') || '';
  if (!baseUrl || !anonKey) return { ok: false, error: 'Apps Script chưa có SUPABASE_URL/SUPABASE_ANON_KEY' };

  const commonHeaders = { apikey: anonKey, Authorization: 'Bearer ' + accessToken };
  const userRes = UrlFetchApp.fetch(baseUrl + '/auth/v1/user', {
    method: 'get', headers: commonHeaders, muteHttpExceptions: true
  });
  if (userRes.getResponseCode() !== 200) return { ok: false, error: 'Supabase token không hợp lệ hoặc đã hết hạn' };
  const user = JSON.parse(userRes.getContentText() || '{}');
  if (!user.id) return { ok: false, error: 'Không xác định được user' };

  const profileUrl = baseUrl + '/rest/v1/app_profiles?select=role,is_active&user_id=eq.' + encodeURIComponent(user.id) + '&limit=1';
  const profileRes = UrlFetchApp.fetch(profileUrl, {
    method: 'get', headers: commonHeaders, muteHttpExceptions: true
  });
  if (profileRes.getResponseCode() !== 200) return { ok: false, error: 'Không đọc được app_profiles' };
  const rows = JSON.parse(profileRes.getContentText() || '[]');
  const profile = rows[0];
  if (!profile || profile.is_active !== true || ALLOWED_ROLES.indexOf(profile.role) < 0) {
    return { ok: false, error: 'Tài khoản chưa có quyền vận hành' };
  }
  return { ok: true, role: profile.role, userId: user.id };
}

function sanitizeBooking_(booking) {
  const clean = {};
  HEADERS.forEach(function (key) {
    const value = booking[key];
    let text = value === undefined || value === null ? '' : String(value).slice(0, 5000);
    // Chặn spreadsheet-formula injection từ tên khách, ghi chú hoặc dữ liệu OTA.
    if (/^[=+\-@]/.test(text.trimStart())) text = "'" + text;
    clean[key] = text;
  });
  return clean;
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  const current = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (current.join('') === '' || current[0] !== HEADERS[0]) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function upsertBooking_(sheet, booking) {
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(booking.id || '')) {
      targetRow = i + 1;
      break;
    }
  }
  const row = HEADERS.map(function (h) { return booking[h] === undefined ? '' : booking[h]; });
  if (targetRow > 0) sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
