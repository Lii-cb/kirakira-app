// ==========================================
// API: Reservation (予約管理) - 数値コード高速化版 (v2)
// ==========================================
// 1: 承認済(おやつあり), 0: 承認済(おやつなし)
// 3: 申請中(おやつあり), 2: 申請中(おやつなし)
// 4: 却下
// 5: 欠席申請中, 6: 欠席(承認済)
// 空欄: なし

/**
 * 管理者用: 特定の日付の予約一覧を取得する
 */
function getReservations(dateStr) {
    if (!dateStr) return [];
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var childIds = data[1].slice(3);
    var childNames = data[0].slice(3);

    var rowIndex = -1;
    for (var i = 2; i < data.length; i++) {
        if (formatDateStr(data[i][0]) === dateStr) {
            rowIndex = i;
            break;
        }
    }
    if (rowIndex === -1) return [];

    var rowData = data[rowIndex];
    var result = [];

    for (var col = 3; col < rowData.length; col++) {
        var val = rowData[col];
        if (val !== '' && val !== null && val !== undefined) {
            var note = sheet.getRange(rowIndex + 1, col + 1).getNote();
            var info = parseReservationNote(note);
            var status = translateCodeToStatus(val);

            result.push({
                id: childIds[col - 3] + '_' + dateStr,
                childId: childIds[col - 3],
                childName: childNames[col - 3],
                date: dateStr,
                time: info.time || '',
                status: status,
                statusCode: val,
                hasSnack: (val == 1 || val == 3),
                returnMethod: info.returnMethod || '',
                createdAt: info.createdAt || ''
            });
        }
    }
    return result;
}

/**
 * 保護者用: 特定の児童の予約履歴を取得する
 */
function getReservationsForChild(childId) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var colIndex = -1;
    for (var j = 3; j < data[1].length; j++) {
        if (data[1][j] && data[1][j].toString() === childId.toString()) {
            colIndex = j;
            break;
        }
    }
    if (colIndex === -1) return [];

    var result = [];
    for (var i = 2; i < data.length; i++) {
        var val = data[i][colIndex];
        if (val !== '' && val !== null && val !== undefined) {
            var note = sheet.getRange(i + 1, colIndex + 1).getNote();
            var info = parseReservationNote(note);
            result.push({
                id: childId + '_' + formatDateStr(data[i][0]),
                childId: childId,
                date: formatDateStr(data[i][0]),
                time: info.time || '',
                status: translateCodeToStatus(val),
                statusCode: val,
                hasSnack: (val == 1 || val == 3),
                returnMethod: info.returnMethod || '',
                createdAt: info.createdAt || ''
            });
        }
    }
    result.sort(function (a, b) { return a.date > b.date ? -1 : 1; });
    return result;
}

/**
 * 予約申請
 */
