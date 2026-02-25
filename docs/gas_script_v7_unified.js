/**
 * gas_script_v7_unified.js
    * Ver 7.3.1: Accounting & Privacy Update (Bug fix)
        * 
 * [重要] このコード「だけ」をエディタに貼り付けてください。
 * 児童の個人情報保護（電話番号削除）と会計用データ出力を追加。
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
    IMPORT: "Import",
    ACCOUNTING: "Accounting_Archive"
};

// Initialize Firestore
const firestore = FirestoreApp.getFirestore(FIREBASE_CONFIG.email, FIREBASE_CONFIG.key, FIREBASE_CONFIG.projectId);

// ==========================================
// 🌟 唯一のメニュー作成 (onOpen)
// ==========================================
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('🌟 KiraKira Ver 7.3.1')
        .addSubMenu(SpreadsheetApp.getUi().createMenu('📊 データ同期')
            .addItem('全データを同期', 'syncAllData')
            .addItem('職員データを同期', 'syncStaffOnly')
            .addItem('会計用データを出力', 'syncAttendanceToAccounting'))
        .addSubMenu(SpreadsheetApp.getUi().createMenu('📥 インポート')
            .addItem('新規メンバーをインポート', 'importNewMembers'))
        .addItem('🔄 Membersシートから児童データを復元', 'restoreFromMembers')
        .addItem('ℹ️ バージョン情報', 'showVersion')
        .addToUi();
}

/**
 * 以前のバージョン情報を表示します。
 */
function showVersion() {
    Browser.msgBox(
        "🌟 KiraKira Ver 7.3.1\n\n" +
        "2026-02-24 アップデート:\n" +
        "- 会計用データ出力（Accounting_Archive）機能追加\n" +
        "- 児童の電話番号管理を削除（プライバシー保護）\n" +
        "- 欠席時の料金0円判定をサポート\n\n" +
        "スプレッドシートのメニューが表示されない場合は、ページをリロードしてください。"
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
    syncAttendanceToAccounting();
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
    let sheet = ensureSheet(ss, SHEETS.MEMBERS, [["ID", "学年", "氏名", "フリガナ", "ParentIDs", "備考"]]);
    const allDocs = firestore.getDocuments("children");
    const rows = (allDocs || []).map(doc => {
        const f = doc.fields;
        return [getValue(f.id), getValue(f.grade), getValue(f.name), getValue(f.kana),
        Array.isArray(getValue(f.parentIds)) ? getValue(f.parentIds).join(",") : "",
        getValue(f.notes)];
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
    if (field.stringValue !== undefined) return field.stringValue;
    if (field.integerValue !== undefined) return field.integerValue;
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.arrayValue) {
        return (field.arrayValue.values || []).map(v => getValue(v));
    }
    return "";
}
function upsertDocument(path, data) {
    try { firestore.createDocument(path, data); } catch (e) { try { firestore.updateDocument(path, data); } catch (e2) { } }
}

/**
 * 📊 出席データを会計用にスプレッドシートへ出力
 */
function syncAttendanceToAccounting() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const header = [["日付", "児童ID", "氏名", "学年", "状態", "おやつ", "算定料金", "予約時間", "入室", "退室", "同期日時"]];
    let sheet = ensureSheet(ss, SHEETS.ACCOUNTING, header);

    const allDocs = firestore.getDocuments("attendance");
    if (!allDocs || allDocs.length === 0) return;

    const timestamp = new Date().toLocaleString("ja-JP");
    const rows = allDocs.map(doc => {
        const f = doc.fields;
        const status = getValue(f.status);
        const hasSnack = getValue(f.hasSnack) === true || getValue(f.hasSnack) === "true";

        // 欠席なら0円、そうでなければおやつ代100円（おやつありの場合）
        let fee = 0;
        if (status !== "absent" && hasSnack) {
            fee = 100;
        }

        return [
            getValue(f.date),
            getValue(f.childId),
            getValue(f.childName),
            getValue(f.className),
            status,
            hasSnack ? "あり" : "なし",
            fee,
            getValue(f.reservationTime),
            getValue(f.arrivalTime),
            getValue(f.departureTime),
            timestamp
        ];
    });

    // 日付順にソート
    rows.sort((a, b) => (a[0] > b[0] ? 1 : -1));
    writeSheetData(sheet, rows);
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

/**
 * 🔄 Membersシートから児童データをFirestoreに復元する
 * Membersシートのフォーマット: ID, 学年, 氏名, フリガナ, ParentIDs, 電話番号, 備考
 */
function restoreFromMembers() {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
        '児童データの復元',
        'Membersシートのデータを使ってFirestoreのchildrenコレクションを復元します。\n続行しますか？',
        ui.ButtonSet.YES_NO
    );
    if (result !== ui.Button.YES) return;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.MEMBERS);
    if (!sheet) {
        ui.alert('エラー', 'Membersシートが見つかりません。', ui.ButtonSet.OK);
        return;
    }

    const data = sheet.getDataRange().getValues();
    // ヘッダー行（1行目）をスキップ
    // フォーマット: [0]ID, [1]学年, [2]氏名, [3]フリガナ, [4]ParentIDs, [5]備考
    let restored = 0;
    let skipped = 0;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const id = String(row[0] || "").trim();
        const name = String(row[2] || "").trim();

        // IDも名前もない行はスキップ
        if (!id && !name) {
            skipped++;
            continue;
        }

        const docId = id || ("child_" + Date.now() + "_" + i);
        const gradeRaw = String(row[1]).replace(/[年生]/g, "").trim();

        const childData = {
            id: docId,
            name: name,
            kana: String(row[3] || "").trim(),
            grade: Number(gradeRaw) || 1,
            parentIds: String(row[4] || "").split(",").map(s => s.trim()).filter(s => s),
            defaultReturnMethod: "お迎え",
            createdAt: new Date().toISOString()
        };

        try {
            upsertDocument("children/" + docId, childData);
            restored++;
        } catch (e) {
            Logger.log("Error restoring " + docId + ": " + e.message);
            skipped++;
        }
    }

    ui.alert(
        '復元完了',
        '復元: ' + restored + '件\nスキップ: ' + skipped + '件',
        ui.ButtonSet.OK
    );
}
