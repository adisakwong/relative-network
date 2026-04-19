/**
 * Relative Network - Google Apps Script Backend
 *
 * ✅ รองรับทั้ง local (file://) และ server (GitHub Pages)
 *
 * HOW CORS WORKS HERE:
 * - POST requests: ใช้ Content-Type: text/plain ป้องกัน CORS preflight (OPTIONS)
 *   → GAS จะส่ง Access-Control-Allow-Origin: * กลับมาเองเมื่อ deploy เป็น "Anyone"
 * - GET requests: รองรับ JSONP (callback param) → ไม่มี CORS เลย ใช้ได้ทุกที่
 * - GET + action: ทดสอบ / อ่านข้อมูลผ่าน URL ได้โดยตรง
 *
 * DEPLOY SETTINGS (สำคัญ):
 * - Execute as: Me
 * - Who has access: Anyone
 */

const CONFIG = {
  SHEET_NAME_ADMIN:      'admin',
  SHEET_NAME_MEMBERS:    'members',
  SHEET_NAME_ACTIVITIES: 'activities',

  // *** นำ ID ของโฟลเดอร์จาก Google Drive มาวางที่นี่ ***
  FOLDER_ID_MEMBERS:    '1EuXqn_5i9ZDwWUCT7oSRVXU8nKBM8E75',
  FOLDER_ID_ACTIVITIES: '1K3jcnh_PcyXWfvQwb0ZUuJoFFHZnkMua',

  // Max file size: 5 MB (in bytes)
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024
};

// ─────────────────────────────────────────────
// POST handler — รับ JSON body จาก frontend
// ─────────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse(false, 'ไม่มีข้อมูลที่ส่งมา (empty body)');
    }

    const data = JSON.parse(e.postData.contents);
    const action = (data.action || '').trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    Logger.log('[doPost] action=' + action);

    if (action === 'login') {
      return handleLogin(ss, data.adminPassword);
    }

    // ตรวจสิทธิ์สำหรับ action อื่นๆ
    if (!verifyAdmin(ss, data.adminPassword)) {
      return createResponse(false, 'สิทธิ์ไม่ถูกต้อง หรือรหัสผ่านผิด');
    }

    if (action === 'addMember') {
      return handleAddMember(ss, data.member);
    }

    if (action === 'addActivity') {
      return handleAddActivity(ss, data.activity);
    }

    return createResponse(false, 'ไม่พบ action: ' + action);

  } catch (err) {
    Logger.log('[doPost] ERROR: ' + err.toString());
    return createResponse(false, 'ข้อผิดพลาดระบบ: ' + err.message);
  }
}

// ─────────────────────────────────────────────
// GET handler — รองรับ JSONP และ action via URL
// ใช้สำหรับ: ทดสอบ, local dev, JSONP fallback
//
// ตัวอย่าง URL:
// ?action=ping                      → health check
// ?action=ping&callback=myFn        → JSONP health check
// ─────────────────────────────────────────────
function doGet(e) {
  try {
    const params   = (e && e.parameter) ? e.parameter : {};
    const action   = (params.action   || 'ping').trim();
    const callback = (params.callback || '').trim();

    Logger.log('[doGet] action=' + action);

    let result;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      result = { success: true, message: 'Backend is active ✅', timestamp: new Date().toISOString() };

    } else if (action === 'getMembers') {
      result = getSheetData(ss, CONFIG.SHEET_NAME_MEMBERS);

    } else if (action === 'getActivities') {
      result = getSheetData(ss, CONFIG.SHEET_NAME_ACTIVITIES);

    } else {
      result = { success: false, message: 'Unknown action: ' + action };
    }

    // JSONP — ไม่มี CORS เลย ใช้ได้ทั้ง file:// และ GitHub Pages
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('[doGet] ERROR: ' + err.toString());
    const errResult = { success: false, message: 'ข้อผิดพลาดระบบ: ' + err.message };
    const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errResult) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(JSON.stringify(errResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อ่านข้อมูลจาก Sheet แถวแรกเป็น headers แถวถัดไปเป็น data
 * คืนค่า: { success, data: [ {col: value, ...}, ... ] }
 */
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { success: false, message: 'ไม่พบ sheet: ' + sheetName, data: [] };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return { success: true, data: [] };
  }

  const rawData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = rawData[0].map(h => String(h).trim());
  const rows    = [];

  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    // ข้ามแถวว่างทั้งหมด
    if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] !== undefined && row[i] !== null) ? String(row[i]).trim() : '';
    });
    rows.push(obj);
  }

  return { success: true, data: rows };
}


// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
function handleLogin(ss, password) {
  if (!password) return createResponse(false, 'โปรดระบุรหัสผ่าน');
  if (verifyAdmin(ss, password)) {
    return createResponse(true, 'เข้าสู่ระบบสำเร็จ');
  }
  return createResponse(false, 'รหัสผ่านไม่ถูกต้อง');
}