function submitReservation(childId, dates, time, hasSnack, returnMethod) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    var lock = LockService.getScriptLock();
    var settings = getSettings();

    try {
        lock.waitLock(10000);
        var data = sheet.getDataRange().getValues();
        var colIndex = -1;
        for (var j = 3; j < data[1].length; j++) {
            if (data[1][j] && data[1][j].toString() === childId.toString()) {
                colIndex = j;
                break;
            }
        }
        if (colIndex === -1) return { success: false, error: '児童が見つかりません' };

        var statusCode = hasSnack ? 3 : 2; // 申請中
        var nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');

        for (var d = 0; d < dates.length; d++) {
            var targetDate = dates[d];
            var resolvedTime = time;

            // 「各日程の開所時間にあわせる」対応
            if (time === 'AUTO_OPEN_HOURS') {
                var info = getDayInfo(targetDate);
                resolvedTime = info.openHours;
                if (!resolvedTime) {
                    var isSat = new Date(targetDate.replace(/-/g, '/')).getDay() === 6;
                    resolvedTime = isSat ? (settings.openSaturday || '7:30-12:00') : (settings.openWeekday || '15:00-18:30');
                }
            }

            var noteText = [
                '時間: ' + resolvedTime,
                '帰宅方法: ' + (returnMethod || '未指定'),
                '申請日時: ' + nowStr
            ].join('\n');

            for (var i = 2; i < data.length; i++) {
                if (formatDateStr(data[i][0]) === targetDate) {
                    var cell = sheet.getRange(i + 1, colIndex + 1);
                    var currentVal = data[i][colIndex];

                    // 承認済(0,1)や却下(4)、欠席(5,6)でない場合（=未登録、または申請中）のみ上書きを許可
                    // （※ただし、今回は「申請中」を編集可能にしたいので、2,3も対象に含む）
                    if (currentVal === '' || currentVal === null || currentVal == 2 || currentVal == 3) {
                        cell.setValue(statusCode);
                        cell.setNote(noteText);
                    }
                    break;
                }
            }
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

/**
 * 承認・ステータス更新
 */
function updateReservationStatus(id, newStatus) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    var parts = id.split('_');
    var childId = parts[0], dateStr = parts[1];

    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        var colIndex = -1, rowIndex = -1;
        for (var j = 3; j < data[1].length; j++) { if (data[1][j] && data[1][j].toString() === childId.toString()) { colIndex = j; break; } }
        for (var i = 2; i < data.length; i++) { if (formatDateStr(data[i][0]) === dateStr) { rowIndex = i; break; } }

        if (colIndex !== -1 && rowIndex !== -1) {
            var cell = sheet.getRange(rowIndex + 1, colIndex + 1);
            var currentVal = data[rowIndex][colIndex];
            var newVal = currentVal;

            if (newStatus === '承認済') {
                newVal = (currentVal == 3) ? 1 : 0;
            } else if (newStatus === '却下') {
                newVal = 4;
            } else if (newStatus === '申請中') {
                newVal = (currentVal == 1) ? 3 : 2;
            } else if (newStatus === '欠席申請中') {
                newVal = 5;
            } else if (newStatus === '欠席') {
                newVal = 6;
            }
            cell.setValue(newVal);
            return { success: true };
        }
        return { success: false, error: 'Not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

/**
 * 予約内容の更新（時間・おやつ・帰宅方法）
 */
function updateReservationDetails(id, time, hasSnack, returnMethod) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    var parts = id.split('_');
    var childId = parts[0], dateStr = parts[1];
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(10000);
        var data = sheet.getDataRange().getValues();
        var colIndex = -1, rowIndex = -1;
        for (var j = 3; j < data[1].length; j++) { if (data[1][j] && data[1][j].toString() === childId.toString()) { colIndex = j; break; } }
        for (var i = 2; i < data.length; i++) { if (formatDateStr(data[i][0]) === dateStr) { rowIndex = i; break; } }

        if (colIndex !== -1 && rowIndex !== -1) {
            var cell = sheet.getRange(rowIndex + 1, colIndex + 1);
            var currentVal = data[rowIndex][colIndex];

            // ステータスコードの更新（おやつ有無の反映）
            var newVal = currentVal;
            var user = getCurrentUser();

            if (user.role === 'parent') {
                // 保護者の編集は「承認待ち」に戻す
                newVal = hasSnack ? 3 : 2;
            } else {
                // 管理者・職員の編集はカテゴリ（承認済/申請中）を維持
                if (currentVal == 1 || currentVal == 0) { // 承認済
                    newVal = hasSnack ? 1 : 0;
                } else if (currentVal == 3 || currentVal == 2) { // 申請中
                    newVal = hasSnack ? 3 : 2;
                }
            }

            var nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
            var noteText = [
                '時間: ' + time,
                '帰宅方法: ' + (returnMethod || '未指定'),
                '更新日時: ' + nowStr
            ].join('\n');

            cell.setValue(newVal);
            cell.setNote(noteText);
            return { success: true };
        }
        return { success: false, error: '予約が見つかりません' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

/**
 * 一括承認用
 */
function bulkUpdateReservations(ids, newStatus) {
    if (!ids || ids.length === 0) return { success: true };
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(15000);
        for (var i = 0; i < ids.length; i++) {
            updateReservationStatus(ids[i], newStatus);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

/**
 * 取消
 */
function cancelReservation(id) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    var lock = LockService.getScriptLock();
    var parts = id.split('_');
    var childId = String(parts[0]), dateStr = parts[1];
    var data = sheet.getDataRange().getValues();
    var colIndex = -1, rowIndex = -1;
    try {
        lock.waitLock(10000);
        for (var j = 3; j < data[1].length; j++) { if (data[1][j] && String(data[1][j]) === childId) { colIndex = j; break; } }
        for (var i = 2; i < data.length; i++) { if (formatDateStr(data[i][0]) === dateStr) { rowIndex = i; break; } }

        if (colIndex !== -1 && rowIndex !== -1) {
            var cell = sheet.getRange(rowIndex + 1, colIndex + 1);
            cell.clearContent();
            cell.clearNote();
            return { success: true };
        }
        return { success: false, error: 'Not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}

/**
 * 承認待ちの予約（欠席・通常双方）を高速スキャン
 */
function getPendingReservations() {
    try {
        requireRole(['admin', 'staff']);
        var db = getDB();
        var sheet = db.getSheetByName('スケジュール予約');
        if (!sheet) return [];

        var data = sheet.getDataRange().getValues();
        var notes = sheet.getDataRange().getNotes();
        var childIds = data[1];
        var childNames = data[0];
        var pendingList = [];

        for (var i = 2; i < data.length; i++) {
            var rowDateStr = formatDateStr(data[i][0]);
            if (!rowDateStr) continue;

            for (var j = 3; j < data[i].length; j++) {
                var val = data[i][j];
                // 2,3: 通常予約(申請中), 5: 欠席申請中
                if (val == 2 || val == 3 || val == 5) {
                    var info = parseReservationNote(notes[i][j]);
                    var name = childNames[j] || ('ID:' + childIds[j]);
                    var status = (val == 5) ? '欠席申請中' : '申請中';

                    pendingList.push({
                        id: childIds[j] + '_' + rowDateStr,
                        childId: childIds[j],
                        childName: name,
                        date: rowDateStr,
                        time: info.time,
                        status: status,
                        statusCode: val,
                        hasSnack: (val == 3),
                        returnMethod: info.returnMethod || ''
                    });
                }
            }
        }
        // 日付順にソートしておくと見やすい
        pendingList.sort(function (a, b) { return a.date > b.date ? 1 : -1; });
        return pendingList;
    } catch (e) {
        console.error("getPendingReservations error: " + e.toString());
        return { success: false, error: e.toString() };
    }
}

// ヘルパー
function translateCodeToStatus(code) {
    if (code == 1 || code == 0) return '承認済';
    if (code == 2 || code == 3) return '申請中';
    if (code == 4) return '却下';
    if (code == 5) return '欠席申請中';
    if (code == 6) return '欠席（承認済み）';
    return '';
}

function parseReservationNote(note) {
    var result = { time: '', returnMethod: '', createdAt: '' };
    if (!note) return result;
    var lines = note.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf('時間:') === 0) result.time = line.replace('時間:', '').trim();
        if (line.indexOf('帰宅方法:') === 0) result.returnMethod = line.replace('帰宅方法:', '').trim();
        if (line.indexOf('申請日時:') === 0) result.createdAt = line.replace('申請日時:', '').trim();
    }
    return result;
}

/**
 * 特定日のスケジュール情報（メモ・開所時間）を取得
 */
function getDayInfo(dateStr) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    if (!sheet) return { memo: '', openHours: '' };

    var data = sheet.getDataRange().getValues();
    for (var i = 2; i < data.length; i++) {
        if (formatDateStr(data[i][0]) === dateStr) {
            return {
                memo: data[i][1] || '',
                openHours: data[i][2] || ''
            };
        }
    }
    return { memo: '', openHours: '' };
}

/**
 * 特定日のスケジュール情報（メモ・開所時間）を保存
 */
function saveDayInfo(dateStr, memo, openHours) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    var lock = LockService.getScriptLock();
    if (!sheet) return { success: false };

    try {
        lock.waitLock(10000);
        var data = sheet.getRange("A3:A").getValues();
        for (var i = 0; i < data.length; i++) {
            if (formatDateStr(data[i][0]) === dateStr) {
                // A3がrow 3なので、index i なら row i+3
                sheet.getRange(i + 3, 2).setValue(memo);
                sheet.getRange(i + 3, 3).setValue(openHours);
                return { success: true };
            }
        }
        return { success: false, error: 'Date not found' };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}
/**
 * 管理者用: 月間の予約状況（統計）を取得する
 * @param {string} monthStr "yyyy-MM" 形式
 */
function getMonthlyStatus(monthStr) {
    var db = getDB();
    var sheet = db.getSheetByName('スケジュール予約');
    if (!sheet) return {};

    var data = sheet.getDataRange().getValues();
    var result = {};

    for (var i = 2; i < data.length; i++) {
        var date = data[i][0];
        if (!date) continue;

        var dateObj = new Date(date);
        var y = dateObj.getFullYear();
        var m = dateObj.getMonth() + 1;
        var ds = y + '-' + (m < 10 ? '0' + m : m) + '-' + (dateObj.getDate() < 10 ? '0' + dateObj.getDate() : dateObj.getDate());

        if (ds.indexOf(monthStr) === 0) {
            var confirmed = 0;
            var pending = 0;
            for (var col = 3; col < data[i].length; col++) {
                var val = data[i][col];
                if (val == 1 || val == 0) confirmed++;
                if (val == 2 || val == 3 || val == 5) pending++;
            }
            result[ds] = {
                confirmed: confirmed,
                pending: pending,
                memo: data[i][1] || '',
                openHours: data[i][2] || ''
            };
        }
    }
    return result;
}
/**
 * 児童マスタからスケジュール予約シートの列を同期する
 */
function syncScheduleSheetChildren() {
    requireRole(['admin']);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var master = ss.getSheetByName('児童マスタ');
    var schedule = ss.getSheetByName('スケジュール予約');
    if (!master || !schedule) return { success: false, error: 'シートが見つかりません' };

    var kids = master.getRange(2, 1, Math.max(1, master.getLastRow() - 1), 2).getValues();
    var currentIds = schedule.getRange(2, 4, 1, Math.max(1, schedule.getLastColumn() - 3)).getValues()[0].map(function (id) { return id.toString(); });

    // 児童IDを2行目に、名前を1行目に並べる
    var names = [];
    var ids = [];
    for (var i = 0; i < kids.length; i++) {
        var id = kids[i][0] ? kids[i][0].toString() : '';
        if (!id) continue;
        ids.push(id);
        names.push(kids[i][1]);
    }

    if (ids.length > 0) {
        // 全体の列を一度クリアして書き直す（順番を揃えるため）
        var lastCol = schedule.getLastColumn();
        if (lastCol >= 4) {
            schedule.getRange(1, 4, schedule.getLastRow(), lastCol - 3).clearContent();
        }
        schedule.getRange(1, 4, 1, names.length).setValues([names]).setFontWeight('bold').setBackground('#f3f4f6');
        schedule.getRange(2, 4, 1, ids.length).setValues([ids]).setFontColor('#94a3b8').setFontSize(8);
        return { success: true, count: ids.length };
    }
    return { success: false, error: '登録されている児童がいません' };
}
