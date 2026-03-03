// ==========================================
// API: Reservation (予約管理)
// ==========================================

function getReservations(dateStr) {
    var db = getDB();
    var sheet = db.getSheetByName('予約');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rDateStr = "";
        if (row[2] instanceof Date) {
            rDateStr = Utilities.formatDate(row[2], 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
            rDateStr = row[2] ? row[2].toString() : '';
        }

        if (!dateStr || rDateStr === dateStr) {
            result.push({
                id: row[0], // A
                childId: row[1].toString(), // B
                date: rDateStr, // C
                time: row[3], // D
                status: row[4], // E
                hasSnack: row[5] === true || row[5] === 'TRUE', // F
                createdAt: row[6] // G
            });
        }
    }

    return result;
}

function getReservationsForChild(childId) {
    var db = getDB();
    var sheet = db.getSheetByName('予約');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var result = [];

    // Sort dates descending typically, so get them all and sort
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[1].toString() === childId.toString()) {
            var rDateStr = "";
            if (row[2] instanceof Date) {
                rDateStr = Utilities.formatDate(row[2], 'Asia/Tokyo', 'yyyy-MM-dd');
            } else {
                rDateStr = row[2] ? row[2].toString() : '';
            }

            result.push({
                id: row[0],
                childId: row[1].toString(),
                date: rDateStr,
                time: row[3],
                status: row[4],
                hasSnack: row[5] === true || row[5] === 'TRUE',
                createdAt: row[6] ? new Date(row[6]).getTime() : 0
            });
        }
    }

    // Sort by date desc
    result.sort(function (a, b) {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
    });

    return result;
}

function submitReservation(childId, dates, time, hasSnack) {
    var db = getDB();
    var sheet = db.getSheetByName('予約');
    var lock = LockService.getScriptLock();

    if (!sheet || !dates || dates.length === 0) return { success: false, error: 'Invalid config' };

    try {
        lock.waitLock(5000);

        var timestamp = new Date();

        for (var i = 0; i < dates.length; i++) {
            var dateStr = dates[i];
            var newId = childId + '_' + dateStr + '_' + timestamp.getTime(); // Generate semi-unique ID

            sheet.appendRow([
                newId,           // A: ID
                childId,         // B: 児童ID
                dateStr,         // C: 日付
                time,            // D: 時間
                'pending',       // E: ステータス
                hasSnack,        // F: おやつ
                timestamp        // G: 申請日時
            ]);
        }

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

function updateReservationStatus(id, newStatus) {
    var db = getDB();
    var sheet = db.getSheetByName('予約');
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(5000);

        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (data[i][0].toString() === id.toString()) {
                sheet.getRange(i + 1, 5).setValue(newStatus); // 5th col is E
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

function bulkUpdateReservations(ids, newStatus) {
    var db = getDB();
    var sheet = db.getSheetByName('予約');
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(10000);

        var data = sheet.getDataRange().getValues();

        // Create map for O(1) lookup
        var idMap = {};
        for (var k = 0; k < ids.length; k++) {
            idMap[ids[k]] = true;
        }

        var updateRanges = []; // Doing individual sets is slow, but assuming small arrays, it's okay. A better way is bulk getRange.
        for (var i = 1; i < data.length; i++) {
            if (idMap[data[i][0].toString()]) {
                sheet.getRange(i + 1, 5).setValue(newStatus);
            }
        }

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

function cancelReservation(id) {
    // Equivalent to deleting or rejecting
    var db = getDB();
    var sheet = db.getSheetByName('予約');
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(5000);

        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            if (data[i][0].toString() === id.toString()) {
                sheet.deleteRow(i + 1);
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
