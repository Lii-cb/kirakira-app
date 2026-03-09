// ==========================================
// API: Misc (その他・マスタ管理)
// ==========================================

function getChildBalance(childId) {
    var db = getDB();
    var sheet = db.getSheetByName('利用料計算');
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    var cIdStr = String(childId);
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === cIdStr) {
            return {
                baseFee: data[i][5],
                snackFee: data[i][6],
                total: data[i][7],
                paid: data[i][8],
                balance: data[i][9]
            };
        }
    }
    return null;
}

function submitPaymentReport(childId, amount, date, memo) {
    requireRole(['parent', 'admin']);
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    var lock = LockService.getScriptLock();
    if (!sheet) return { success: false, error: 'Config err' };

    try {
        lock.waitLock(10000);
        var childIdStr = (childId || "").toString();
        sheet.appendRow([
            Utilities.getUuid(),
            childIdStr,
            '', // Name will be filled by spreadsheet formula or script later if needed
            new Date(),
            amount,
            'pending',
            ''
        ]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

function confirmPayment(paymentId, approved) {
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('入金');
    var lock = LockService.getScriptLock();
    if (!sheet) return { success: false, error: 'Config err' };

    try {
        lock.waitLock(10000);
        var data = sheet.getDataRange().getValues();
        var pIdStr = (paymentId || "").toString();
        for (var i = 1; i < data.length; i++) {
            if (String(data[i][0]) === pIdStr) {
                sheet.getRange(i + 1, 6).setValue(approved ? 'confirmed' : 'rejected');
                sheet.getRange(i + 1, 7).setValue(new Date());
                return { success: true };
            }
        }
        return { success: false, error: 'Payment not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

// ------------------------------------------

function getDailyMemos(dateStr) {
    var db = getDB();
    var sheet = db.getSheetByName('日報');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
        if (formatDateStr(data[i][1]) === dateStr) {
            result.push({
                id: data[i][0],
                category: data[i][3],
                content: data[i][4],
                author: data[i][5]
            });
        }
    }
    return result;
}

function saveDailyMemo(dateStr, memo) {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('日報');
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(5000);
        sheet.appendRow([
            Utilities.getUuid(),
            dateStr,
            Utilities.formatDate(new Date(), 'Asia/Tokyo', 'HH:mm'),
            memo.category || '一般',
            memo.content,
            Session.getActiveUser().getEmail()
        ]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

// ------------------------------------------

function getDocuments() {
    var db = getDB();
    var sheet = db.getSheetByName('おたより');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
        result.push({
            id: data[i][0],
            title: data[i][1],
            category: data[i][2],
            url: data[i][3],
            date: formatDateStr(data[i][4])
        });
    }
    return result.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
}

function deleteDocument(docId) {
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('おたより');
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(docId)) {
                sheet.deleteRow(i + 1);
                return { success: true };
            }
        }
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

// ------------------------------------------

function saveSettings(newSettings) {
    requireRole(['admin']);
    var db = getDB();
    var sheet = db.getSheetByName('設定');
    var lock = LockService.getScriptLock();
    if (!sheet) return { success: false, error: 'シートが見つかりません' };
    try {
        lock.waitLock(10000);
        if (newSettings.baseFee !== undefined) sheet.getRange('A2').setValue(newSettings.baseFee);
        if (newSettings.snackFee !== undefined) sheet.getRange('A3').setValue(newSettings.snackFee);
        if (newSettings.webhookUrl !== undefined) sheet.getRange('A4').setValue(newSettings.webhookUrl);
        if (newSettings.facilityName !== undefined) sheet.getRange('A5').setValue(newSettings.facilityName);
        if (newSettings.openWeekday !== undefined) sheet.getRange('A6').setValue(newSettings.openWeekday);
        if (newSettings.openSaturday !== undefined) sheet.getRange('A7').setValue(newSettings.openSaturday);
        if (newSettings.returnMethods !== undefined) sheet.getRange('A8').setValue(newSettings.returnMethods);
        if (newSettings.docCategories !== undefined) sheet.getRange('A9').setValue(newSettings.docCategories);
        if (newSettings.memoCategories !== undefined) sheet.getRange('A10').setValue(newSettings.memoCategories);

        syncListMaster(db, newSettings);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

function syncListMaster(db, settings) {
    var listSheet = db.getSheetByName('リストマスタ');
    var lock = LockService.getScriptLock();
    if (!listSheet) return;

    try {
        lock.waitLock(10000);
        var returnMethods = (settings.returnMethods || "").toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var docCategories = (settings.docCategories || "").toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var memoCategories = (settings.memoCategories || "").toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);

        var maxRows = Math.max(returnMethods.length, docCategories.length, memoCategories.length, 1);
        var values = [];
        for (var i = 0; i < maxRows; i++) {
            values.push([returnMethods[i] || "", docCategories[i] || "", memoCategories[i] || ""]);
        }

        if (listSheet.getLastRow() > 1) {
            listSheet.getRange(2, 1, listSheet.getLastRow() - 1, 3).clearContent();
        }
        listSheet.getRange(2, 1, values.length, 3).setValues(values);
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

// ------------------------------------------

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
            id: String(data[i][0]), name: data[i][1], kana: data[i][2],
            grade: data[i][3], returnMethod: data[i][4],
            hasSnack: data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === '要'
        });
    }
    return result;
}

function toggleChildSnack(childId, hasSnack) {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('児童マスタ');
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(10000);
        var data = sheet.getDataRange().getValues();
        var cIdStr = String(childId);
        for (var i = 1; i < data.length; i++) {
            if (String(data[i][0]) === cIdStr) {
                sheet.getRange(i + 1, 6).setValue(hasSnack ? '要' : '不要');
                return { success: true };
            }
        }
        return { success: false, error: 'Not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

/**
 * 旧データをアーカイブ用シートに移動し、メインシートをクリーンにする (Phase 3対策)
 * @param {string} targetDateStr この日付以前のデータを移動する
 */
function archiveOldData(targetDateStr) {
    requireRole(['admin']);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var archiveSheet = ss.getSheetByName('アーカイブ');
    if (!archiveSheet) {
        archiveSheet = ss.insertSheet('アーカイブ');
        archiveSheet.appendRow(['元シート', 'データJSON', 'アーカイブ日時']);
    }

    var targetDate = new Date(targetDateStr);
    var sheetsToArchive = ['出席記録', '日報', '入金', '職員出勤記録'];
    var movedCount = 0;

    sheetsToArchive.forEach(function (sheetName) {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) return;
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var rowsToRemove = [];
        var dateColIdx = -1;

        // 日付列の特定
        if (sheetName === '出席記録') dateColIdx = 2;
        if (sheetName === '日報') dateColIdx = 1;
        if (sheetName === '入金') dateColIdx = 3;
        if (sheetName === '職員出勤記録') dateColIdx = 2;

        if (dateColIdx === -1) return;

        for (var i = data.length - 1; i >= 1; i--) {
            var rowDate = new Date(data[i][dateColIdx]);
            if (rowDate < targetDate) {
                var rowData = {};
                headers.forEach(function (h, idx) { rowData[h] = data[i][idx]; });
                archiveSheet.appendRow([sheetName, JSON.stringify(rowData), new Date()]);
                sheet.deleteRow(i + 1);
                movedCount++;
            }
        }
    });

    return { success: true, movedCount: movedCount };
}