function verifyAdmin(ss, password) {
  const adminSheet = ss.getSheetByName(CONFIG.SHEET_NAME_ADMIN);
  if (!adminSheet) return false;

  const lastRow = adminSheet.getLastRow();
  if (lastRow < 2) return false;

  const passwords = adminSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  return passwords.includes(String(password || '').trim());
}

// ─────────────────────────────────────────────
// Add Member
// ─────────────────────────────────────────────
function handleAddMember(ss, member) {
  if (!member) return createResponse(false, 'ไม่มีข้อมูลสมาชิก');

  let imageUrl = (member.Image_URL || '').trim();

  // อัปโหลดรูปภาพไปยัง Google Drive (ถ้ามี)
  if (member.imageFile && member.imageFile.base64) {
    try {
      validateImageFile(member.imageFile);
      const ext      = getExtension(member.imageFile.type);
      const fileName = 'member_' + sanitizeName(member.Nickname || member.Fullname) + '_' + Date.now() + ext;
      imageUrl = saveFileToDrive(member.imageFile.base64, CONFIG.FOLDER_ID_MEMBERS, fileName, member.imageFile.type);
      Logger.log('[handleAddMember] Image uploaded: ' + imageUrl);
    } catch (err) {
      Logger.log('[handleAddMember] Image upload failed: ' + err.toString());
      return createResponse(false, 'อัปโหลดรูปภาพล้มเหลว: ' + err.message);
    }
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_MEMBERS);
  if (!sheet) return createResponse(false, 'ไม่พบ sheet "' + CONFIG.SHEET_NAME_MEMBERS + '"');

  const numCols = sheet.getLastColumn();
  let rowData = [];
  
  if (numCols > 0) {
    const headers = sheet.getRange(1, 1, 1, numCols).getValues()[0].map(h => String(h).trim());
    rowData = new Array(headers.length).fill('');
    
    const mapData = {
      'Gener_code': member.Gener_code,
      'Nickname': member.Nickname,
      'Fullname': member.Fullname,
      'Relation_type': member.Relation_type,
      'Address': member.Address,
      'Image_URL': imageUrl,
      'Family_code': member.Family_code,
      'Parent_code': member.Parent_code
    };
    
    headers.forEach((h, i) => {
      const key = Object.keys(mapData).find(k => k.toLowerCase() === h.toLowerCase());
      if (key && mapData[key] !== undefined && mapData[key] !== null) {
        rowData[i] = String(mapData[key]).trim();
      }
    });

    if (headers[0] === '') {
      rowData = [
        (member.Gener_code    || '').trim(),
        (member.Nickname      || '').trim(),
        (member.Fullname      || '').trim(),
        (member.Relation_type || '').trim(),
        (member.Address       || '').trim(),
        imageUrl,
        (member.Family_code   || '').trim(),
        (member.Parent_code   || '').trim()
      ];
    }
  } else {
    rowData = [
      (member.Gener_code    || '').trim(),
      (member.Nickname      || '').trim(),
      (member.Fullname      || '').trim(),
      (member.Relation_type || '').trim(),
      (member.Address       || '').trim(),
      imageUrl,
      (member.Family_code   || '').trim(),
      (member.Parent_code   || '').trim()
    ];
  }

  sheet.appendRow(rowData);

  Logger.log('[handleAddMember] Row added: ' + (member.Fullname || ''));
  return createResponse(true, 'เพิ่มรายชื่อสมาชิก "' + (member.Nickname || member.Fullname) + '" เรียบร้อยแล้ว');
}

// ─────────────────────────────────────────────
// Add Activity
// ─────────────────────────────────────────────
function handleAddActivity(ss, activity) {
  if (!activity) return createResponse(false, 'ไม่มีข้อมูลกิจกรรม');

  let imageUrl = (activity.Image_act_URL || '').trim();

  // อัปโหลดรูปภาพไปยัง Google Drive (ถ้ามี)
  if (activity.imageFile && activity.imageFile.base64) {
    try {
      validateImageFile(activity.imageFile);
      const ext      = getExtension(activity.imageFile.type);
      const fileName = 'activity_' + Date.now() + ext;
      imageUrl = saveFileToDrive(activity.imageFile.base64, CONFIG.FOLDER_ID_ACTIVITIES, fileName, activity.imageFile.type);
      Logger.log('[handleAddActivity] Image uploaded: ' + imageUrl);
    } catch (err) {
      Logger.log('[handleAddActivity] Image upload failed: ' + err.toString());
      return createResponse(false, 'อัปโหลดรูปภาพล้มเหลว: ' + err.message);
    }
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ACTIVITIES);
  if (!sheet) return createResponse(false, 'ไม่พบ sheet "' + CONFIG.SHEET_NAME_ACTIVITIES + '"');

  const dateStr = (activity.Date || '').trim() || new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  sheet.appendRow([
    dateStr,
    (activity.Description || '').trim(),
    imageUrl
  ]);

  Logger.log('[handleAddActivity] Row added: ' + dateStr);
  return createResponse(true, 'เพิ่มกิจกรรม "' + dateStr + '" เรียบร้อยแล้ว');
}

