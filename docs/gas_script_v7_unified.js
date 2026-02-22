/**
 * gas_script_v7_unified.js
 * Ver 7.2.3: Definitive Consolidated Version
 * 
 * [重要] このコード「だけ」をエディタに貼り付けてください。
 * 全てを選択(Ctrl+A)して削除(Delete)した後、これを貼り付けることで、
 * 古いバージョン（6.0, 7.1など）のメニューを完全に消去できます。
 */

// ========== Configuration ==========
const FIREBASE_CONFIG = {
    email: "firebase-adminsdk-fbsvc@kirakira-app-cc454.iam.gserviceaccount.com",
    key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCkkn2OXEMaAyKn\nCWHa00iJG7IxbqMLRhecorxqNt6EgLshgpmZ8Iwbr6uv93EAAXAujTfmG0lDYu/u\nr1YyHj7EM/xv97k4bHY4MC3XrGsOkBrMwSKaBntemmU40cZJNWkuazGLN7LMmlvk\n8faRPZ0bheaVfw5VuGIRNH1OmUakx/rWqicjjIgoUXlJ00iyzEstZVhKmk5FDqFk\n2RA8/wRbjknrpXdk2g5hrU7Yfjak3kEAIB4QHVdW8iOn2nWwrib3JOdMcz5ljmVo\nAgOcKwQB7CPXOomOvqNHm6qoN0fkccfnZ2XwfqGKNtsCAcWAvga6IYPv6yRx4dnh\nAtbMOp8lAgMBAAECggEAFbGVyXFSCxjEtZ4f/xeA5Un4WFnMNk08CZLOIXYwKOlL\nQaSUmN1DqtaiXCTTCXwnDIvjBXstUiu1kxIb26lu/rAXo67VBKIPh2KaeGarChVm\n4vzGkeUu2A6kLzQ/3iCjR9Irir2B3USvvmNC7GxhzGH/Pk+sVRJkIv53UigUTt4z\niXoWGB3SUUv8P65lXhrXNDyLoHtQdIDISgH3si7ViM2VS2pg7IrMjnRjVM0SYjTP\nkDqJ6pf1n/D4hT2aM21AfsVi3SwrKevBkCglXJ6lBQly6rEVWwhxkOyMzO4EwWOU\n3RGS8eyLQ37qEl5jN1M1MhVZuVOEU+KMnkKWnKEIoQKBgQDSyJXv9M7Bc3rOKKQO\niLsx5Gd3bDoFOOAlp7ioBk7NfGniHJYcsn6B6TP0jav7VwNfjWSeu2t4cI5qRPH2\nc/i75JPaDJtVKMivBTwURum3m/koCc1+41r7cpLMeQlLOQ46XBrVpULiAuWp1mjY\heKovKpLOX9AvdVP3taMP9y83QKBgQDH4Cis0d+xdLu3QmnmMvNWiMySsiK9Rhtv\nehbI/aEFXZU+y/VL+K9gse8mhIjTOX3HyOb+kj8Q1aiqpwfss2fAl8VOP211jBo2\nKonLRstAQhRK44/UWUCcj4qrOxj08+uuALE6DAL3NTpyWsoKPHtIBfvdZKCHLU+k\nn+dWwC0C6QKBgQDRtzre3K5dcP0NYwgfYdEGCd8bxbVQfs8dB+vEWUpMTm22x4Rf\nFwShUpobxl0HnAJCLpafC5AY67v2ZZRsBeTDZN/qAcMGjqZk5ItrDUb6JJhYSrCH\nf8OFC/CcugwSKLlMPVmBmYSbBBDm0unMDCGAiv3QDGvcyUMTzX2fWubPjQKBgQCy\n4j3FHjiTu6PdSgU5T1RVmC1vBRruRvZ6+Mu3qrcX9D+EaknpanKbmeQtluRWFtgp\nm/aQ1Ba5XF+OC9udzpsG1U5yz3WJhJBY9g1I7t0tb3Z15+Br7k1TUWyL/2JAqKW/\nn0L+bo2g7fSXMAYuzx6OwTw/UrYRBU6IScxj6a7fMQKBgDgAub8o2HS+pLjVjk7u\nFobWcYtGEfRYtVhf0Qvnjkrp4gOx478sY+kvjpLn3Dqw27L4ZhQtUC8YlZYSrbxK\nA3wfdNBycdv9HxkwQ+fyZF9QRlIsmT24zvlwvzo+KaoD+lThnkoWs6uR27OUdIvx\ni3i8INknKImyzd3I9wgSK6yS\n-----END PRIVATE KEY-----\n`,
    projectId: "kirakira-app-cc454"
};

const SPREADSHEET_ID = "1fOUHIRKU39MFYW1iX5ZgNUQt3fyLHwDuOMF7B6-Xess";

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
