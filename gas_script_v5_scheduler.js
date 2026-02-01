/**
 * gas_script_v5_scheduler.js
 * Ver 3.6: Reports (Detailed Roster, Monthly Files)
 */

// --- 設定エリア ---
const FIREBASE_CONFIG = {
    email: "firebase-adminsdk-fbsvc@kirakira-app-cc454.iam.gserviceaccount.com",
    key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCkkn2OXEMaAyKn\nCWHa00iJG7IxbqMLRhecorxqNt6EgLshgpmZ8Iwbr6uv93EAAXAujTfmG0lDYu/u\nr1YyHj7EM/xv97k4bHY4MC3XrGsOkBrMwSKaBntemmU40cZJNWkuazGLN7LMmlvk\n8faRPZ0bheaVfw5VuGIRNH1OmUakx/rWqicjjIgoUXlJ00iyzEstZVhKmk5FDqFk\n2RA8/wRbjknrpXdk2g5hrU7Yfjak3kEAIB4QHVdW8iOn2nWwrib3JOdMcz5ljmVo\nAgOcKwQB7CPXOomOvqNHm6qoN0fkccfnZ2XwfqGKNtsCAcWAvga6IYPv6yRx4dnh\nAtbMOp8lAgMBAAECggEAFbGVyXFSCxjEtZ4f/xeA5Un4WFnMNk08CZLOIXYwKOlL\nQaSUmN1DqtaiXCTTCXwnDIvjBXstUiu1kxIb26lu/rAXo67VBKIPh2KaeGarChVm\n4vzGkeUu2A6kLzQ/3iCjR9Irir2B3USvvmNC7GxhzGH/Pk+sVRJkIv53UigUTt4z\niXoWGB3SUUv8P65lXhrXNDyLoHtQdIDISgH3si7ViM2VS2pg7IrMjnRjVM0SYjTP\nkDqJ6pf1n/D4hT2aM21AfsVi3SwrKevBkCglXJ6lBQly6rEVWwhxkOyMzO4EwWOU\n3RGS8eyLQ37qEl5jN1M1MhVZuVOEU+KMnkKWnKEIoQKBgQDSyJXv9M7Bc3rOKKQO\niLsx5Gd3bDoFOOAlp7ioBk7NfGniHJYcsn6B6TP0jav7VwNfjWSeu2t4cI5qRPH2\nc/i75JPaDJtVKMivBTwURum3m/koCc1+41r7cpLMeQlLOQ46XBrVpULiAuWp1mjY\nheKovKpLOX9AvdVP3taMP9y83QKBgQDH4Cis0d+xdLu3QmnmMvNWiMySsiK9Rhtv\nehbI/aEFXZU+y/VL+K9gse8mhIjTOX3HyOb+kj8Q1aiqpwfss2fAl8VOP211jBo2\nKonLRstAQhRK44/UWUCcj4qrOxj08+uuALE6DAL3NTpyWsoKPHtIBfvdZKCHLU+k\nn+dWwC0C6QKBgQDRtzre3K5dcP0NYwgfYdEGCd8bxbVQfs8dB+vEWUpMTm22x4Rf\nFwShUpobxl0HnAJCLpafC5AY67v2ZZRsBeTDZN/qAcMGjqZk5ItrDUb6JJhYSrCH\nf8OFC/CcugwSKLlMPVmBmYSbBBDm0unMDCGAiv3QDGvcyUMTzX2fWubPjQKBgQCy\n4j3FHjiTu6PdSgU5T1RVmC1vBRruRvZ6+Mu3qrcX9D+EaknpanKbmeQtluRWFtgp\nm/aQ1Ba5XF+OC9udzpsG1U5yz3WJhJBY9g1I7t0tb3Z15+Br7k1TUWyL/2JAqKW/\nn0L+bo2g7fSXMAYuzx6OwTw/UrYRBU6IScxj6a7fMQKBgDgAub8o2HS+pLjVjk7u\nFobWcYtGEfRYtVhf0Qvnjkrp4gOx478sY+kvjpLn3Dqw27L4ZhQtUC8YlZYSrbxK\nA3wfdNBycdv9HxkwQ+fyZF9QRlIsmT24zvlwvzo+KaoD+lThnkoWs6uR27OUdIvx\ni3i8INknKImyzd3I9wgSK6yS\n-----END PRIVATE KEY-----\n`,
    projectId: "kirakira-app-cc454"
};

const SPREADSHEET_ID = "1fOUHIRKU39MFYW1iX5ZgNUQt3fyLHwDuOMF7B6-Xess";

const SHEET_NAME_DAILY = "DailyReport";
const SHEET_NAME_MEMBERS = "Members";
const SHEET_NAME_SETTINGS = "Settings";
const SHEET_NAME_STAFF = "Staff";

const firestore = FirestoreApp.getFirestore(FIREBASE_CONFIG.email, FIREBASE_CONFIG.key, FIREBASE_CONFIG.projectId);

// ==========================================
// User Configuration for Report Layout
// ==========================================
const REPORT_CONFIG = {
    // ID of the template sheet in the MAIN Spreadsheet
    // Must be "ReportTemplate" or matching the actual sheet name
    templateName: "ReportTemplate",

    // Folder to store reports (Optional: ID. If empty, creates in Root)
    // rootFolderId: "YOUR_FOLDER_ID_HERE", 
    rootFolderId: "",

    // Header Single Cell Mappings
    header: {
        date: "B3",
        weather: "D3",
        total: "C6",     // 登録数 (Example)
        present: "C7",   // 出席 (Example)
        absent: "C8",    // 欠席 (Example)
        staffText: "B12" // 職員勤務記録 (Multiline text)
    },

    // Detailed Child Roster Settings
    roster: {
        startRow: 16,     // Row number where the child list starts
        maxRows: 50,      // Max rows to clear/write
        // Column Indexes (1-based: A=1, B=2...)
        colGrade: 2,      // B
        colClass: 3,      // C
        colName: 4,       // D
        colIn: 5,         // E (Attendance Time)
        colOut: 6,        // F (Departure Time)
        colMemo: 7        // G
    }
};

// ==========================================
// Main Entry Points (Triggers & Manual Runs)
// ==========================================

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('KiraKira App')
        .addItem('Import New Members', 'importNewMembers')
        .addItem('Force Sync All Data', 'syncAllData')
        .addItem('Generate Daily Report', 'manualGenerateReport')
        .addToUi();
}

function syncAllData() {
    syncMembers();
    syncDailyReport();
    syncSettings();
    syncStaff();
    Browser.msgBox("All data synced successfully!");
}

function manualGenerateReport() {
    const today = new Date();
    // Prompt? or just Today.
    generateMonthlyReportFile(today);
}

/**
 * Generates a report in a "Year/Month" file structure.
 * 1. Finds Target Folder (Year) > Target File (Month)
 * 2. Copies Template Sheet (Day)
 * 3. Populates Header & Detailed Roster
 */
function generateMonthlyReportFile(dateObj) {
    const firestore = getFirestore();
    const ssMain = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Prepare Target File
    const yearStr = Utilities.formatDate(dateObj, "Asia/Tokyo", "yyyy年度");
    const monthStr = Utilities.formatDate(dateObj, "Asia/Tokyo", "MM月期"); // e.g. "04月期"
    const fileName = `${yearStr}_${monthStr}_業務日報`;

    // Find or Create Folder logic
    let parentFolder = DriveApp.getRootFolder();
    if (REPORT_CONFIG.rootFolderId) {
        try { parentFolder = DriveApp.getFolderById(REPORT_CONFIG.rootFolderId); } catch (e) { }
    }

    // Find Year Folder
    const folders = parentFolder.getFoldersByName(yearStr + "業務日報");
    let yearFolder;
    if (folders.hasNext()) {
        yearFolder = folders.next();
    } else {
        yearFolder = parentFolder.createFolder(yearStr + "業務日報");
    }

    // Find Month File
    const files = yearFolder.getFilesByName(fileName);
    let targetFile;
    let ssTarget;

    if (files.hasNext()) {
        targetFile = files.next();
        ssTarget = SpreadsheetApp.open(targetFile);
    } else {
        // Create new spreadsheet
        ssTarget = SpreadsheetApp.create(fileName);
        const createdFile = DriveApp.getFileById(ssTarget.getId());
        createdFile.moveTo(yearFolder); // Move to correct folder
    }

    // 2. Prepare Sheet (Day)
    const dayStr = Utilities.formatDate(dateObj, "Asia/Tokyo", "dd日");
    let targetSheet = ssTarget.getSheetByName(dayStr);

    // Get Template from Main SS
    const templateSheet = ssMain.getSheetByName(REPORT_CONFIG.templateName);
    if (!templateSheet) {
        Browser.msgBox(`Error: Template sheet '${REPORT_CONFIG.templateName}' not found in main spreadsheet.`);
        return;
    }

    if (!targetSheet) {
        // Copy Template
        targetSheet = templateSheet.copyTo(ssTarget);
        targetSheet.setName(dayStr);
        // Delete default "Sheet1" if it's the only one and is empty? Optional.
    }

    // 3. Fetch Data
    const dateStr = Utilities.formatDate(dateObj, "Asia/Tokyo", "yyyy-MM-dd");

    // Attendance
    const allAttendance = firestore.getDocuments("attendance").map(d => d.fields);
    const todayAttendance = allAttendance.filter(a => a.date && a.date.stringValue === dateStr);

    // Children Master (for names)
    const allChildren = firestore.getDocuments("children").map(d => d.fields);
    const childMap = {};
    allChildren.forEach(c => childMap[c.id] = c);

    // Staff Data (Same as before)
    let staffText = "";
    try {
        const staffDoc = firestore.getDocument(`staff_daily/${dateStr}`);
        if (staffDoc && staffDoc.fields && staffDoc.fields.list) {
            const list = staffDoc.fields.list.arrayValue.values || [];
            staffText = list.map(item => {
                const map = item.mapValue.fields;
                const status = map.status.stringValue;
                if (status === 'work' || status === 'left') {
                    const time = map.actualTime ? map.actualTime.stringValue : map.time.stringValue;
                    const end = map.actualEndTime ? map.actualEndTime.stringValue : "";
                    return `${map.name.stringValue} (${time}〜${end})`;
                }
                return null;
            }).filter(s => s).join("\n");
        }
    } catch (e) { }

    // 4. Write Header Data
    targetSheet.getRange(REPORT_CONFIG.header.date).setValue(dateObj);
    targetSheet.getRange(REPORT_CONFIG.header.total).setValue(todayAttendance.length);
    targetSheet.getRange(REPORT_CONFIG.header.present).setValue(todayAttendance.filter(a => a.status.stringValue === 'arrived' || a.status.stringValue === 'left').length);
    targetSheet.getRange(REPORT_CONFIG.header.absent).setValue(todayAttendance.filter(a => a.status.stringValue === 'absent').length);
    targetSheet.getRange(REPORT_CONFIG.header.staffText).setValue(staffText);

    // 5. Write Detailed Roster
    // Sort Attendance by Grade/Class logic (using childMap)
    todayAttendance.sort((a, b) => {
        const cA = childMap[a.childId.stringValue] || {};
        const cB = childMap[b.childId.stringValue] || {};
        const gA = cA.grade ? Number(cA.grade.integerValue || cA.grade.stringValue) : 99;
        const gB = cB.grade ? Number(cB.grade.integerValue || cB.grade.stringValue) : 99;
        if (gA !== gB) return gA - gB;
        const clA = cA.className ? cA.className.stringValue : "";
        const clB = cB.className ? cB.className.stringValue : "";
        return clA.localeCompare(clB);
    });

    const rosterData = todayAttendance.map(a => {
        const c = childMap[a.childId.stringValue] || {};
        return {
            grade: c.grade ? (c.grade.integerValue || c.grade.stringValue) : "",
            class: c.className ? c.className.stringValue : "",
            name: c.name ? c.name.stringValue : "Unknown",
            in: a.arrivalTime ? a.arrivalTime.stringValue : "",
            out: a.departureTime ? a.departureTime.stringValue : "",
            memo: a.memo ? a.memo.stringValue : ""
        };
    });

    // Clear Roster Area
    // Assuming we clear from startRow down to maxRows
    // Be careful not to delete footer if any.
    // Ideally user defines max rows.

    // Optimization: Write explicitly to cells
    const startRow = REPORT_CONFIG.roster.startRow;
    const len = rosterData.length;
    if (len > 0) {
        // Map to 2D array based on Config
        // We can't use simple setValues because columns might be scattered.
        // But for performance, it's better if they are contiguous? 
        // If user layout is scattered, we must loop setValues or setValues cell by cell.
        // Assuming user template is standard table.

        // Let's assume user layout: Grade(B), Class(C), Name(D), In(E), Out(F), Memo(G)
        // If config matches contiguous block, we do block write.

        // Detailed Write Loop (Safest for custom layout)
        rosterData.forEach((d, i) => {
            const r = startRow + i;
            targetSheet.getRange(r, REPORT_CONFIG.roster.colGrade).setValue(d.grade);
            targetSheet.getRange(r, REPORT_CONFIG.roster.colClass).setValue(d.class);
            targetSheet.getRange(r, REPORT_CONFIG.roster.colName).setValue(d.name);
            targetSheet.getRange(r, REPORT_CONFIG.roster.colIn).setValue(d.in);
            targetSheet.getRange(r, REPORT_CONFIG.roster.colOut).setValue(d.out);
            targetSheet.getRange(r, REPORT_CONFIG.roster.colMemo).setValue(d.memo);
        });
    }

    return `Generated: ${fileName} / ${dayStr}`;
}

// ==========================================
// Existing Sync Functions (Maintained)
// ==========================================

function setupV5() {
    console.log("Starting Setup V5...");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheet(ss, SHEET_NAME_SETTINGS, [["Key", "Value"]], [["fee_base_price", "3000"]]);
    ensureSheet(ss, SHEET_NAME_STAFF, [["Name", "Email", "Role", "Active"]], [["管理者", "admin@example.com", "admin", "TRUE"]]);
    syncConfigToFirestore();
}

function syncConfigToFirestore() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    syncSettings(ss);
    syncStaff(ss);
}

function syncToSheets() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    syncMembers(ss);
    syncDailyReport(ss);
}

function syncSettings(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
    if (!sheet) { setupV5(); sheet = ss.getSheetByName(SHEET_NAME_SETTINGS); }
    const data = sheet.getDataRange().getValues();
    const settings = { id: "current", fees: { basePrice: 0, snackPrice: 0, extendedPrice: 0 }, updatedAt: new Date().toISOString() };
    for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const val = data[i][1];
        if (key === "fee_base_price") settings.fees.basePrice = Number(val);
        if (key === "fee_snack_price") settings.fees.snackPrice = Number(val);
        if (key === "fee_extended_price") settings.fees.extendedPrice = Number(val);
    }
    upsertDocument("system_settings/current", settings);
    console.log("Settings synced.");
}

function syncStaff(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_STAFF);
    if (!sheet) { setupV5(); sheet = ss.getSheetByName(SHEET_NAME_STAFF); }
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        const name = data[i][0];
        const email = data[i][1];
        const role = data[i][2] || "staff";
        const active = data[i][3];
        if (!email) continue;
        const docId = email.replace(/[.#$[\]]/g, "_");
        const staffDoc = { id: docId, email: email, name: name, role: role, isActive: active === true || active === "TRUE" || active === 1, updatedAt: new Date().toISOString() };
        upsertDocument(`staff_users/${docId}`, staffDoc);
    }
    console.log("Staff synced.");
}

function upsertDocument(path, data) {
    try { firestore.createDocument(path, data); } catch (e) { try { firestore.updateDocument(path, data); } catch (e2) { console.error(`Failed to upsert: ${path}`, e2); throw e2; } }
}

function syncMembers(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_MEMBERS);
    if (!sheet) { sheet = ss.insertSheet(SHEET_NAME_MEMBERS); sheet.getRange(1, 1, 1, 8).setValues([["ID", "学年", "クラス", "氏名", "フリガナ", "許可メール", "保護者名", "電話番号"]]); }
    const allChildren = firestore.getDocuments("children").map(doc => doc.fields);
    allChildren.sort((a, b) => { if ((a.grade || 0) !== (b.grade || 0)) return (a.grade || 0) - (b.grade || 0); return (a.className || "").localeCompare(b.className || ""); });
    const rows = allChildren.map(c => [c.id, c.grade, c.className || "", c.name, c.kana || "", (c.authorizedEmails || []).join(","), c.guardianName || "", (c.phoneNumbers || []).join(",")]);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) { sheet.getRange(2, 1, lastRow - 1, 8).clearContent(); }
    if (rows.length > 0) { sheet.getRange(2, 1, rows.length, 8).setValues(rows); }
    console.log("Members synced.");
}

function syncDailyReport(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_DAILY);
    if (!sheet) { sheet = ss.insertSheet(SHEET_NAME_DAILY); sheet.getRange(1, 1, 1, 10).setValues([["日付", "学年", "クラス", "氏名", "出欠", "入室", "退室", "延長", "おやつ", "メモ"]]); }
    const today = new Date();
    const dateStr = Utilities.formatDate(today, "Asia/Tokyo", "yyyy-MM-dd");
    const allAttendance = firestore.getDocuments("attendance").map(doc => doc.fields);
    const todayRecords = allAttendance.filter(r => r.date === dateStr);
    if (todayRecords.length === 0) return;
    const allChildren = firestore.getDocuments("children").map(doc => doc.fields);
    const childMap = {};
    allChildren.forEach(c => childMap[c.id] = c);
    const rows = todayRecords.map(r => {
        const c = childMap[r.childId] || {};
        return [dateStr, c.grade || "", c.className || "", c.name || "不明", translateStatus(r.status), r.arrivalTime || "", r.departureTime || "", calculateExtension(r), r.snackConfig?.isExempt ? "無" : "有", formatMemoField(r, c, today)];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
    console.log("Daily report synced.");
}

function ensureSheet(ss, name, header, defaultRows) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); if (header) sheet.getRange(1, 1, 1, header[0].length).setValues(header); if (defaultRows && defaultRows.length > 0) { sheet.getRange(2, 1, defaultRows.length, defaultRows[0].length).setValues(defaultRows); } }
    return sheet;
}

function formatMemoField(r, c, dateObj) {
    const parts = [];
    const dateShort = Utilities.formatDate(dateObj, "Asia/Tokyo", "M月d日");
    if (r.memo) parts.push(`(備考) ${r.memo}`);
    if (r.staffMemo) parts.push(`(${dateShort} ${c.name || ""}) ${r.staffMemo}`);
    let messages = [];
    if (r.messages && r.messages.values && Array.isArray(r.messages.values)) { messages = r.messages.values.map(v => v.mapValue.fields); } else if (r.messages && Array.isArray(r.messages)) { messages = r.messages; }
    if (messages.length > 0) { messages.forEach(m => { const content = m.content || ""; const sender = m.sender || ""; const senderName = m.senderName || "ユーザー"; const context = sender === "guardian" ? `${senderName}→スタッフ` : `スタッフ→${c.guardianName || "保護者"}`; parts.push(`(${dateShort} ${c.name || ""} ${context}) ${content}`); }); }
    return parts.join("\n");
}

function translateStatus(s) { if (s === "arrived") return "出席"; if (s === "left") return "帰宅"; if (s === "absent") return "欠席"; return "予定"; }
function calculateExtension(r) { if (r.departureTime > "18:00") return "あり"; return ""; }

function setupTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) { if (trigger.getHandlerFunction() === 'syncAllData') { ScriptApp.deleteTrigger(trigger); } }
    ScriptApp.newTrigger('syncAllData').timeBased().atHour(8).nearMinute(30).everyDays(1).create();
    ScriptApp.newTrigger('syncAllData').timeBased().atHour(18).nearMinute(30).everyDays(1).create();
}

function importNewMembers(ss) {
    if (!ss || !ss.getSheetByName) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Import");
    if (!sheet) { sheet = ss.insertSheet("Import"); sheet.getRange(1, 1, 1, 9).setValues([["児童姓", "児童名", "児童姓カナ", "児童名カナ", "学年", "クラス", "保護者名", "連絡先メール", "ステータス"]]); sheet.getRange(2, 1, 1, 9).setValues([["山田", "太郎", "ヤマダ", "タロウ", "1", "1-1", "山田 花子", "user@example.com", ""]]); console.log("Created Import sheet."); return; }
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idx = { lName: headers.indexOf("児童姓"), fName: headers.indexOf("児童名"), lNameKana: headers.indexOf("児童姓カナ"), fNameKana: headers.indexOf("児童名カナ"), grade: headers.indexOf("学年"), className: headers.indexOf("クラス"), gName: headers.indexOf("保護者名"), email: headers.indexOf("連絡先メール"), status: headers.indexOf("ステータス") };
    if (idx.email === -1) { console.error("Import sheet format invalid."); return; }
    const updates = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idx.status] === "完了") continue;
        if (!row[idx.email] || !row[idx.lName]) continue;
        const timestamp = new Date().getTime().toString().substring(8);
        const docId = `child_${timestamp}_${Math.floor(Math.random() * 1000)}`;
        const childData = { id: docId, name: `${row[idx.lName]} ${row[idx.fName]}`, kana: `${row[idx.lNameKana]} ${row[idx.fNameKana]}`, grade: Number(row[idx.grade]), className: row[idx.className], guardianName: row[idx.gName], authorizedEmails: [row[idx.email]], createdAt: new Date().toISOString() };
        try { firestore.createDocument("children", childData); updates.push({ row: i + 1, col: idx.status + 1, val: "完了" }); } catch (e) { console.error("Failed to import row " + i, e); updates.push({ row: i + 1, col: idx.status + 1, val: "エラー: " + e.message }); }
    }
    updates.forEach(u => { sheet.getRange(u.row, u.col).setValue(u.val); });
    if (updates.length > 1) { console.log(`Imported ${updates.length} members.`); syncMembers(ss); }
}

function setupImportTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => { if (t.getHandlerFunction() === "importNewMembers") { ScriptApp.deleteTrigger(t); } });
    ScriptApp.newTrigger("importNewMembers").timeBased().everyHours(1).create();
    console.log("Import Trigger Set up.");
}
