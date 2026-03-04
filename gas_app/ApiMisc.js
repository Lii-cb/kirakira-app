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
        var rDateStr = formatDateStr(data[i][1]);

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
    requireRole(['admin', 'staff']);
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
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (data[i][0].toString() === paymentId.toString()) {
                sheet.getRange(i + 1, 6).setValue('confirmed');
                sheet.getRange(i + 1, 7).setValue(new Date());
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

// 全入金レコードを取得（管理者用）
function getAllPayments() {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue;
        result.push({
            id: row[0], childId: row[1], childName: row[2],
            reportedAt: row[3] instanceof Date ? Utilities.formatDate(row[3], 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : row[3],
            amount: row[4], status: row[5],
            confirmedAt: row[6] instanceof Date ? Utilities.formatDate(row[6], 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : row[6]
        });
    }
    result.sort(function (a, b) { return a.status === 'pending' ? -1 : 1; });
    return result;
}

// 保護者用: 自分の児童の入金履歴と残高
function getPaymentsForChild(childId) {
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
        if (data[i][1].toString() === childId.toString()) {
            result.push({
                id: data[i][0], amount: data[i][4], status: data[i][5],
                reportedAt: data[i][3] instanceof Date ? Utilities.formatDate(data[i][3], 'Asia/Tokyo', 'yyyy-MM-dd') : data[i][3]
            });
        }
    }
    return result;
}

// おたより追加
function addDocument(title, category, url) {
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('おたより');
    var lock = LockService.getScriptLock();
    if (!sheet) return { success: false, error: 'シートが見つかりません' };
    try {
        lock.waitLock(5000);
        var now = new Date();
        var newId = 'doc_' + now.getTime();
        sheet.appendRow([newId, title, category, url, now, now]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

// おたより削除
function deleteDocument(docId) {
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('おたより');
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (data[i][0].toString() === docId.toString()) {
                sheet.deleteRow(i + 1);
                return { success: true };
            }
        }
        return { success: false, error: 'Not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

// 設定を保存する
function saveSettings(newSettings) {
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('設定');
    if (!sheet) return { success: false, error: 'シートが見つかりません' };
    if (newSettings.adminPin !== undefined) sheet.getRange('A1').setValue(newSettings.adminPin);
    if (newSettings.baseFee !== undefined) sheet.getRange('A2').setValue(newSettings.baseFee);
    if (newSettings.snackFee !== undefined) sheet.getRange('A3').setValue(newSettings.snackFee);
    if (newSettings.webhookUrl !== undefined) sheet.getRange('A4').setValue(newSettings.webhookUrl);
    if (newSettings.facilityName !== undefined) sheet.getRange('A5').setValue(newSettings.facilityName);
    return { success: true };
}

// 全児童一覧（管理者用）
function getAllChildren() {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('児童マスタ');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        result.push({
            id: data[i][0].toString(), name: data[i][1], kana: data[i][2],
            grade: data[i][3], returnMethod: data[i][4],
            hasSnack: data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === '要'
        });
    }
    return result;
}

// おやつ設定を切り替え
function toggleChildSnack(childId, hasSnack) {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('児童マスタ');
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (data[i][0].toString() === childId.toString()) {
                sheet.getRange(i + 1, 6).setValue(hasSnack ? '要' : '不要');
                return { success: true };
            }
        }
        return { success: false, error: 'Not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

