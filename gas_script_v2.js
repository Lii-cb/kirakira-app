function myFunction() {
    // --- 設定ここから ---
    const SHEET_NAME = "kirakira-app";

    // サービスアカウントキー (JSON)
    // v1と同じものをそのまま使ってください
    const PRIVATE_KEY_JSON = `
{
  "type": "service_account",
  "project_id": "kirakira-app-cc454",
  "private_key_id": "e2f7f248dcbee6d5698633abccb81f04ee7ca485",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCkkn2OXEMaAyKn\\nCWHa00iJG7IxbqMLRhecorxqNt6EgLshgpmZ8Iwbr6uv93EAAXAujTfmG0lDYu/u\\nr1YyHj7EM/xv97k4bHY4MC3XrGsOkBrMwSKaBntemmU40cZJNWkuazGLN7LMmlvk\\n8faRPZ0bheaVfw5VuGIRNH1OmUakx/rWqicjjIgoUXlJ00iyzEstZVhKmk5FDqFk\\n2RA8/wRbjknrpXdk2g5hrU7Yfjak3kEAIB4QHVdW8iOn2nWwrib3JOdMcz5ljmVo\\nAgOcKwQB7CPXOomOvqNHm6qoN0fkccfnZ2XwfqGKNtsCAcWAvga6IYPv6yRx4dnh\\nAtbMOp8lAgMBAAECggEAFbGVyXFSCxjEtZ4f/xeA5Un4WFnMNk08CZLOIXYwKOlL\\nQaSUmN1DqtaiXCTTCXwnDIvjBXstUiu1kxIb26lu/rAXo67VBKIPh2KaeGarChVm\\n4vzGkeUu2A6kLzQ/3iCjR9Irir2B3USvvmNC7GxhzGH/Pk+sVRJkIv53UigUTt4z\\niXoWGB3SUUv8P65lXhrXNDyLoHtQdIDISgH3si7ViM2VS2pg7IrMjnRjVM0SYjTP\\nkDqJ6pf1n/D4hT2aM21AfsVi3SwrKevBkCglXJ6lBQly6rEVWwhxkOyMzO4EwWOU\\n3RGS8eyLQ37qEl5jN1M1MhVZuVOEU+KMnkKWnKEIoQKBgQDSyJXv9M7Bc3rOKKQO\\niLsx5Gd3bDoFOOAlp7ioBk7NfGniHJYcsn6B6TP0jav7VwNfjWSeu2t4cI5qRPH2\\nc/i75JPaDJtVKMivBTwURum3m/koCc1+41r7cpLMeQlLOQ46XBrVpULiAuWp1mjY\\nheKovKpLOX9AvdVP3taMP9y83QKBgQDH4Cis0d+xdLu3QmnmMvNWiMySsiK9Rhtv\\nehbI/aEFXZU+y/VL+K9gse8mhIjTOX3HyOb+kj8Q1aiqpwfss2fAl8VOP211jBo2\\nKonLRstAQhRK44/UWUCcj4qrOxj08+uuALE6DAL3NTpyWsoKPHtIBfvdZKCHLU+k\\nn+dWwC0C6QKBgQDRtzre3K5dcP0NYwgfYdEGCd8bxbVQfs8dB+vEWUpMTm22x4Rf\nFwShUpobxl0HnAJCLpafC5AY67v2ZZRsBeTDZN/qAcMGjqZk5ItrDUb6JJhYSrCH\\nf8OFC/CcugwSKLlMPVmBmYSbBBDm0unMDCGAiv3QDGvcyUMTzX2fWubPjQKBgQCy\\n4j3FHjiTu6PdSgU5T1RVmC1vBRruRvZ6+Mu3qrcX9D+EaknpanKbmeQtluRWFtgp\\nm/aQ1Ba5XF+OC9udzpsG1U5yz3WJhJBY9g1I7t0tb3Z15+Br7k1TUWyL/2JAqKW/\\nn0L+bo2g7fSXMAYuzx6OwTw/UrYRBU6IScxj6a7fMQKBgDgAub8o2HS+pLjVjk7u\\nFobWcYtGEfRYtVhf0Qvnjkrp4gOx478sY+kvjpLn3Dqw27L4ZhQtUC8YlZYSrbxK\\nA3wfdNBycdv9HxkwQ+fyZF9QRlIsmT24zvlwvzo+KaoD+lThnkoWs6uR27OUdIvx\\ni3i8INknKImyzd3I9wgSK6yS\\n-----END PRIVATE KEY-----\\n",
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
            .addItem('アプリからデータを取得 (Pull)', 'syncFromFirestore')
            .addSeparator()
            .addItem('アプリへ変更を反映 (Push)', 'syncToFirestore')
            .addToUi();
    }

    // --- Firestore -> Sheet (Pull) ---
    function syncFromFirestore() {
        const firestore = getFirestore();
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

        if (!sheet) {
            Browser.msgBox("エラー: シート '" + SHEET_NAME + "' が見つかりません。");
            return;
        }

        try {
            const allDocs = firestore.getDocuments("children");

            const header = ["ID", "学年", "クラス", "氏名", "かな", "帰宅方法"];

            const rows = [];
            for (const doc of allDocs) {
                const data = doc.fields;

                rows.push([
                    doc.name.split("/").pop(),
                    data.grade && data.grade.integerValue ? data.grade.integerValue : (data.grade && data.grade.stringValue ? data.grade.stringValue : ""),
                    data.className && data.className.stringValue ? data.className.stringValue : "",
                    data.name && data.name.stringValue ? data.name.stringValue : "",
                    data.kana && data.kana.stringValue ? data.kana.stringValue : "",
                    data.defaultReturnMethod && data.defaultReturnMethod.stringValue ? data.defaultReturnMethod.stringValue : ""
                ]);
            }

            sheet.clear();
            sheet.getRange(1, 1, 1, header.length).setValues([header]).setBackground("#f3f4f6").setFontWeight("bold");
            if (rows.length > 0) {
                sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
            }

            Browser.msgBox("同期完了(Pull): " + rows.length + "件取得しました。");

        } catch (e) {
            Browser.msgBox("エラー: " + e.toString());
            console.error(e);
        }
    }

    // --- Sheet -> Firestore (Push) ---
    function syncToFirestore() {
        const firestore = getFirestore();
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

        if (!sheet) {
            Browser.msgBox("エラー: シート '" + SHEET_NAME + "' が見つかりません。");
            return;
        }

        const ui = SpreadsheetApp.getUi();
        const response = ui.alert('確認', 'シートの内容でアプリのデータを上書き・追加しますか？\n（IDがある行は更新、ない行は新規追加されます）', ui.ButtonSet.YES_NO);
        if (response == ui.Button.NO) return;

        try {
            // データの取得（ヘッダーを除く）
            const lastRow = sheet.getLastRow();
            if (lastRow < 2) {
                Browser.msgBox("データがありません。");
                return;
            }

            const range = sheet.getRange(2, 1, lastRow - 1, 6);
            const values = range.getValues();
            let updatedCount = 0;
            let createdCount = 0;

            for (let i = 0; i < values.length; i++) {
                const row = values[i];
                const id = row[0].toString().trim();
                const grade = parseInt(row[1]) || 0; // 数値化
                const className = row[2].toString();
                const name = row[3].toString();
                const kana = row[4].toString();
                const method = row[5].toString();

                // 必須チェック（氏名がない行はスキップなど）
                if (!name) continue;

                const data = {
                    grade: grade,
                    className: className,
                    name: name,
                    kana: kana,
                    defaultReturnMethod: method
                };

                if (id) {
                    // 更新 (Update)
                    firestore.updateDocument("children/" + id, data);
                    updatedCount++;
                } else {
                    // 新規作成 (Create)
                    const doc = firestore.createDocument("children", data);
                    const newId = doc.name.split("/").pop();

                    // シートに新しいIDを書き込む
                    sheet.getRange(i + 2, 1).setValue(newId);
                    createdCount++;
                }
            }

            Browser.msgBox("同期完了(Push): 更新 " + updatedCount + "件 / 新規作成 " + createdCount + "件");

        } catch (e) {
            Browser.msgBox("エラー: " + e.toString());
            console.error(e);
        }
    }
}
