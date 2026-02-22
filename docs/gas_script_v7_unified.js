/**
 * gas_script_v7_unified.js
 * Ver 7.2.3: Definitive Consolidated Version
 * 
 * [重要] このコード「だけ」をエディタに貼り付けてください。
 * 全てを選択(Ctrl+A)して削除(Delete)した後、これを貼り付けることで、
 * 古いバージョン（6.0, 7.1など）のメニューを完全に消去できます。
 */

// ========== Configuration ==========
// [重要] 以下の値はGoogle Apps Scriptのエディタに直接入力してください。
// GitHubにはコミットしないでください。
const FIREBASE_CONFIG = {
    email: "YOUR_SERVICE_ACCOUNT_EMAIL@PROJECT_ID.iam.gserviceaccount.com",
    key: `-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n`,
    projectId: "YOUR_FIREBASE_PROJECT_ID"
};

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";

const SHEETS = {
    DAILY: "DailyReport",
    MEMBERS: "Members",
    PARENTS: "Master_Parents",
    SETTINGS: "Settings",
    STAFF: "Staff",
    IMPORT: "Import"
};

// Initialize Firestore
const firestore = FirestoreApp.getFirestore(FIREBASE_CONFIG.email, FIREBASE_CONFIG.key, FIREBASE_CONFIG.projectId);

// ==========================================
// 🌟 唯一のメニュー作成 (onOpen)
// ==========================================
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('🌟 KiraKira Ver 7.2')
        .addSubMenu(SpreadsheetApp.getUi().createMenu('📊 データ同期')
            .addItem('全データを同期', 'syncAllData')
            .addItem('職員データを同期', 'syncStaffOnly'))
        .addSubMenu(SpreadsheetApp.getUi().createMenu('📥 インポート')
            .addItem('新規メンバーをインポート', 'importNewMembers'))
        .addItem('ℹ️ バージョン情報', 'showVersion')
        .addToUi();
}

/**
 * 以前のバージョン情報を表示します。
 */
function showVersion() {
    Browser.msgBox(
        "🌟 KiraKira Ver 7.2.3\n\n" +
        "最新の統合スクリプトです。\n" +
        "- 職員リストの列位置（名前/メール）を自動判別\n" +
        "- 旧メニューの重複解消済み\n\n" +
        "これ以外のメニュー（Ver 6.0等）が表示される場合は、ページをリロードしてください。"
    );
}

// ==========================================
// Core Sync Logic
// ==========================================

function syncAllData() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    syncParents(ss);
    syncMembers(ss);
    syncSettings(ss);
    syncStaff(ss);
    Browser.msgBox("✅ すべてのデータを同期しました。");
}

function syncStaffOnly() {
    syncStaff(SpreadsheetApp.openById(SPREADSHEET_ID));
    Browser.msgBox("✅ 職員データを同期しました。");
}

// 職員同期 (A列名前・B列メールでも自動判定)
function syncStaff(ss) {
    let sheet = ensureSheet(ss, SHEETS.STAFF, [["Name", "Email", "Role", "IsActive", "HourlyRate", "TransportationFee"]]);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const colA = String(row[0] || "").trim();
        const colB = String(row[1] || "").trim();

        let name = "", email = "";
        // @が含まれる方をメールとして認識する（柔軟な対応）
        if (colA.indexOf("@") !== -1) { email = colA; name = colB; }
        else if (colB.indexOf("@") !== -1) { email = colB; name = colA; }
        else continue;

        email = email.toLowerCase();
        const docId = email.replace(/[.#$[\]]/g, "_");

        upsertDocument(`staff_users/${docId}`, {
            id: docId,
            email: email,
            name: name,
            role: row[2] || "staff",
            isActive: (row[3] === true || row[3] === "TRUE" || row[3] === 1),
            updatedAt: new Date().toISOString()
        });
    }
}

// --- 他の同期関数 ---
function syncParents(ss) {
    let sheet = ensureSheet(ss, SHEETS.PARENTS, [["Email", "Name", "ChildIDs"]]);
    const rows = sheet.getDataRange().getValues().slice(1);
    rows.forEach(row => {
        if (!row[0]) return;
        const email = String(row[0]).trim();
        const docId = email.replace(/[.#$[\]]/g, "_");
        upsertDocument(`parents/${docId}`, {
            email: email,
            name: String(row[1] || "").trim(),
            childIds: String(row[2] || "").split(",").map(id => id.trim()).filter(id => id),
            updatedAt: new Date().toISOString()
        });
    });
}

function syncMembers(ss) {
    let sheet = ensureSheet(ss, SHEETS.MEMBERS, [["ID", "学年", "クラス", "氏名", "フリガナ", "ParentIDs", "アレルギー", "備考"]]);
    const allDocs = firestore.getDocuments("children");
    const rows = (allDocs || []).map(doc => {
        const f = doc.fields;
        return [getValue(f.id), getValue(f.grade), getValue(f.className), getValue(f.name), getValue(f.kana),
        Array.isArray(getValue(f.parentIds)) ? getValue(f.parentIds).join(",") : "",
        getValue(f.allergies), getValue(f.notes)];
    });
    writeSheetData(sheet, rows);
}

function syncSettings(ss) {
    let sheet = ensureSheet(ss, SHEETS.SETTINGS, [["Key", "Value"]]);
    const data = sheet.getDataRange().getValues();
    const settings = { id: "current", fees: { basePrice: 0, snackPrice: 0, extendedPrice: 0 }, updatedAt: new Date().toISOString() };
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === "basePrice") settings.fees.basePrice = Number(data[i][1]);
        if (data[i][0] === "snackPrice") settings.fees.snackPrice = Number(data[i][1]);
        if (data[i][0] === "extendedPrice") settings.fees.extendedPrice = Number(data[i][1]);
    }
    upsertDocument("system_settings/current", settings);
}

// ========== Helpers ==========
function ensureSheet(ss, name, header) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); if (header) sheet.getRange(1, 1, 1, header[0].length).setValues(header); }
    return sheet;
}
function writeSheetData(sheet, rows) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    if (rows.length > 0) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}
function getValue(field) {
    if (!field) return "";
    return field.stringValue !== undefined ? field.stringValue : (field.integerValue !== undefined ? field.integerValue : (field.arrayValue ? field.arrayValue.values.map(v => getValue(v)) : ""));
}
function upsertDocument(path, data) {
    try { firestore.createDocument(path, data); } catch (e) { try { firestore.updateDocument(path, data); } catch (e2) { } }
}

// 簡易インポート
function importNewMembers() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEETS.IMPORT);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idx = { email: headers.indexOf("連絡先メール"), lName: headers.indexOf("児童姓"), status: headers.indexOf("ステータス") };
    for (let i = 1; i < data.length; i++) {
        if (data[i][idx.status] === "完了" || !data[i][idx.email]) continue;
        try {
            firestore.createDocument("children", { id: "child_" + Date.now(), name: data[i][headers.indexOf("児童姓")] + " " + data[i][headers.indexOf("児童名")], parentIds: [data[i][idx.email]], createdAt: new Date().toISOString() });
            sheet.getRange(i + 1, idx.status + 1).setValue("完了");
        } catch (e) { }
    }
}
