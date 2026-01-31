/**
 * gas_script_v5_scheduler.js
 * Ver 3.3: 児童・保護者連携 & メッセージ・設定管理対応版
 * 
 * 機能:
 * 1. DailyReportシート: その日の出席データを追記 (毎日蓄積)
 * 2. Membersシート: 最新の児童マスタ情報を全書き換え (スナップショット)
 * 3. Settingsシート, Staffシート: アプリ設定のマスタ管理
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
// (Can be run manually from menu)
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

    // Header skip (start from index 1)
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

    // Skip header
    for (let i = 1; i < data.length; i++) {
        const name = data[i][0];
        const email = data[i][1];
        const role = data[i][2] || "staff";
        const active = data[i][3];

        if (!email) continue;

        // Email as ID (Sanitized for safe doc ID)
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
 * Helper: Create if new, Update if exists (Robust Upsert)
 */
function upsertDocument(path, data) {
    try {
        firestore.createDocument(path, data);
    } catch (e) {
        // "Document already exists" エラーなどが出た場合は Update を試みる
        // エラーメッセージが "already exists" を含むかチェックしても良いが、
        // 念のため update をトライするほうが確実
        // console.log(`Document create failed (${e.message}), trying update: ${path}`);
        try {
            firestore.updateDocument(path, data);
        } catch (e2) {
            console.error(`Failed to upsert (create & update both failed): ${path}`, e2);
            throw e2; // 両方失敗なら致命的エラーとして投げる
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
 * 入会申請フォーム連携 (Ver 3.4)
 * フォームが送信されたときに実行されるトリガー関数
 */
function onFormSubmit(e) {
    console.log("Form Submitted", JSON.stringify(e));
    if (!e || !e.namedValues) {
        console.error("No event data found.");
        return;
    }

    const val = e.namedValues;

    // Helper to get value safely (handles array from namedValues)
    const getVal = (key) => {
        return val[key] ? val[key][0] : "";
    };

    // マッピング (form_setup_guide.md に基づく)
    const appData = {
        childLastName: getVal("児童氏名（姓）"),
        childFirstName: getVal("児童氏名（名）"),
        childLastNameKana: getVal("児童氏名（せい）"),
        childFirstNameKana: getVal("児童氏名（めい）"),
        grade: getVal("新学年"),
        guardianLastName: getVal("保護者氏名（姓）"),
        guardianFirstName: getVal("保護者氏名（名）"),
        phone: getVal("電話番号"),
        email: getVal("連絡先メールアドレス"),
        status: "new",
        submissionDate: new Date().toISOString()
    };

    // 必須チェック（簡易）
    if (!appData.childLastName || !appData.guardianLastName || !appData.email) {
        console.warn("Invalid form data: Missing required fields", appData);
        // エラーでもFirestoreに残す設計もアリだが、今回はSkip
        return;
    }

    // Firestoreに保存
    // IDは自動生成を使用
    firestore.createDocument("applications", appData);
    console.log("Application created in Firestore");
}

/**
 * フォームトリガーの設定 (手動実行)
 * 一度だけ実行してください。
 */
function setupFormTrigger() {
    const triggers = ScriptApp.getProjectTriggers();

    // 既存の onFormSubmit トリガーがあれば削除（重複防止）
    triggers.forEach(t => {
        if (t.getHandlerFunction() === "onFormSubmit") {
            ScriptApp.deleteTrigger(t);
        }
    });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        // Apps Scriptエディタから直接実行した場合、ActiveSpreadsheetが取れないことがあるため
        // ID指定で開くか、コンテナバインドされている前提
        ScriptApp.newTrigger("onFormSubmit")
            .forSpreadsheet(SpreadsheetApp.openById(SPREADSHEET_ID))
            .onFormSubmit()
            .create();
    } else {
        ScriptApp.newTrigger("onFormSubmit")
            .forSpreadsheet(ss)
            .onFormSubmit()
            .create();
    }

    console.log("Form Trigger Set up.");
}
