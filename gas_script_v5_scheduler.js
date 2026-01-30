/**
 * gas_script_v5_scheduler.js
 * Ver 3.1: 自動データ連携 (8:30 / 18:30)
 * 
 * 機能:
 * 1. DailyReportシート: その日の出席データを追記 (毎日蓄積)
 * 2. Membersシート: 最新の児童マスタ情報を全書き換え (スナップショット)
 * 
 * ライブラリID: "1VUSl4b1r1eoNcRWotZKkgeOMMXsJur4xmW_JeapV7iqqI3qTCX3UUVC7"
 */

// --- 設定エリア ---
const FIREBASE_CONFIG = {
    email: "client@email.com", // サービスアカウントのメールアドレス
    key: "-----BEGIN PRIVATE KEY-----\n...", // 秘密鍵
    projectId: "kirakira-app"
};

// ★ここを毎年変更してください★
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; // スプレッドシートID
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
 */
function syncMembers(ss) {
    let sheet = ss.getSheetByName(SHEET_NAME_MEMBERS);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_MEMBERS);
        // ヘッダー作成
        sheet.getRange(1, 1, 1, 6).setValues([["ID", "学年", "クラス", "氏名", "フリガナ", "許可メール"]]);
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
        (c.authorizedEmails || []).join(",")
    ]);

    // クリアして書き込み
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
    }

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 6).setValues(rows);
    }
}

/**
 * 日報の同期 (当日分の追記)
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
            r.memo || ""
        ];
    });

    // 最下行に追記
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
}

// --- ヘルパー関数 ---
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
