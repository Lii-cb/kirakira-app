// ==========================================
// API: Miscellaneous (日報、おたより、金銭)
// ==========================================

// --- Daily Memo ---
function getDailyMemos(dateStr) {
    var db = getDB();
    var sheet = db.getSheetByName('日報');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
        var rDateStr = "";
        if (data[i][1] instanceof Date) { // B列: 日付
            rDateStr = Utilities.formatDate(data[i][1], 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
            rDateStr = data[i][1] ? data[i][1].toString() : '';
        }

        if (!dateStr || rDateStr === dateStr) {
            result.push({
                id: data[i][0], // A列
                date: rDateStr, // B列
                time: data[i][2] instanceof Date ? Utilities.formatDate(data[i][2], 'Asia/Tokyo', 'HH:mm') : data[i][2], // C列
                categories: data[i][3] ? data[i][3].toString().split(',').map(function (c) { return c.trim(); }) : [], // D列
                content: data[i][4], // E列
                author: data[i][5] // F列
            });
        }
    }
    return result;
}

function addDailyMemo(dateStr, categoriesArray, content) {
    var db = getDB();
    var sheet = db.getSheetByName('日報');
    var lock = LockService.getScriptLock();

    if (!sheet) return { success: false, error: 'Config err' };

    try {
        lock.waitLock(5000);
        var now = new Date();
        var timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');
        var memoId = 'memo_' + now.getTime();
        var currentUserInfo = getCurrentUser(); // Assumes this uses the auth function

        var catStr = "";
        if (categoriesArray && categoriesArray.length > 0) {
            catStr = categoriesArray.join(', ');
        }

        // ['ID', '日付', '時刻', 'カテゴリ', '内容', '作成者']
        sheet.appendRow([
            memoId,
            dateStr,
            timeStr,
            catStr,
            content,
            currentUserInfo.name || '不明'
        ]);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

// --- Documents ---
function getDocuments() {
    var db = getDB();
    var sheet = db.getSheetByName('おたより');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        result.push({
            id: row[0],
            title: row[1],
            category: row[2],
            url: row[3],
            date: row[4] instanceof Date ? Utilities.formatDate(row[4], 'Asia/Tokyo', 'yyyy-MM-dd') : row[4],
            createdAt: row[5]
        });
    }

    // Sort desc by date
    result.sort(function (a, b) {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
    });

    return result;
}

// --- Payments ---
function getChildBalance(childId) {
    var db = getDB();
    var sheet = db.getSheetByName('利用料計算');
    if (!sheet) return { balance: 0, total: 0, paid: 0 };

    var data = sheet.getDataRange().getValues();
    var childTotal = 0;
    var childPaid = 0;
    var childBalance = 0;

    // We aggregate across all months in the calculator sheet
    for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === childId.toString()) {
            childTotal += Number(data[i][7]) || 0;     // H: 合計
            childPaid += Number(data[i][8]) || 0;      // I: 入金累計 (calculated by SUMIFS)
            childBalance += Number(data[i][9]) || 0;   // J: 残高
        }
    }

    return { balance: childBalance, total: childTotal, paid: childPaid };
}

function submitPaymentReport(childId, amount) {
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    var lock = LockService.getScriptLock();

    if (!sheet) return { success: false, error: 'Config err' };

    try {
        lock.waitLock(5000);
        var timestamp = new Date();
        var newId = 'pay_' + timestamp.getTime();

        // ID, 児童ID, 氏名, 報告日時, 金額, ステータス, 承認日時
        sheet.appendRow([
            newId,
            childId,
            "=VLOOKUP(B:B, '児童マスタ'!A:B, 2, FALSE)", // Auto-fetch name
            timestamp,
            amount,
            'pending',
            ''
        ]);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

function confirmPayment(paymentId) {
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (data[i][0].toString() === paymentId.toString()) {
                sheet.getRange(i + 1, 6).setValue('confirmed'); // 6th col = F (ステータス)
                sheet.getRange(i + 1, 7).setValue(new Date());   // 7th col = G (承認日時)
                return { success: true };
            }
        }
        return { success: false, error: 'Not found' };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}