// ─────────────────────────────────────────────
// Google Drive File Upload
// ─────────────────────────────────────────────
function saveFileToDrive(base64Data, folderId, fileName, contentType) {
  const folder      = DriveApp.getFolderById(folderId);
  const base64Body  = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const decodedData = Utilities.base64Decode(base64Body);
  const blob        = Utilities.newBlob(decodedData, contentType, fileName);
  const file        = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // thumbnail URL ที่ใช้แสดงผลในเว็บไซต์
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400';
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** ตรวจสอบชนิดและขนาดไฟล์ */
function validateImageFile(imageFile) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(imageFile.type)) {
    throw new Error('ชนิดไฟล์ไม่รองรับ: ' + imageFile.type + ' (รองรับ JPG, PNG, WEBP, GIF)');
  }
  // ประมาณขนาดจาก Base64 (base64 โต ~33% กว่าต้นฉบับ)
  const base64Body = imageFile.base64.includes(',') ? imageFile.base64.split(',')[1] : imageFile.base64;
  const approxSize = Math.ceil(base64Body.length * 0.75);
  if (approxSize > CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new Error('ไฟล์ขนาดใหญ่เกินไป (' + (approxSize / 1024 / 1024).toFixed(1) + ' MB) สูงสุด 5 MB');
  }
}

/** สร้าง extension จาก MIME type */
function getExtension(mimeType) {
  const map = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
  return map[mimeType] || '';
}

/** ล้างอักขระพิเศษออกจากชื่อไฟล์ */
function sanitizeName(name) {
  return (name || 'unknown').replace(/[^a-zA-Z0-9ก-๙]/g, '_').substring(0, 30);
}

/** สร้าง JSON Response มาตรฐาน */
function createResponse(success, message, extra) {
  const output = Object.assign({ success: success, message: message }, extra || {});
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────
// ฟังก์ชันทดสอบ — รันจาก Apps Script Editor
// ─────────────────────────────────────────────

/** ทดสอบการเชื่อมต่อ Drive และ Sheet */
function runDiagnostics() {
  const results = [];

  // 1. Spreadsheet
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().map(s => s.getName());
    results.push('✅ Spreadsheet: ' + ss.getName());
    results.push('   Sheets: ' + sheets.join(', '));

    const missingSheets = [CONFIG.SHEET_NAME_ADMIN, CONFIG.SHEET_NAME_MEMBERS, CONFIG.SHEET_NAME_ACTIVITIES]
      .filter(name => !sheets.includes(name));
    if (missingSheets.length) {
      results.push('⚠️  Missing sheets: ' + missingSheets.join(', '));
    }
  } catch (e) { results.push('❌ Spreadsheet: ' + e.message); }

  // 2. Members folder
  try {
    const f = DriveApp.getFolderById(CONFIG.FOLDER_ID_MEMBERS);
    results.push('✅ Members folder: ' + f.getName() + ' (' + CONFIG.FOLDER_ID_MEMBERS + ')');
  } catch (e) { results.push('❌ Members folder: ' + e.message); }

  // 3. Activities folder
  try {
    const f = DriveApp.getFolderById(CONFIG.FOLDER_ID_ACTIVITIES);
    results.push('✅ Activities folder: ' + f.getName() + ' (' + CONFIG.FOLDER_ID_ACTIVITIES + ')');
  } catch (e) { results.push('❌ Activities folder: ' + e.message); }

  // 4. File creation test
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID_MEMBERS);
    const testFile = folder.createFile(Utilities.newBlob('test', 'text/plain', 'diag_test.txt'));
    testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    testFile.setTrashed(true);
    results.push('✅ File creation: OK (ไฟล์ทดสอบถูกสร้างและลบแล้ว)');
  } catch (e) { results.push('❌ File creation: ' + e.message); }

  const output = results.join('\n');
  Logger.log('\n=== DIAGNOSTICS ===\n' + output);
  return output;
}

/** ทดสอบเพิ่มสมาชิก (ไม่มีรูป) */
function testAddMemberNoImage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = handleAddMember(ss, {
    Gener_code:    'TEST-' + Date.now(),
    Fullname:      'ทดสอบ ระบบ',
    Nickname:      'ทดสอบ',
    Relation_type: 'ทดสอบ',
    Address:       'กรุงเทพฯ'
  });
  Logger.log(result.getContent());
}
