// ==========================================
// KiraKira Manager - GAS Backend (Ver 3.1.2)
// ==========================================

// --- Configuration ---
// The script is bound to the Spreadsheet, so we use SpreadsheetApp.getActiveSpreadsheet()
function getDB() {
    return SpreadsheetApp.getActiveSpreadsheet();
}

// --- Entry Point (Routing) ---
function doGet(e) {
    var user = getCurrentUser();
    var page = e.parameter.page;

    // Server-side Routing logic
    if (!page) {
        if (user.role === 'admin' || user.role === 'staff') {
            page = 'admin';
        } else if (user.role === 'parent') {
            page = 'parent';
        } else {
            page = 'login';
        }
    }

    var template;
    if (page === 'admin') {
        template = createTemplate('pages/admin-dashboard');
    } else if (page === 'parent') {
        template = createTemplate('pages/parent-home');
    } else {
        template = createTemplate('pages/login');
    }

    // Pass user and URL parameters to the template
    template.user = user;
    template.urlParams = e.parameter;

    return template.evaluate()
        .setTitle('きらきらマネージャー')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Global cache for include contents within one execution
var _includeCache = {};

// --- Includes ---
function include(filename) {
    if (_includeCache[filename]) return _includeCache[filename];

    // For style pages, we don't need scriptlet evaluation
    if (filename.indexOf('style') !== -1) {
        try {
            var content = HtmlService.createHtmlOutputFromFile(filename).getContent();
            _includeCache[filename] = content;
            return content;
        } catch (e) { /* fallback to template below */ }
    }

    var content = createTemplate(filename).evaluate().getContent();
    _includeCache[filename] = content;
    return content;
}

// Helper for Robust Template Creation
function createTemplate(filename) {
    try {
        return HtmlService.createTemplateFromFile(filename);
    } catch (e) {
        // Fallback: if 'pages/xyz' fails, try 'xyz'
        if (filename.indexOf('/') !== -1) {
            var flatName = filename.split('/').pop();
            try {
                return HtmlService.createTemplateFromFile(flatName);
            } catch (e2) {
                throw new Error("HTMLファイルが見つかりません: " + filename + " (" + flatName + ")");
            }
        }
        throw e;
    }
}

// ==========================================
// User & Auth API
// ==========================================

function getCurrentUser() {
    var userCache = CacheService.getUserCache();
    var cached = userCache.get("current_user_v2");
    if (cached) return JSON.parse(cached);

    var email = Session.getActiveUser().getEmail();
    if (!email) email = 'test@example.com';

    var db = getDB();
    var user = {
        email: email,
        role: 'unknown',
        name: '未登録ユーザー'
    };

    // 1. Check if Admin/Staff
    var staffSheet = db.getSheetByName('職員マスタ');
    if (staffSheet) {
        var staffData = staffSheet.getDataRange().getValues();
        for (var i = 1; i < staffData.length; i++) {
            if (staffData[i][1] === email) { // B列: email
                user = {
                    email: email,
                    name: staffData[i][0] || '職員',
                    role: staffData[i][2] === 'admin' ? 'admin' : 'staff'
                };
                break;
            }
        }
    }

    // 2. Check if Parent
    if (user.role === 'unknown') {
        var parentSheet = db.getSheetByName('保護者マスタ');
        if (parentSheet) {
            var parentData = parentSheet.getDataRange().getValues();
            for (var j = 1; j < parentData.length; j++) {
                if (parentData[j][4] === email) { // E列: email
                    user = {
                        email: email,
                        name: parentData[j][1] || '保護者',
                        role: 'parent'
                    };
                    break;
                }
            }
        }
    }

    // Cache results for 1 hour (3600 seconds)
    userCache.put("current_user_v2", JSON.stringify(user), 3600);
    return user;
}

function getLinkedChildren(parentEmail) {
    var db = getDB();
    var parentSheet = db.getSheetByName('保護者マスタ');
    var childSheet = db.getSheetByName('児童マスタ');

    if (!parentSheet || !childSheet) return [];

    // Find parent's linked child IDs
    var parentData = parentSheet.getDataRange().getValues();
    var linkedChildIdsStr = "";
    for (var i = 1; i < parentData.length; i++) {
        if (parentData[i][4] === parentEmail) {
            linkedChildIdsStr = parentData[i][5] || ""; // F列: 児童ID (カンマ区切り)
            break;
        }
    }

    if (!linkedChildIdsStr) return [];
    var childIds = linkedChildIdsStr.split(',').map(function (id) { return id.trim(); });

    // Get child details
    var childData = childSheet.getDataRange().getValues();
    var children = [];

    for (var j = 1; j < childData.length; j++) {
        var id = childData[j][0] ? childData[j][0].toString() : '';
        if (childIds.indexOf(id) !== -1) {
            children.push({
                id: id,
                name: childData[j][1],
                grade: childData[j][3],
                defaultReturnMethod: childData[j][4],
                hasSnack: childData[j][5] === true || childData[j][5] === 'TRUE' || childData[j][5] === '要'
            });
        }
    }

    return children;
}

// ==========================================
// Settings & Config API
// ==========================================

function getSettings() {
    var db = getDB();
    var sheet = db.getSheetByName('設定');
    if (!sheet) return {};

    return {
        adminPin: sheet.getRange('A1').getValue(),
        baseFee: sheet.getRange('A2').getValue() || 500,
        snackFee: sheet.getRange('A3').getValue() || 100,
        webhookUrl: sheet.getRange('A4').getValue(),
        facilityName: sheet.getRange('A5').getValue() || 'きらきら放課後児童クラブ'
    };
}

// ==========================================
// Alert API (Google Chat Webhook)
// ==========================================

function sendPickupAlert(childName) {
    var settings = getSettings();
    var webhookUrl = settings.webhookUrl;

    if (!webhookUrl) {
        console.error("Webhook URL is not set in settings.");
        return { success: false, error: 'Webhook URL未設定' };
    }

    var now = new Date();
    var timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');

    var payload = {
        "text": "🔔 *お迎え呼び出し*\n児童名: " + childName + " さん\n時刻: " + timeStr
    };

    var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
    };

    try {
        var response = UrlFetchApp.fetch(webhookUrl, options);
        Logger.log(response.getContentText());
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    }
}
