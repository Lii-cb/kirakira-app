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
                name: smData[i][0],
                hourlyRate: Number(smData[i][3]) || 0
            };
        }
    }

    var data = sheet.getDataRange().getValues();
    var result = [];
    var existingMap = {}; // To track who already has a record for dateStr

    for (var j = 1; j < data.length; j++) {
        var row = data[j];
        var rDateStr = formatDateStr(row[2]);

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
                actualEndTime: row[7] ? formatTime(row[7]) : null,
                totalMinutes: Number(row[8]) || 0,
                lastInTime: row[9] || null,
                hourlyRate: staffMap[sEmail] ? staffMap[sEmail].hourlyRate : 0
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
                actualEndTime: null,
                totalMinutes: 0,
                lastInTime: null,
                hourlyRate: staffMap[email].hourlyRate
            });
        }
    }

    return result;
}

function updateStaffStatus(dateStr, staffEmail, updates) {
    requireRole(['admin', 'staff']);
    var db = getDB();
    var sheet = db.getSheetByName('職員出勤記録');
    var lock = LockService.getScriptLock();

    if (!sheet) return { success: false, error: 'Config err' };

    try {
        lock.waitLock(10000);
        var sEmailStr = (staffEmail || "").toString().trim();
        // Safeguard: Ensure enough columns exist (J column = 10)
        if (sheet.getMaxColumns() < 10) {
            sheet.insertColumnsAfter(sheet.getMaxColumns(), 10 - sheet.getMaxColumns());
        }
        var data = sheet.getDataRange().getValues();
        var targetId = sEmailStr + '_' + dateStr;
        var rowIndex = -1;

        for (var i = 1; i < data.length; i++) {
            if (String(data[i][0]) === targetId) {
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex === -1) {
            // New record
            var staffMaster = db.getSheetByName('職員マスタ');
            var name = '';
            if (staffMaster) {
                var smData = staffMaster.getDataRange().getValues();
                for (var k = 1; k < smData.length; k++) {
                    if (String(smData[k][1]).trim() === sEmailStr) {
                        name = smData[k][0];
                        break;
                    }
                }
            }

            var now = new Date();
            var timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');
            var newStatus = updates.status || '予定';
            var actualStart = (newStatus === '在室') ? timeStr : '';
            var lastIn = (newStatus === '在室') ? now : '';

            sheet.appendRow([
                targetId,             // A: ID
                sEmailStr,           // B: メール
                dateStr,              // C: 日付
                name,                 // D: 氏名
                newStatus,            // E: ステータス
                updates.shiftTime || '',  // F: シフト
                actualStart,          // G: 出勤時刻
                '',                   // H: 退勤時刻
                0,                    // I: 在室合計
                lastIn                // J: 最終入室時刻
            ]);
            return { success: true };
        } else {
            var rowRange = sheet.getRange(rowIndex, 1, 1, 10);
            var rowVals = rowRange.getValues()[0];
            var currentStatus = rowVals[4];
            var newStatus = updates.status;
            var now = new Date();
            var timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');

            if (newStatus !== undefined && newStatus !== currentStatus) {
                // State Machine Logic
                var totalMin = Number(rowVals[8]) || 0;
                var lastIn = rowVals[9] ? new Date(rowVals[9]) : null;

                // 1. Calculate elapsed if leaving '在室'
                if (currentStatus === '在室' && lastIn) {
                    var elapsed = Math.floor((now.getTime() - lastIn.getTime()) / 60000);
                    totalMin += Math.max(0, elapsed);
                    rowVals[8] = totalMin;
                    rowVals[9] = ''; // Clear lastIn
                }

                // 2. Process Entry to New State
                if (newStatus === '在室') {
                    rowVals[9] = now; // Set lastIn
                    if (!rowVals[6]) rowVals[6] = timeStr; // Set Start Time if first time
                } else if (newStatus === '退勤') {
                    rowVals[7] = timeStr; // Set End Time
                }

                rowVals[4] = newStatus;
            }

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
        if (lock.hasLock()) lock.releaseLock();
    }
}
