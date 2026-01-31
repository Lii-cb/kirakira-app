/**
 * gas_script_v5_scheduler.js
 * Ver 3.5: 児童・保護者連携 & メッセージ・設定管理対応 & 入会取り込み版
 * 
 * 機能:
 * 1. DailyReportシート: その日の出席データを追記 (毎日蓄積)
 * 2. Membersシート: 最新の児童マスタ情報を全書き換え (スナップショット)
 * 3. Settingsシート, Staffシート: アプリ設定のマスタ管理
 * 4. Importシート: 新規入会者の取り込み (New)
 * 
 * ライブラリID: "1VUSl4b1r1eoNcRWotZKkgeOMMXsJur4xmW_JeapV7iqqI3qTCX3UUVC7"
 */

// --- 設定エリア ---
const FIREBASE_CONFIG = {
    email: "firebase-adminsdk-fbsvc@kirakira-app-cc454.iam.gserviceaccount.com", // サービスアカウントのメールアドレス
    key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCkkn2OXEMaAyKn\nCWHa00iJG7IxbqMLRhecorxqNt6EgLshgpmZ8Iwbr6uv93EAAXAujTfmG0lDYu/u\nr1YyHj7EM/xv97k4bHY4MC3XrGsOkBrMwSKaBntemmU40cZJNWkuazGLN7LMmlvk\n8faRPZ0bheaVfw5VuGIRNH1OmUakx/rWqicjjIgoUXlJ00iyzEstZVhKmk5FDqFk\n2RA8/wRbjknrpXdk2g5hrU7Yfjak3kEAIB4QHVdW8iOn2nWwrib3JOdMcz5ljmVo\nAgOcKwQB7CPXOomOvqNHm6qoN0fkccfnZ2XwfqGKNtsCAcWAvga6IYPv6yRx4dnh\nAtbMOp8lAgMBAAECggEAFbGVyXFSCxjEtZ4f/xeA5Un4WFnMNk08CZLOIXYwKOlL\nQaSUmN1DqtaiXCTTCXwnDIvjBXstUiu1kxIb26lu/rAXo67VBKIPh2KaeGarChVm\n4vzGkeUu2A6kLzQ/3iCjR9Irir2B3USvvmNC7GxhzGH/Pk+sVRJkIv53UigUTt4z\niXoWGB3SUUv8P65lXhrXNDyLoHtQdIDISgH3si7ViM2VS2pg7IrMjnRjVM0SYjTP\nkDqJ6pf1n/D4hT2aM21AfsVi3SwrKevBkCglXJ6lBQly6rEVWwhxkOyMzO4EwWOU\n3RGS8eyLQ37qEl5jN1M1MhVZuVOEU+KMnkKWnKEIoQKBgQDSyJXv9M7Bc3rOKKQO\niLsx5Gd3bDoFOOAlp7ioBk7NfGniHJYcsn6B6TP0jav7VwNfjWSeu2t4cI5qRPH2\nc/i75JPaDJtVKMivBTwURum3m/koCc1+41r7cpLMeQlLOQ46XBrVpULiAuWp1mjY\nheKovKpLOX9AvdVP3taMP9y83QKBgQDH4Cis0d+xdLu3QmnmMvNWiMySsiK9Rhtv\nehbI/aEFXZU+y/VL+K9gse8mhIjTOX3HyOb+kj8Q1aiqpwfss2fAl8VOP211jBo2\nKonLRstAQhRK44/UWUCcj4qrOxj08+uuALE6DAL3NTpyWsoKPHtIBfvdZKCHLU+k\nn+dWwC0C6QKBgQDRtzre3K5dcP0NYwgfYdEGCd8bxbVQfs8dB+vEWUpMTm22x4Rf\nFwShUpobxl0HnAJCLpafC5AY67v2ZZRsBeTDZN/qAcMGjqZk5ItrDUb6JJhYSrCH\nf8OFC/CcugwSKLlMPVmBmYSbBBDm0unMDCGAiv3QDGvcyUMTzX2fWubPjQKBgQCy\n4j3FHjiTu6PdSgU5T1RVmC1vBRruRvZ6+Mu3qrcX9D+EaknpanKbmeQtluRWFtgp\nm/aQ1Ba5XF+OC9udzpsG1U5yz3WJhJBY9g1I7t0tb3Z15+Br7k1TUWyL/2JAqKW/\nn0L+bo2g7fSXMAYuzx6OwTw/UrYRBU6IScxj6a7fMQKBgDgAub8o2HS+pLjVjk7u\nFobWcYtGEfRYtVhf0Qvnjkrp4gOx478sY+kvjpLn3Dqw27L4ZhQtUC8YlZYSrbxK\nA3wfdNBycdv9HxkwQ+fyZF9QRlIsmT24zvlwvzo+KaoD+lThnkoWs6uR27OUdIvx\ni3i8INknKImyzd3I9wgSK6yS\n-----END PRIVATE KEY-----\n`, // 秘密鍵
    projectId: "kirakira-app-cc454"
};

// ★ここを毎年変更してください★
const SPREADSHEET_ID = "1fOUHIRKU39MFYW1iX5ZgNUQt3fyLHwDuOMF7B6-Xess"; // スプレッドシートID

const SHEET_NAME_DAILY = "DailyReport";       // 日報用シート名
const SHEET_NAME_MEMBERS = "Members";         // 児童マスタ用シート名
const SHEET_NAME_SETTINGS = "Settings";       // 設定用シート名
const SHEET_NAME_STAFF = "Staff";             // スタッフ管理用シート名

const firestore = FirestoreApp.getFirestore(FIREBASE_CONFIG.email, FIREBASE_CONFIG.key, FIREBASE_CONFIG.projectId);

// ==========================================
// Main Entry Points (Triggers & Manual Runs)
// ==========================================

/**
 * 初期セットアップ用 (Ver 3.3)
 * Settings, Staffシートを作成し、初期データを同期します。
 * 初回導入時に手動実行してください。
 */
function setupV5() {
    console.log("Starting Setup V5...");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // シートが無ければ作成
    ensureSheet(ss, SHEET_NAME_SETTINGS, [["Key", "Value"]], [
        ["fee_base_price", "3000"],
        ["fee_snack_price", "100"],
        ["fee_extended_price", "100"]
    ]);

    ensureSheet(ss, SHEET_NAME_STAFF, [["Name", "Email", "Role", "Active"]], [
        ["管理者", "admin@example.com", "admin", "TRUE"]
    ]);

    // 初回同期
    syncConfigToFirestore();
    console.log("Setup V5 Completed.");
}

/**
 * 設定・スタッフ情報の同期 (アプリへの反映)
 * 手動実行 または 必要に応じてトリガー設定
 */
function syncConfigToFirestore() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    syncSettings(ss);
    syncStaff(ss);
}

/**
 * メイン連携関数
 * 毎日 8:30, 18:30 にトリガー実行されます
 */
function syncToSheets() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    // 1. 児童マスタの同期 (全洗い替え)
    syncMembers(ss);
    // 2. 日報の同期 (当日分の追記)
    syncDailyReport(ss);
}

// ==========================================
// Individual Sync Functions
// ==========================================

/**
 * 設定シート -> Firestore (system_settings)
 */
function syncSettings(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // シート確認・作成
    let sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
    if (!sheet) {
        console.warn("Settings sheet not found during sync. Creating...");
        setupV5(); // Re-run setup if missing
        sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
    }

    const data = sheet.getDataRange().getValues();
    // Default Settings Object
    const settings = {
        id: "current",
        fees: {
            basePrice: 0,
            snackPrice: 0,
            extendedPrice: 0
        },
        updatedAt: new Date().toISOString()
    };

    // ヘッダーをスキップ（インデックス1から開始）
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

/**
 * スタッフシート -> Firestore (staff_users)
 */
function syncStaff(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let sheet = ss.getSheetByName(SHEET_NAME_STAFF);
    if (!sheet) {
        console.warn("Staff sheet not found during sync. Creating...");
        setupV5();
        sheet = ss.getSheetByName(SHEET_NAME_STAFF);
    }

    const data = sheet.getDataRange().getValues();

    // ヘッダーをスキップ
    for (let i = 1; i < data.length; i++) {
        const name = data[i][0];
        const email = data[i][1];
        const role = data[i][2] || "staff";
        const active = data[i][3];

        if (!email) continue;

        // メールアドレスをIDとして使用（ドキュメントIDとして安全な形式に変換）
        const docId = email.replace(/[.#$[\]]/g, "_");

        const staffDoc = {
            id: docId,
            email: email,
            name: name,
            role: role,
            isActive: active === true || active === "TRUE" || active === 1,
            updatedAt: new Date().toISOString()
        };

        upsertDocument(`staff_users/${docId}`, staffDoc);
    }
    console.log("Staff synced.");
}

/**
 * ヘルパー: 新規作成、存在すれば更新 (Upsert)
 */
function upsertDocument(path, data) {
    try {
        firestore.createDocument(path, data);
    } catch (e) {
        // "Document already exists" エラーなどが出た場合は Update を試みる
        try {
            firestore.updateDocument(path, data);
        } catch (e2) {
            console.error(`Failed to upsert (create & update both failed): ${path}`, e2);
            throw e2;
        }
    }
}

/**
 * 児童マスタの同期 (全洗い替え)
 */
function syncMembers(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let sheet = ss.getSheetByName(SHEET_NAME_MEMBERS);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_MEMBERS);
        sheet.getRange(1, 1, 1, 8).setValues([["ID", "学年", "クラス", "氏名", "フリガナ", "許可メール", "保護者名", "電話番号"]]);
    }

    const allChildren = firestore.getDocuments("children").map(doc => doc.fields);

    // 並び替え: 学年順 -> クラス順
    allChildren.sort((a, b) => {
        if ((a.grade || 0) !== (b.grade || 0)) return (a.grade || 0) - (b.grade || 0);
        return (a.className || "").localeCompare(b.className || "");
    });

    const rows = allChildren.map(c => [
        c.id,
        c.grade,
        c.className || "",
        c.name,
        c.kana || "",
        (c.authorizedEmails || []).join(","),
        c.guardianName || "",
        (c.phoneNumbers || []).join(",")
    ]);

    // クリアして書き込み
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
    }

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 8).setValues(rows);
    }
    console.log("Members synced.");
}

/**
 * 日報の同期 (当日分の追記)
 */
function syncDailyReport(ss) {
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let sheet = ss.getSheetByName(SHEET_NAME_DAILY);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_DAILY);
        sheet.getRange(1, 1, 1, 10).setValues([["日付", "学年", "クラス", "氏名", "出欠", "入室", "退室", "延長", "おやつ", "メモ"]]);
    }

    const today = new Date();
    const dateStr = Utilities.formatDate(today, "Asia/Tokyo", "yyyy-MM-dd");

    // 出席データの取得
    const allAttendance = firestore.getDocuments("attendance").map(doc => doc.fields);
    const todayRecords = allAttendance.filter(r => r.date === dateStr);

    if (todayRecords.length === 0) return;

    // 児童情報の紐付け用マップ作成
    const allChildren = firestore.getDocuments("children").map(doc => doc.fields);
    const childMap = {};
    allChildren.forEach(c => childMap[c.id] = c);

    // 行データの準備
    const rows = todayRecords.map(r => {
        const c = childMap[r.childId] || {};
        return [
            dateStr,
            c.grade || "",
            c.className || "",
            c.name || "不明",
            translateStatus(r.status),
            r.arrivalTime || "",
            r.departureTime || "",
            calculateExtension(r),
            r.snackConfig?.isExempt ? "無" : "有",
            formatMemoField(r, c, today)
        ];
    });

    // 最下行に追記
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
    console.log("Daily report synced.");
}

// ==========================================
// Helpers
// ==========================================

function ensureSheet(ss, name, header, defaultRows) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        if (header) sheet.getRange(1, 1, 1, header[0].length).setValues(header);
        if (defaultRows && defaultRows.length > 0) {
            sheet.getRange(2, 1, defaultRows.length, defaultRows[0].length).setValues(defaultRows);
        }
    }
    return sheet;
}

function formatMemoField(r, c, dateObj) {
    const parts = [];
    const dateShort = Utilities.formatDate(dateObj, "Asia/Tokyo", "M月d日");

    if (r.memo) parts.push(`(備考) ${r.memo}`);
    if (r.staffMemo) parts.push(`(${dateShort} ${c.name || ""}) ${r.staffMemo}`);

    let messages = [];
    if (r.messages && r.messages.values && Array.isArray(r.messages.values)) {
        messages = r.messages.values.map(v => v.mapValue.fields);
    } else if (r.messages && Array.isArray(r.messages)) {
        messages = r.messages;
    }

    if (messages.length > 0) {
        messages.forEach(m => {
            const content = m.content || "";
            const sender = m.sender || "";
            const senderName = m.senderName || "ユーザー";
            const context = sender === "guardian" ? `${senderName}→スタッフ` : `スタッフ→${c.guardianName || "保護者"}`;
            parts.push(`(${dateShort} ${c.name || ""} ${context}) ${content}`);
        });
    }

    return parts.join("\n");
}

function translateStatus(s) {
    if (s === "arrived") return "出席";
    if (s === "left") return "帰宅";
    if (s === "absent") return "欠席";
    return "予定";
}

function calculateExtension(r) {
    if (r.departureTime > "18:00") return "あり";
    return "";
}

/**
 * トリガー設定 (手動で1回実行)
 */
function setupTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => ScriptApp.deleteTrigger(t));

    ScriptApp.newTrigger("syncToSheets").timeBased().atHour(8).nearMinute(30).everyDays(1).create();
    ScriptApp.newTrigger("syncToSheets").timeBased().atHour(18).nearMinute(30).everyDays(1).create();
}

/**
 * 新入会取り込み (Ver 3.5)
 * Importシートに入力されたデータをFirestoreのchildrenコレクションに登録します。
 * 登録後、シートのステータス列を「完了」に更新します。
 */
function importNewMembers(ss) {
    if (!ss || !ss.getSheetByName) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let sheet = ss.getSheetByName("Import");
    if (!sheet) {
        // シートが無ければ作成し、ヘッダーとサンプルデータを設定
        sheet = ss.insertSheet("Import");
        sheet.getRange(1, 1, 1, 9).setValues([["児童姓", "児童名", "児童姓カナ", "児童名カナ", "学年", "クラス", "保護者名", "連絡先メール", "ステータス"]]);
        sheet.getRange(2, 1, 1, 9).setValues([["山田", "太郎", "ヤマダ", "タロウ", "1", "1-1", "山田 花子", "user@example.com", ""]]);
        console.log("Created Import sheet.");
        return; // 作成直後は処理しない（ユーザーが入力を完了していないため）
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // 列インデックスの特定
    const idx = {
        lName: headers.indexOf("児童姓"),
        fName: headers.indexOf("児童名"),
        lNameKana: headers.indexOf("児童姓カナ"),
        fNameKana: headers.indexOf("児童名カナ"),
        grade: headers.indexOf("学年"),
        className: headers.indexOf("クラス"),
        gName: headers.indexOf("保護者名"),
        email: headers.indexOf("連絡先メール"),
        status: headers.indexOf("ステータス")
    };

    if (idx.email === -1) {
        console.error("Import sheet format invalid.");
        return;
    }

    const updates = [];

    // 1行目（ヘッダー）はスキップ
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idx.status] === "完了") continue; // 処理済みはスキップ
        if (!row[idx.email] || !row[idx.lName]) continue; // 必須項目チェック

        // ID生成: メールアドレス_タイムスタンプ（重複防止）
        // メールアドレス自体をIDにすると、兄弟姉妹の登録で重複する可能性があるためタイムスタンプ付与
        const timestamp = new Date().getTime().toString().substring(8);
        const docId = `child_${timestamp}_${Math.floor(Math.random() * 1000)}`;

        const childData = {
            id: docId,
            name: `${row[idx.lName]} ${row[idx.fName]}`,
            kana: `${row[idx.lNameKana]} ${row[idx.fNameKana]}`,
            grade: Number(row[idx.grade]),
            className: row[idx.className],
            guardianName: row[idx.gName],
            authorizedEmails: [row[idx.email]], // ここでログイン権限を設定
            createdAt: new Date().toISOString()
        };

        try {
            firestore.createDocument("children", childData);
            // 更新成功したらステータスを更新
            updates.push({ row: i + 1, col: idx.status + 1, val: "完了" });
        } catch (e) {
            console.error("Failed to import row " + i, e);
            updates.push({ row: i + 1, col: idx.status + 1, val: "エラー: " + e.message });
        }
    }

    // ステータスを一括更新
    updates.forEach(u => {
        sheet.getRange(u.row, u.col).setValue(u.val);
    });

    if (updates.length > 0) {
        console.log(`Imported ${updates.length} members.`);
        // Membersシート（アプリ内マスタ）も更新しておく
        syncMembers(ss);
    }
}

/**
 * Importトリガーの設定 (手動実行)
 * 1時間ごとに実行して新規登録をチェックします
 */
function setupImportTrigger() {
    const triggers = ScriptApp.getProjectTriggers();

    // 重複削除
    triggers.forEach(t => {
        if (t.getHandlerFunction() === "importNewMembers") {
            ScriptApp.deleteTrigger(t);
        }
    });

    ScriptApp.newTrigger("importNewMembers")
        .timeBased()
        .everyHours(1)
        .create();

    console.log("Import Trigger Set up.");
}
