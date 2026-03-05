// ==========================================
// KiraKira Manager - GAS Backend (Ver 3.2.0)
// ==========================================

var APP_VERSION = '3.2.0';

// --- Configuration ---
function getDB() {
    return SpreadsheetApp.getActiveSpreadsheet();
}

// --- Authorization Helper ---
function requireRole(allowedRoles) {
    var user = getCurrentUser();
    if (allowedRoles.indexOf(user.role) === -1) {
        throw new Error('権限がありません (' + user.role + ')');
    }
    return user;
}

// --- Date Helper ---
function formatDateStr(value) {
    if (!value) return '';
    if (value instanceof Date) {
        return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy-MM-dd');
    }
    return value.toString();
}

// --- Entry Point (Routing) ---
function doGet(e) {
    var user = getCurrentUser();
    var page = e.parameter.page;

    // Clear cache to avoid role mismatches
    if (!page) {
        CacheService.getUserCache().remove("current_user_v2");
        user = getCurrentUser(); // Re-fetch
    }

    // Default: Show Login Portal
    if (!page) {
        page = 'login';
    }

    var adminPages = ['admin', 'finance', 'documents', 'children', 'settings', 'reservations'];
    var isAdmin = (user.role === 'admin' || user.role === 'staff');

    // Permission Guard
    var loginError = null;
    if (adminPages.indexOf(page) !== -1 && !isAdmin) {
        loginError = '職員権限がありません。';
        page = 'login';
    }
    if (page === 'parent' && user.role === 'unknown') {
        loginError = '保護者として登録されていません。';
        page = 'login';
    }

    var template;
    if (page === 'admin') {
        template = createTemplate('pages/admin-dashboard');
    } else if (page === 'parent') {
        template = createTemplate('pages/parent-home');
    } else if (page === 'finance') {
        template = createTemplate('pages/admin-finance');
    } else if (page === 'documents') {
        template = createTemplate('pages/admin-documents');
    } else if (page === 'children') {
        template = createTemplate('pages/admin-children');
    } else if (page === 'settings') {
        template = createTemplate('pages/admin-settings');
    } else if (page === 'reservations') {
        template = createTemplate('pages/admin-reservations');
    } else {
        template = createTemplate('pages/login');
    }

    // Pass user and URL parameters to the template
    template.user = user;
    template.urlParams = e.parameter;
    template.loginError = loginError;

    try {
        return template.evaluate()
            .setTitle('きらきらマネージャー')
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } catch (err) {
        return HtmlService.createHtmlOutput('<h1>ページ表示エラー</h1><p>' + err.toString() + '</p><p>Page: ' + page + '</p><p>Role: ' + user.role + '</p>');
    }
}


// Global cache for include contents within one execution
var _includeCache = {};

// --- Includes ---
function include(filename, data) {
    if (_includeCache[filename] && !data) return _includeCache[filename];

    // For style pages, we don't need scriptlet evaluation
    if (filename.indexOf('style') !== -1) {
        try {
            var content = HtmlService.createHtmlOutputFromFile(filename).getContent();
            _includeCache[filename] = content;
            return content;
        } catch (e) { /* fallback to template below */ }
    }

    var template = createTemplate(filename);
    if (data) {
        for (var key in data) {
            template[key] = data[key];
        }
    }
    try {
        var content = template.evaluate().getContent();
        if (!data) _includeCache[filename] = content;
        return content;
    } catch (err) {
        return '<div style="background:#fee2e2; border:1px solid #ef4444; padding:10px; color:#991b1b; margin:10px 0;">' +
            '<strong>Include Error (' + filename + '):</strong> ' + err.toString() + '</div>';
    }
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

    // Verify user role
    var currentUser = getCurrentUser();
    var isAdmin = (currentUser.role === 'admin' || currentUser.role === 'staff');

    // Find parent's linked child IDs
    var parentData = parentSheet.getDataRange().getValues();
    var linkedChildIdsStr = "";

    // If admin, we don't need to filter by email (optional: return all)
    // For now, let's say admins see all children to test the UI.
    if (!isAdmin) {
        for (var i = 1; i < parentData.length; i++) {
            if (parentData[i][4] === parentEmail) {
                linkedChildIdsStr = parentData[i][5] || ""; // F列: 児童ID (カンマ区切り)
                break;
            }
        }
    }

    // Get child details
    var childData = childSheet.getDataRange().getValues();
    var children = [];
    var childIds = linkedChildIdsStr ? linkedChildIdsStr.split(',').map(function (id) { return id.trim(); }) : [];

    for (var j = 1; j < childData.length; j++) {
        var id = childData[j][0] ? childData[j][0].toString() : '';
        if (isAdmin || childIds.indexOf(id) !== -1) {
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
