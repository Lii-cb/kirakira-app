// ==========================================
// API: Attendance (出席管理)
// ==========================================

function getAttendanceList(dateStr) {
    var db = getDB();
    var sheet = db.getSheetByName('出席記録');
    var childSheet = db.getSheetByName('児童マスタ');
    if (!sheet || !childSheet) return [];

    // Get all registered children
    var childData = childSheet.getDataRange().getValues();
    var childrenMap = {};
    for (var i = 1; i < childData.length; i++) {
        var cid = childData[i][0].toString();
        if (!cid) continue;
        childrenMap[cid] = {
            id: cid,
            name: childData[i][1],
            grade: childData[i][3],
            defaultReturnMethod: childData[i][4],
            hasSnack: childData[i][5] === true || childData[i][5] === 'TRUE' || childData[i][5] === '要'
        };
    }

    // Get attendance records for the specific date
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var recordsForDate = {};
    var result = [];

    for (var j = 1; j < data.length; j++) {
        var row = data[j];
        var rowDate = row[2]; // C列: 日付

        // GAS date format handling
        var rowDateStr = formatDateStr(rowDate);

        if (rowDateStr === dateStr) {
            var childId = row[1].toString(); // B列: 児童ID
            recordsForDate[childId] = {
                rowIdx: j + 1, // Spreadsheet is 1-indexed
                id: row[0], // A列: ID
                childId: childId,
                date: rowDateStr,
                name: row[3], // D列
                grade: row[4], // E列
                status: row[5] || '予定', // F列
                arrivalTime: row[6] ? formatTime(row[6]) : null, // G列
                departureTime: row[7] ? formatTime(row[7]) : null, // H列
                reservationTime: row[8], // I列
                hasSnack: row[9] === true || row[9] === 'TRUE', // J列
                returnMethod: row[10], // K列
                returnDetails: row[11], // L列
                staffMemo: row[12], // M列
                changeRequestType: row[13], // N列
                changeRequestValue: row[14], // O列
                changeRequestStatus: row[15] // P列
            };
        }
    }

    // Get reservations for the date
    var reservations = getReservations(dateStr);
    var reservationMap = {};
    for (var k = 0; k < reservations.length; k++) {
        reservationMap[reservations[k].childId] = reservations[k];
    }

    // Create records for children who have an attendance record OR a reservation
    for (var cid in childrenMap) {
        if (recordsForDate[cid]) {
            result.push(recordsForDate[cid]);
        } else if (reservationMap[cid]) {
            // Include child if they have a reservation today
            var child = childrenMap[cid];
            var res = reservationMap[cid];
            result.push({
                rowIdx: -1, // Indicates it's not saved to attendance sheet yet
                id: cid + '_' + dateStr,
                childId: cid,
                date: dateStr,
                name: child.name,
                grade: child.grade,
                status: '予定',
                arrivalTime: null,
                departureTime: null,
                reservationTime: res.time || '未定',
                hasSnack: res.hasSnack !== undefined ? res.hasSnack : child.hasSnack,
                returnMethod: child.defaultReturnMethod || '未定',
                returnDetails: '',
                staffMemo: '',
                changeRequestType: '',
                changeRequestValue: '',
                changeRequestStatus: ''
            });
        }
    }

    return result;
}

function updateAttendance(childId, dateStr, updates) {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('出席記録');
    var lock = LockService.getScriptLock();

    try {
        // Wait up to 5 seconds for other concurrent updates to finish
        lock.waitLock(5000);

        var data = sheet.getDataRange().getValues();
        var rowIndex = -1;
        var targetId = childId + '_' + dateStr;

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] === targetId) { // A列: ID
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex === -1) {
            // Need to create a new row
            // We need child data for D and E columns
            var childSheet = db.getSheetByName('児童マスタ');
            var cData = childSheet.getDataRange().getValues();
            var cName = '', cGrade = '', cReturn = '', cSnack = false;
            for (var c = 1; c < cData.length; c++) {
                if (cData[c][0].toString() === childId) {
                    cName = cData[c][1];
                    cGrade = cData[c][3];
                    cReturn = cData[c][4];
                    cSnack = cData[c][5] === true || cData[c][5] === 'TRUE';
                    break;
                }
            }

            var newRow = [
                targetId,                 // A: ID
                childId,                  // B: 児童ID
                dateStr,                  // C: 日付
                cName,                    // D: 氏名
                cGrade,                   // E: 学年
                updates.status || '予定', // F: ステータス
                updates.arrivalTime || '',// G: 入室
                updates.departureTime || '',// H: 退室
                updates.reservationTime || '未予約', // I: 予約時間
                updates.hasSnack !== undefined ? updates.hasSnack : cSnack, // J: おやつ
                updates.returnMethod || cReturn, // K: 帰宅方法
                updates.returnDetails || '', // L: 詳細
                updates.staffMemo || '',  // M: メモ
                updates.changeRequestType || '', // N: 申請
                updates.changeRequestValue || '', // O: 申請値
                updates.changeRequestStatus || '' // P: 申請状態
            ];
            sheet.appendRow(newRow);
            return { success: true, message: 'Created' };
        } else {
            // Update existing row
            var rowRange = sheet.getRange(rowIndex, 1, 1, 16);
            var rowVals = rowRange.getValues()[0];

            // Update fields if provided in updates object
            if (updates.status !== undefined) rowVals[5] = updates.status;
            if (updates.arrivalTime !== undefined) rowVals[6] = updates.arrivalTime;
            if (updates.departureTime !== undefined) rowVals[7] = updates.departureTime;
            if (updates.reservationTime !== undefined) rowVals[8] = updates.reservationTime;
            if (updates.hasSnack !== undefined) rowVals[9] = updates.hasSnack;
            if (updates.returnMethod !== undefined) rowVals[10] = updates.returnMethod;
            if (updates.returnDetails !== undefined) rowVals[11] = updates.returnDetails;
            if (updates.staffMemo !== undefined) rowVals[12] = updates.staffMemo;
            if (updates.changeRequestType !== undefined) rowVals[13] = updates.changeRequestType;
            if (updates.changeRequestValue !== undefined) rowVals[14] = updates.changeRequestValue;
            if (updates.changeRequestStatus !== undefined) rowVals[15] = updates.changeRequestStatus;

            rowRange.setValues([rowVals]);
            return { success: true, message: 'Updated' };
        }

    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

// Helper to format time properly from sheet (sometimes comes out as Date object)
function formatTime(val) {
    if (!val) return null;
    if (val instanceof Date) {
        return Utilities.formatDate(val, 'Asia/Tokyo', 'HH:mm');
    }
    return val.toString();
}
