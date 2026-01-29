function myFunction() {
    // --- 設定ここから ---
    const SHEET_NAME = "kirakira-app"; // データを書き込むシート名

    // サービスアカウントキー (JSON)
    // 注意: `const PRIVATE_KEY_JSON = ...` の形式で定義してください。
    const PRIVATE_KEY_JSON = `
{
  "type": "service_account",
  "project_id": "kirakira-app-cc454",
  "private_key_id": "e2f7f248dcbee6d5698633abccb81f04ee7ca485",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCkkn2OXEMaAyKn\\nCWHa00iJG7IxbqMLRhecorxqNt6EgLshgpmZ8Iwbr6uv93EAAXAujTfmG0lDYu/u\\nr1YyHj7EM/xv97k4bHY4MC3XrGsOkBrMwSKaBntemmU40cZJNWkuazGLN7LMmlvk\\n8faRPZ0bheaVfw5VuGIRNH1OmUakx/rWqicjjIgoUXlJ00iyzEstZVhKmk5FDqFk\\n2RA8/wRbjknrpXdk2g5hrU7Yfjak3kEAIB4QHVdW8iOn2nWwrib3JOdMcz5ljmVo\\nAgOcKwQB7CPXOomOvqNHm6qoN0fkccfnZ2XwfqGKNtsCAcWAvga6IYPv6yRx4dnh\\nAtbMOp8lAgMBAAECggEAFbGVyXFSCxjEtZ4f/xeA5Un4WFnMNk08CZLOIXYwKOlL\\nQaSUmN1DqtaiXCTTCXwnDIvjBXstUiu1kxIb26lu/rAXo67VBKIPh2KaeGarChVm\\n4vzGkeUu2A6kLzQ/3iCjR9Irir2B3USvvmNC7GxhzGH/Pk+sVRJkIv53UigUTt4z\\niXoWGB3SUUv8P65lXhrXNDyLoHtQdIDISgH3si7ViM2VS2pg7IrMjnRjVM0SYjTP\\nkDqJ6pf1n/D4hT2aM21AfsVi3SwrKevBkCglXJ6lBQly6rEVWwhxkOyMzO4EwWOU\\n3RGS8eyLQ37qEl5jN1M1MhVZuVOEU+KMnkKWnKEIoQKBgQDSyJXv9M7Bc3rOKKQO\\niLsx5Gd3bDoFOOAlp7ioBk7NfGniHJYcsn6B6TP0jav7VwNfjWSeu2t4cI5qRPH2\\nc/i75JPaDJtVKMivBTwURum3m/koCc1+41r7cpLMeQlLOQ46XBrVpULiAuWp1mjY\\nheKovKpLOX9AvdVP3taMP9y83QKBgQDH4Cis0d+xdLu3QmnmMvNWiMySsiK9Rhtv\\nehbI/aEFXZU+y/VL+K9gse8mhIjTOX3HyOb+kj8Q1aiqpwfss2fAl8VOP211jBo2\\nKonLRstAQhRK44/UWUCcj4qrOxj08+uuALE6DAL3NTpyWsoKPHtIBfvdZKCHLU+k\\nn+dWwC0C6QKBgQDRtzre3K5dcP0NYwgfYdEGCd8bxbVQfs8dB+vEWUpMTm22x4Rf\\nFwShUpobxl0HnAJCLpafC5AY67v2ZZRsBeTDZN/qAcMGjqZk5ItrDUb6JJhYSrCH\\nf8OFC/CcugwSKLlMPVmBmYSbBBDm0unMDCGAiv3QDGvcyUMTzX2fWubPjQKBgQCy\\n4j3FHjiTu6PdSgU5T1RVmC1vBRruRvZ6+Mu3qrcX9D+EaknpanKbmeQtluRWFtgp\\nm/aQ1Ba5XF+OC9udzpsG1U5yz3WJhJBY9g1I7t0tb3Z15+Br7k1TUWyL/2JAqKW/\\nn0L+bo2g7fSXMAYuzx6OwTw/UrYRBU6IScxj6a7fMQKBgDgAub8o2HS+pLjVjk7u\\nFobWcYtGEfRYtVhf0Qvnjkrp4gOx478sY+kvjpLn3Dqw27L4ZhQtUC8YlZYSrbxK\\nA3wfdNBycdv9HxkwQ+fyZF9QRlIsmT24zvlwvzo+KaoD+lThnkoWs6uR27OUdIvx\\ni3i8INknKImyzd3I9wgSK6yS\\n-----END PRIVATE KEY-----\\n",
  "client_email": "firebase-adminsdk-fbsvc@kirakira-app-cc454.iam.gserviceaccount.com",
  "client_id": "116401393134833874408",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40kirakira-app-cc454.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
`;
    // --- 設定ここまで ---

    function getFirestore() {
        const json = JSON.parse(PRIVATE_KEY_JSON);
        return FirestoreApp.getFirestore(json.client_email, json.private_key, json.project_id);
    }

    function onOpen() {
        SpreadsheetApp.getUi()
            .createMenu('キラキラ連携')
            .addItem('データ同期を実行', 'syncChildrenData')
            .addToUi();
    }

    function syncChildrenData() {
        const firestore = getFirestore();
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

        if (!sheet) {
            Browser.msgBox("エラー: シート '" + SHEET_NAME + "' が見つかりません。");
            return;
        }

        try {
            // コレクション名 'children' を取得
            const allDocs = firestore.getDocuments("children");

            const header = ["ID", "学年", "クラス", "氏名", "かな", "帰宅方法"];

            const rows = [];
            for (const doc of allDocs) {
                const data = doc.fields;

                // Firestore REST APIのレスポンス形式 (stringValue, integerValue 等) に対応
                rows.push([
                    doc.name.split("/").pop(), // ドキュメントID
                    data.grade && data.grade.integerValue ? data.grade.integerValue : (data.grade && data.grade.stringValue ? data.grade.stringValue : ""),
                    data.className && data.className.stringValue ? data.className.stringValue : "",
                    data.name && data.name.stringValue ? data.name.stringValue : "",
                    data.kana && data.kana.stringValue ? data.kana.stringValue : "",
                    data.defaultReturnMethod && data.defaultReturnMethod.stringValue ? data.defaultReturnMethod.stringValue : ""
                ]);
            }

            // シートをクリアして書き込み
            sheet.clear();
            sheet.getRange(1, 1, 1, header.length).setValues([header]).setBackground("#f3f4f6").setFontWeight("bold");
            if (rows.length > 0) {
                sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
            }

            const msg = "同期完了: " + rows.length + "件";
            console.log(msg);
            Browser.msgBox(msg);

        } catch (e) {
            Browser.msgBox("エラーが発生しました: " + e.toString());
            console.error(e);
        }
    }
}
