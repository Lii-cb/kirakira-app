// ==========================================
// API: Staff Attendance (職員出勤管理)
// ==========================================

function getStaffAttendance(dateStr) {
    var db = getDB();
    var sheet = db.getSheetByName('職員出勤記録');
    var staffMaster = db.getSheetByName('職員マスタ');
    if (!sheet || !staffMaster) return [];

    // Read staff members
    var smData = staffMaster.getDataRange().getValues();
    var staffMap = {};
    for (var i = 1; i < smData.length; i++) {
        var sEmail = smData[i][1];
        if (sEmail) {
            staffMap[sEmail] = {
                email: sEmail,
                name: smData[i][0]
            };
        }
    }

    var data = sheet.getDataRange().getValues();
    var result = [];
    var existingMap = {}; // To track who already has a record for dateStr

    for (var j = 1; j < data.length; j++) {
        var row = data[j];
        var rDateStr = "";
        if (row[2] instanceof Date) {
            rDateStr = Utilities.formatDate(row[2], 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
            rDateStr = row[2] ? row[2].toString() : '';
        }

        if (rDateStr === dateStr) {
            var sEmail = row[1];
            existingMap[sEmail] = true;
            result.push({
                id: row[0],
                email: sEmail,
                name: row[3],
                status: row[4] || '予定',
                shiftTime: row[5] || '',
                actualTime: row[6] ? formatTime(row[6]) : null,
                actualEndTime: row[7] ? formatTime(row[7]) : null
            });
        }
    }

    // Pre-fill "予定" rows for all staff if not found? 
    // Probably better just to return what exists, but for the dashboard it's good to see everyone.
    // Actually, only managers who added staff to the schedule should see them, 
    // but let's default to returning all active staff.
    for (var email in staffMap) {
        if (!existingMap[email]) {
            result.push({
                id: email + '_' + dateStr,
                email: email,
                name: staffMap[email].name,
                status: '未定',
                shiftTime: '',
                actualTime: null,
                actualEndTime: null
            });
        }
    }

    return result;
}

function updateStaffStatus(dateStr, staffEmail, updates) {
    var db = getDB();
    var sheet = db.getSheetByName('職員出勤記録');
    var lock = LockService.getScriptLock();

    if (!sheet) return { success: false, error: 'Config err' };

    try {
        lock.waitLock(5000);
        var data = sheet.getDataRange().getValues();
        var targetId = staffEmail + '_' + dateStr;
        var rowIndex = -1;

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] === targetId) {
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex === -1) {
            // Need to find staff name
            var staffMaster = db.getSheetByName('職員マスタ');
            var name = '';
            if (staffMaster) {
                var smData = staffMaster.getDataRange().getValues();
                for (var k = 1; k < smData.length; k++) {
                    if (smData[k][1] === staffEmail) {
                        name = smData[k][0];
                        break;
                    }
                }
            }

            sheet.appendRow([
                targetId,             // A
                staffEmail,           // B
                dateStr,              // C
                name,                 // D
                updates.status || '予定', // E
                updates.shiftTime || '',  // F
                updates.actualTime || '', // G
                updates.actualEndTime || '' // H
            ]);
            return { success: true };
        } else {
            var rowRange = sheet.getRange(rowIndex, 1, 1, 8);
            var rowVals = rowRange.getValues()[0];

            if (updates.status !== undefined) rowVals[4] = updates.status;
            if (updates.shiftTime !== undefined) rowVals[5] = updates.shiftTime;
            if (updates.actualTime !== undefined) rowVals[6] = updates.actualTime;
            if (updates.actualEndTime !== undefined) rowVals[7] = updates.actualEndTime;

            rowRange.setValues([rowVals]);
            return { success: true };
        }

    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}
