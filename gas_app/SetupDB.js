// ==========================================
// データベース初期構築用スクリプト (SetupDB.gs)
// ==========================================
// 使い方: 
// 1. 新規スプレッドシートを作成し、拡張機能 > Apps Script を開く
// 2. このコードを貼り付け、上の実行ボタンで「setupDatabase」を実行する
// 3. 全てのシートとヘッダーが自動で作成・設定されます。実行後はこのファイルを削除して構いません。

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
            headers: ['ID', '保護者氏名', '電話番号', '住所', 'メールアドレス', '児童ID（カンマ区切り）']
        },
        {
            name: '職員マスタ',
            headers: ['氏名', 'メールアドレス', '権限（admin/staff）', '時給', '備考']
        },
        {
            name: '出席記録',
            headers: ['ID', '児童ID', '日付', '氏名', '学年', 'ステータス', '入室時刻', '退室時刻', '予約時間', 'おやつ', '帰宅方法', '帰宅詳細', 'スタッフメモ', '変更申請タイプ', '変更申請値', '変更申請状態']
        },
        {
            name: '予約',
            headers: ['ID', '児童ID', '日付', '時間', 'ステータス', 'おやつ', '申請日時']
        },
        {
            name: '職員出勤記録',
            headers: ['ID', '職員メール', '日付', '氏名', 'ステータス', 'シフト時間', '出勤時刻', '退勤時刻']
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
            headers: ['管理者PIN', '基本単価', 'おやつ単価', 'Google Chat Webhook URL', '施設名'],
            initialData: [
                ['1234'],         // A1
                [500],            // A2
                [100],            // A3
                [''],             // A4
                ['きらきらクラブ'] // A5
            ]
        }
    ];

    for (var i = 0; i < sheetsDef.length; i++) {
        var def = sheetsDef[i];
        var sheet = ss.getSheetByName(def.name);

        // シートが存在しなければ作成
        if (!sheet) {
            sheet = ss.insertSheet(def.name);
        }

        // ヘッダーを設定
        if (def.headers && def.headers.length > 0) {
            if (def.name === '設定') {
                // 設定シートは縦に並べる特殊フォーマット
                for (var h = 0; h < def.headers.length; h++) {
                    sheet.getRange(h + 1, 2).setValue(def.headers[h]); // B列に説明
                    if (def.initialData && def.initialData[h]) {
                        sheet.getRange(h + 1, 1).setValue(def.initialData[h][0]); // A列に初期値
                    }
                }
                sheet.setColumnWidth(1, 200);
                sheet.setColumnWidth(2, 300);
            } else {
                // 通常のテーブルシート
                var headerRange = sheet.getRange(1, 1, 1, def.headers.length);
                headerRange.setValues([def.headers]);
                headerRange.setFontWeight('bold');
                headerRange.setBackground('#f3f4f6');
                sheet.setFrozenRows(1); // 1行目を固定
            }
        }
    }

    // デフォルトの「シート1」などが残っていれば削除（マスタを作成した後）
    var allSheets = ss.getSheets();
    for (var j = 0; j < allSheets.length; j++) {
        var sName = allSheets[j].getName();
        var isRequired = sheetsDef.some(function (d) { return d.name === sName; });
        if (!isRequired && allSheets.length > 1) {
            ss.deleteSheet(allSheets[j]);
        }
    }

    // 利用料計算シートへのデフォルト数式のセット例 (A2セルにIDを手動入力前提)
    // セルC2:J2に自動計算用の数式をセット
    var calcSheet = ss.getSheetByName('利用料計算');
    if (calcSheet) {
        if (calcSheet.getLastRow() === 1) {
            // 2行目にサンプルの数式を入れておく
            calcSheet.getRange('A2').setValue('child_1');
            calcSheet.getRange('B2').setValue('2026-04');
            calcSheet.getRange('C2').setFormula('=IFERROR(VLOOKUP(A2,\'児童マスタ\'!A:B,2,FALSE),"")');
            calcSheet.getRange('D2').setFormula('=COUNTIFS(\'出席記録\'!B:B, A2, \'出席記録\'!C:C, ">=" & B2 & "-01", \'出席記録\'!C:C, "<=" & EOMONTH(B2 & "-01", 0), \'出席記録\'!F:F, "<>欠席")');
            calcSheet.getRange('E2').setFormula('=COUNTIFS(\'出席記録\'!B:B, A2, \'出席記録\'!C:C, ">=" & B2 & "-01", \'出席記録\'!C:C, "<=" & EOMONTH(B2 & "-01", 0), \'出席記録\'!J:J, TRUE)');
            calcSheet.getRange('F2').setFormula('=D2 * \'設定\'!A2');
            calcSheet.getRange('G2').setFormula('=E2 * \'設定\'!A3');
            calcSheet.getRange('H2').setFormula('=F2 + G2');
            calcSheet.getRange('I2').setFormula('=SUMIFS(\'入金\'!E:E, \'入金\'!B:B, A2, \'入金\'!F:F, "confirmed")');
            calcSheet.getRange('J2').setFormula('=H2 - I2');
        }
    }

    Browser.msgBox('データベースのセットアップが完了しました！');
}
