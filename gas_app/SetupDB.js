// ==========================================
// データベース初期構築用スクリプト (SetupDB.gs)
// ==========================================

function setupDatabase() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // シート定義
    var sheetsDef = [
        {
            name: '児童マスタ',
            headers: ['ID', '氏名', 'ふりがな', '学年', '帰宅方法（デフォルト）', 'おやつ（要/不要）', '保護者ID', '認可メール', '備考']
        },
        {
            name: '保護者マスタ',
            headers: ['ID', '保護者氏名', '電話番号', '住所', 'メールアドレス', '児童ID（カンマ区切り）', 'PIN']
        },
        {
            name: '職員マスタ',
            headers: ['氏名', 'メールアドレス', '権限（admin/staff）', '時給', '備考', 'PIN']
        },
        {
            name: '出席記録',
            headers: ['ID', '児童ID', '日付', '氏名', '学年', 'ステータス', '入室時刻', '退室時刻', '予約時間', 'おやつ', '帰宅方法', '帰宅詳細', 'スタッフメモ', '変更申請タイプ', '変更申請値', '変更申請状態']
        },
        {
            name: 'スケジュール予約',
            headers: ['日付', '行事', '開所時間'] // D列以降は児童名
        },
        {
            name: '職員出勤記録',
            headers: ['ID', '職員メール', '日付', '氏名', 'ステータス', 'シフト時間', '出勤時刻', '退勤時刻', '在室合計（分）', '最終入室時刻']
        },
        {
            name: '日報',
            headers: ['ID', '日付', '時刻', 'カテゴリ', '内容', '作成者']
        },
        {
            name: 'おたより',
            headers: ['ID', 'タイトル', 'カテゴリ', 'URL', '日付', '作成日時']
        },
        {
            name: '入金',
            headers: ['ID', '児童ID', '氏名', '報告日時', '金額', 'ステータス', '承認日時']
        },
        {
            name: '利用料計算',
            headers: ['児童ID', '月', '氏名', '出席日数', 'おやつ日数', '基本料金', 'おやつ料金', '合計', '入金累計', '残高']
        },
        {
            name: '設定',
            headers: ['管理者PIN', '基本単価', 'おやつ単価', 'Google Chat Webhook URL', '施設名', '平常時開所時間', '土曜開所時間'],
            initialData: [
                [''], ['0'], ['100'], [''], ['きらきらクラブ'], ['15:00-18:30'], ['7:30-12:00']
            ]
        },
        {
            name: 'リストマスタ',
            headers: ['帰宅方法', 'おたよりカテゴリ', '日報カテゴリ'],
            initialData: [
                ['お迎え', 'お知らせ', '一般'],
                ['バス', 'イベント', '連絡事項'],
                ['自力帰宅', 'その他', 'ヒヤリハット']
            ]
        }
    ];

    for (var i = 0; i < sheetsDef.length; i++) {
        var def = sheetsDef[i];
        var sheet = ss.getSheetByName(def.name);
        if (!sheet) sheet = ss.insertSheet(def.name);

        if (def.headers && def.headers.length > 0) {
            if (def.name === '設定') {
                for (var h = 0; h < def.headers.length; h++) {
                    sheet.getRange(h + 1, 2).setValue(def.headers[h]);
                    if (def.initialData && def.initialData[h] && sheet.getRange(h + 1, 1).getValue() === "") {
                        sheet.getRange(h + 1, 1).setValue(def.initialData[h][0]);
                    }
                }
            } else if (def.name === 'スケジュール予約') {
                sheet.getRange(1, 1, 1, 3).setValues([['日付', '行事', '開所時間']]).setFontWeight('bold').setBackground('#f3f4f6');
                sheet.setFrozenRows(2); sheet.setFrozenColumns(3);
                // 日付の展開ロジックなどは省略（既存データ維持のため）
            } else {
                var headerRange = sheet.getRange(1, 1, 1, def.headers.length);
                headerRange.setValues([def.headers]);
                headerRange.setFontWeight('bold');
                headerRange.setBackground('#f3f4f6');
                sheet.setFrozenRows(1);
            }
        }
    }

    syncScheduleSheetChildren();
    Browser.msgBox('セットアップ/同期が完了しました。');
}

/**
 * 児童マスタからスケジュール予約シートの列を同期する
 * 新しい児童が増えたら右端に追加し、消えたら列を整理する
 */
function syncScheduleSheetChildren() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var master = ss.getSheetByName('児童マスタ');
    var schedule = ss.getSheetByName('スケジュール予約');
    if (!master || !schedule) return { success: false, error: 'Sheet not found' };

    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);

        var masterData = master.getRange(2, 1, Math.max(master.getLastRow() - 1, 1), 2).getValues();
        var scheduleHeaders = schedule.getRange(1, 1, 2, Math.max(schedule.getLastColumn(), 3)).getValues();

        // ID -> Name map from master
        var masterKids = {};
        masterData.forEach(function (row) {
            if (row[0]) masterKids[row[0].toString()] = row[1];
        });

        // Current IDs in schedule sheet (Row 2)
        var currentIds = scheduleHeaders[1].slice(3).map(function (id) { return id ? id.toString() : ""; });

        // 1. 削除された児童の列をクリア（または詰める）
        // シンプルにするため、常に「マスタにある全児童」を右側に並べ直す
        var finalKids = [];
        for (var id in masterKids) {
            finalKids.push({ id: id, name: masterKids[id] });
        }

        // 既存のデータ部分を一時退避して並べ替えるのは複雑なので、
        // 運用上「右端に追加していく」スタイルが望ましいが、リセットを希望されているため
        // データを維持しつつ列を同期するロジックを実装

        if (finalKids.length === 0) return { success: true, count: 0 };

        // 既存列のインデックスを把握
        var idToCol = {};
        currentIds.forEach(function (id, idx) {
            if (id) idToCol[id] = idx + 4; // 1-indexed, starting from D
        });

        // 新しい並び順を決定（既存列を維持しつつ、不足分を追加）
        var newOrder = [];
        var usedIds = {};

        // 既存の並びを尊重（マスタに存在し続けている子）
        currentIds.forEach(function (id) {
            if (id && masterKids[id]) {
                newOrder.push({ id: id, name: masterKids[id] });
                usedIds[id] = true;
            }
        });

        // 新しく増えた子を追加
        finalKids.forEach(function (kid) {
            if (!usedIds[kid.id]) {
                newOrder.push(kid);
            }
        });

        // スケジュールシートの1行目(名前)と2行目(ID)を書き込み
        var headerNames = newOrder.map(function (k) { return k.name; });
        var headerIds = newOrder.map(function (k) { return k.id; });

        // 列が足りない場合は挿入、多い場合は（念のため）クリア
        var targetColCount = newOrder.length;
        var currentColCount = schedule.getLastColumn() - 3;

        if (targetColCount > 0) {
            schedule.getRange(1, 4, 1, targetColCount).setValues([headerNames]).setFontWeight('bold').setBackground('#f3f4f6');
            schedule.getRange(2, 4, 1, targetColCount).setValues([headerIds]).setFontColor('#94a3b8').setFontSize(8);

            // 余分な列があればクリア
            if (currentColCount > targetColCount) {
                schedule.getRange(1, 4 + targetColCount, 2, currentColCount - targetColCount).clearContent().setBackground(null);
            }
        }

        return { success: true, count: newOrder.length };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.toString() };
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
}
