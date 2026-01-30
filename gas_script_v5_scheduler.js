/**
 * gas_script_v5_scheduler.js
 * Ver 3.2: 児童・保護者連携 & メッセージ対応版
 * 
 * 機能:
 * 1. DailyReportシート: その日の出席データを追記 (毎日蓄積)
 * 2. Membersシート: 最新の児童マスタ情報を全書き換え (スナップショット)
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

const firestore = FirestoreApp.getFirestore(FIREBASE_CONFIG.email, FIREBASE_CONFIG.key, FIREBASE_CONFIG.projectId);

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

/**
 * 児童マスタの同期 (全洗い替え)
 * ヘッダー: ID, 学年, クラス, 氏名, フリガナ, 許可メール, 保護者名, 電話番号
 */
function syncMembers(ss) {
    let sheet = ss.getSheetByName(SHEET_NAME_MEMBERS);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_MEMBERS);
        // ヘッダー作成
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
        (c.phoneNumbers || []).join(",") // 電話番号もカンマ区切りで
    ]);

    // クリアして書き込み
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
    }

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 8).setValues(rows);
    }
}

/**
 * 日報の同期 (当日分の追記)
 * ヘッダー: 日付, 学年, クラス, 氏名, 出欠, 入室, 退室, 延長, おやつ, メモ
 */
function syncDailyReport(ss) {
    let sheet = ss.getSheetByName(SHEET_NAME_DAILY);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_DAILY);
        // ヘッダー作成
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
            formatMemoField(r, c, today) // 新しいメモ整形関数
        ];
    });

    // 最下行に追記
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
}

// --- ヘルパー関数 ---

/**
 * メモ欄の整形
 * (日付 児童名) スタッフメモ
 * (日付 児童名 保護者→スタッフ) メッセージ
 */
function formatMemoField(r, c, dateObj) {
    const parts = [];
    const dateShort = Utilities.formatDate(dateObj, "Asia/Tokyo", "M月d日");

    // 1. 旧メモ (備考)
    if (r.memo) {
        parts.push(`(備考) ${r.memo}`);
    }

    // 2. スタッフ用メモ
    if (r.staffMemo) {
        parts.push(`(${dateShort} ${c.name || ""}) ${r.staffMemo}`);
    }

    // 3. メッセージログ
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

            let context = "";
            if (sender === "guardian") {
                context = `${senderName}→スタッフ`;
            } else {
                context = `スタッフ→${c.guardianName || "保護者"}`;
            }
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
    triggers.forEach(t => ScriptApp.deleteTrigger(t)); // 既存のトリガーをリセット

    ScriptApp.newTrigger("syncToSheets").timeBased().atHour(8).nearMinute(30).everyDays(1).create();
    ScriptApp.newTrigger("syncToSheets").timeBased().atHour(18).nearMinute(30).everyDays(1).create();
}
