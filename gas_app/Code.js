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
    var page = e.parameter.page;
    // セキュリティ修正: URLのemailパラメータによるキャッシュ上書きを廃止
    // セッションはPIN認証時のみキャッシュに保存される

    var user = getCurrentUser();

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
    template.baseUrl = ScriptApp.getService().getUrl();
    template.urlParams = e.parameter;
    template.loginError = loginError;
    template.systemSettings = getSettings();

    try {
        return template.evaluate()
            .setTitle('きらきら放課後児童クラブ')
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

function getCurrentUser(forcedEmail, skipSessionCheck) {
    var userCache = CacheService.getUserCache();

    // Determine target email: forced > cached > session
    var rawEmail = forcedEmail || userCache.get("current_user_email") || Session.getActiveUser().getEmail();
    var email = rawEmail ? rawEmail.toString().trim() : '';

    // emailが取得できない場合のみunknownを返す
    if (!email || email === '') {
        return { email: '', role: 'unknown', name: '未ログイン', pin: '' };
    }

    var cached = userCache.get("current_user_v5_" + email);
    var user = cached ? JSON.parse(cached) : null;

    if (!user) {
        var db = getDB();
        user = {
            email: email,
            role: 'unknown',
            name: '未登録ユーザー',
            pin: ''
        };

        // 1. Check if Admin/Staff
        var staffSheet = db.getSheetByName('職員マスタ');
        if (staffSheet) {
            var staffData = staffSheet.getDataRange().getValues();
            for (var i = 1; i < staffData.length; i++) {
                var sEmail = staffData[i][1] ? staffData[i][1].toString().trim() : ''; // 厳格に比較
                if (sEmail === email) { // B列: email
                    user = {
                        email: email,
                        name: staffData[i][0] || '職員',
                        role: (staffData[i][2] || '').toString().trim() === 'admin' ? 'admin' : 'staff',
                        pin: staffData[i][5] ? staffData[i][5].toString() : '' // F列: PIN
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
                    var pEmail = parentData[j][4] ? parentData[j][4].toString().trim() : '';
                    if (pEmail === email) { // E列: email
                        user = {
                            email: email,
                            name: parentData[j][1] || '保護者',
                            role: 'parent',
                            pin: parentData[j][6] ? parentData[j][6].toString() : '' // G列: PIN
                        };
                        break;
                    }
                }
            }
        }
        console.log("User lookup result for [" + email + "]: " + JSON.stringify(user));
        // Cache results for 1 hour
        userCache.put("current_user_v5_" + email, JSON.stringify(user), 3600);
    }

    // --- SECURITY CHECK for all registered roles ---
    if (user.role !== 'unknown' && !skipSessionCheck) {
        var isVerified = userCache.get("verified_session_" + email);
        if (!isVerified) {
            // 暗証番号認証が済んでいない場合は、権限を剥奪して「未ログイン」扱いにする
            console.warn("Security Check: Unverified session for " + email);
            user.role = 'unknown';
            user.name = '(要認証) ' + user.name;
        }
    }

    return user;
}

/**
 * フロントエンドからのメールアドレス認証用
 */
function checkUserStatus(email) {
    if (!email) return { success: false, error: 'メールアドレスを入力してください。' };
    var cleanEmail = email.toString().trim();

    // 確実に最新のスプレッドシート情報を反映するため、個人別のキャッシュを一度クリア
    CacheService.getUserCache().remove("current_user_v5_" + cleanEmail);
    console.log("checkUserStatus: Cleared cache for '" + cleanEmail + "' before lookup.");

    // Identity lookup should SKIP session check to see the real role
    var user = getCurrentUser(cleanEmail, true);
    if (user.role === 'unknown') {
        console.log("checkUserStatus: User '" + cleanEmail + "' found as unknown, no PIN required.");
        return { success: true, user: user, requiresPin: false };
    }

    var needsPinSetup = !user.pin;
    return { success: true, user: user, requiresPin: true, needsPinSetup: needsPinSetup };
}

/**
 * 暗証番号の検証
 */
function verifyUserPin(email, pin) {
    if (!email || !pin) return { success: false, error: '入力内容を確認してください。' };
    var cleanEmail = email.toString().trim();

    // キャッシュをクリアして最新データで照合する
    CacheService.getUserCache().remove("current_user_v5_" + cleanEmail);

    // Identity lookup should SKIP session check to see the real role for verification
    var user = getCurrentUser(cleanEmail, true);
    if (user.role === 'unknown') return { success: false, error: 'ユーザーが見つかりません。' };

    if (user.pin && pin.toString() === user.pin.toString()) {
        var userCache = CacheService.getUserCache();
        userCache.put("current_user_email", cleanEmail, 21600);
        userCache.put("verified_session_" + cleanEmail, "true", 21600); // 6 hours
        // 認証成功: PINを除いたユーザー情報を返す
        return { success: true, user: { email: user.email, name: user.name, role: user.role } };
    } else {
        console.warn("PIN verification failed for " + cleanEmail + ". Input: " + pin + ", Expected: " + user.pin);
        return { success: false, error: '暗証番号が正しくありません。' };
    }
}

/**
 * PINを設定または更新する
 */
function updateUserPin(email, newPin) {
    if (!email || !newPin) return { success: false, error: '入力が不足しています。' };
    if (newPin.length < 4) return { success: false, error: '暗証番号は4桁以上で設定してください。' };
    var cleanEmail = email.toString().trim();

    var db = getDB();
    var found = false;

    // 1. 職員マスタ
    var staffSheet = db.getSheetByName('職員マスタ');
    if (staffSheet) {
        var data = staffSheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
            var sEmail = data[i][1] ? data[i][1].toString().trim() : '';
            if (sEmail === cleanEmail) {
                staffSheet.getRange(i + 1, 6).setValue(newPin.toString()); // F列
                found = true;
                break;
            }
        }
    }

    // 2. 保護者マスタ
    if (!found) {
        var parentSheet = db.getSheetByName('保護者マスタ');
        if (parentSheet) {
            var data = parentSheet.getDataRange().getValues();
            for (var j = 1; j < data.length; j++) {
                var pEmail = data[j][4] ? data[j][4].toString().trim() : '';
                if (pEmail === cleanEmail) {
                    parentSheet.getRange(j + 1, 7).setValue(newPin.toString()); // G列
                    found = true;
                    break;
                }
            }
        }
    }

    if (found) {
        // キャッシュクリアして再読込を促す
        var userCache = CacheService.getUserCache();
        userCache.remove("current_user_v5_" + cleanEmail);
        userCache.put("verified_session_" + cleanEmail, "true", 21600); // 6 hours
        return { success: true };
    }

    return { success: false, error: 'ユーザーが見つかりません。' };
}

/**
 * ログアウト/キャッシュクリア
 */
function logout() {
    var userCache = CacheService.getUserCache();
    var email = userCache.get("current_user_email");
    userCache.remove("current_user_email");
    if (email) {
        userCache.remove("verified_session_" + email);
        userCache.remove("current_user_v5_" + email);
    }
    return { success: true };
}

/**
 * 手動でキャッシュをクリアするAPI
 * 職員マスタに追加直後のログイン失敗などを解消するために使用
 */
function clearUserCache() {
    var userCache = CacheService.getUserCache();
    var email = userCache.get("current_user_email");
    if (email) {
        userCache.remove("current_user_v5_" + email);
        userCache.remove("verified_session_" + email);
    }
    userCache.remove("current_user_email");
    return { success: true };
}

/**
 * 登録申請を管理者に通知する（Google Chat Webhookなど）
 */
function sendRegistrationRequest() {
    var user = Session.getActiveUser().getEmail();
    var settings = getSettings();
    var webhookUrl = settings.webhookUrl;

    if (!webhookUrl) {
        console.warn("Registration request from " + user + ", but Webhook URL is not set.");
        return {
            success: true,
            message: '申請を受け付けました。管理者へ通知設定（Webhook）が完了していないため、直接管理者に「' + user + 'の登録をお願いします」と伝えていただけるとスムーズです。'
        };
    }

    var payload = {
        "text": "🆕 *利用登録申請*\n申請者: " + user + "\nこのユーザーの登録（職員または保護者マスタへの追加）が必要です。"
    };

    return sendWebhook(webhookUrl, payload);
}

/**
 * 汎用Webhook送信ヘルパー (エラーログ機能付き)
 */
function sendWebhook(url, payload) {
    if (!url) return { success: false, error: 'Webhook URLが設定されていません' };
    var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
    };

    try {
        var response = UrlFetchApp.fetch(url, options);
        var code = response.getResponseCode();
        if (code >= 200 && code < 300) {
            return { success: true };
        } else {
            console.error("Webhook failed. Code: " + code + ", Response: " + response.getContentText());
            return { success: false, error: "HTTP " + code };
        }
    } catch (e) {
        console.error("Webhook error: " + e.toString());
        return { success: false, error: e.toString() };
    }
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

/**
 * セキュリティヘルパー: 指定された児童が現在のユーザー（保護者）に紐付いているか確認する
 * 管理者・職員の場合は常に true を返す
 */
function isChildLinkedToUser(childId) {
    var user = getCurrentUser();
    if (user.role === 'admin' || user.role === 'staff') return true;
    if (user.role !== 'parent') return false;

    var children = getLinkedChildren(user.email);
    return children.some(function (c) { return c.id.toString() === childId.toString(); });
}

// ==========================================
// Settings & Config API
// ==========================================

function getSettings() {
    var db = getDB();
    var sheet = db.getSheetByName('設定');
    var listSheet = db.getSheetByName('リストマスタ');
    if (!sheet) return {};

    // Get lists from 'リストマスタ' sheet if available
    var returnMethods = [];
    var docCategories = [];
    var memoCategories = [];

    if (listSheet) {
        var listData = listSheet.getDataRange().getValues();
        for (var i = 1; i < listData.length; i++) {
            if (listData[i][0]) returnMethods.push(listData[i][0].toString());
            if (listData[i][1]) docCategories.push(listData[i][1].toString());
            if (listData[i][2]) memoCategories.push(listData[i][2].toString());
        }
    }

    // Fallback if list sheet is empty or not found
    if (returnMethods.length === 0) {
        returnMethods = (sheet.getRange('A8').getValue() || "").toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (docCategories.length === 0) {
        docCategories = (sheet.getRange('A9').getValue() || "").toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (memoCategories.length === 0) {
        memoCategories = (sheet.getRange('A10').getValue() || "").toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    return {
        baseFee: sheet.getRange('A2').getValue(),
        snackFee: sheet.getRange('A3').getValue(),
        webhookUrl: sheet.getRange('A4').getValue(),
        facilityName: sheet.getRange('A5').getValue(),
        openWeekday: sheet.getRange('A6').getValue(),
        openSaturday: sheet.getRange('A7').getValue(),
        returnMethods: returnMethods.length > 0 ? returnMethods : ['お迎え', 'バス'],
        docCategories: docCategories.length > 0 ? docCategories : ['お知らせ', 'イベント', 'その他'],
        memoCategories: memoCategories.length > 0 ? memoCategories : ['連絡事項', '健康状態', 'その他']
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
