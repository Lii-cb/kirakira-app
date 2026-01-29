/**
 * gas_script_v5_scheduler.js
 * Ver 3.0: Scheduled Data Sync (8:30 / 18:30)
 * Uses FirestoreGoogleAppsScript library.
 * Configure Request: Library ID: "1VUSl4b1r1eoNcRWotZKkgeOMMXsJur4xmW_JeapV7iqqI3qTCX3UUVC7" (Standard Lib)
 */

// --- CONFIGURATION ---
const FIREBASE_CONFIG = {
    email: "client@email.com", // Service Account Email
    key: "-----BEGIN PRIVATE KEY-----\n..." // Service Account Private Key
  projectId: "kirakira-app"
};

const SHEET_ID = "YOUR_SPREADSHEET_ID";
const SHEET_NAME = "DailyReport";

// Initialize Firestore
const firestore = FirestoreApp.getFirestore(FIREBASE_CONFIG.email, FIREBASE_CONFIG.key, FIREBASE_CONFIG.projectId);

/**
 * Main Sync Function
 * Trigger this at 8:30 and 18:30 via Time-driven triggers.
 */
function syncToSheets() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
        console.error("Sheet not found");
        return;
    }

    const today = new Date();
    const dateStr = Utilities.formatDate(today, "Asia/Tokyo", "yyyy-MM-dd");

    // 1. Fetch Today's Attendance
    const attendancePath = "attendance";
    // Note: Firestore Library 'query' support varies. 
    // It's safer to fetch all today's docs if the library supports 'where'.
    // Assuming basic fetch for now. If library allows query:
    const allAttendance = firestore.getDocuments(attendancePath).map(doc => doc.fields);
    const todayRecords = allAttendance.filter(r => r.date === dateStr);

    // 2. Fetch Children Master
    const children = firestore.getDocuments("children").map(doc => doc.fields);
    const childMap = {};
    children.forEach(c => childMap[c.id] = c);

    // 3. Prepare Rows
    // Header: [Date, Grade, Class, Name, Status, Arrival, Departure, Ext_Time, Snack, Details]
    const rows = [];

    // Sort by Grade/Class
    todayRecords.sort((a, b) => {
        const ca = childMap[a.childId];
        const cb = childMap[b.childId];
        if (!ca || !cb) return 0;
        if (ca.grade !== cb.grade) return ca.grade - cb.grade;
        return ca.className.localeCompare(cb.className);
    });

    todayRecords.forEach(record => {
        const child = childMap[record.childId];
        if (!child) return;

        rows.push([
            dateStr,
            child.grade,
            child.className,
            child.name,
            translateStatus(record.status),
            record.arrivalTime || "",
            record.departureTime || "",
            // Calculate Extension if needed
            calculateExtension(record),
            record.snackConfig?.isExempt ? "無" : "有", // Logic might be in child or record
            record.memo || ""
        ]);
    });

    // 4. Write to Sheet (Append or Overwrite Today's section?)
    // For simplicity: Append to bottom.
    if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
}

function translateStatus(status) {
    if (status === "arrived") return "出席";
    if (status === "left") return "帰宅";
    if (status === "absent") return "欠席";
    return "予定";
}

function calculateExtension(record) {
    // Mock logic
    if (record.departureTime > "18:00") return "あり";
    return "";
}

/**
 * Setup Triggers (Run once manually)
 */
function setupTriggers() {
    // 8:30 AM
    ScriptApp.newTrigger("syncToSheets")
        .timeBased()
        .atHour(8)
        .nearMinute(30)
        .everyDays(1)
        .create();

    // 18:30 PM
    ScriptApp.newTrigger("syncToSheets")
        .timeBased()
        .atHour(18)
        .nearMinute(30)
        .everyDays(1)
        .create();
}
