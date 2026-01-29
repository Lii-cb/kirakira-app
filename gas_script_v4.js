function myFunction() {
    // --- 設定 ---
    const SHEET_CHILDREN = "kirakira-app"; // 既存のシート名
    const SHEET_RESERVATIONS = "reservations";
    const SHEET_PAYMENTS = "payments";

    // サービスアカウントキー (JSON)
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

    function getFirestore() {
        const json = JSON.parse(PRIVATE_KEY_JSON.trim());
        return FirestoreApp.getFirestore(json.client_email, json.private_key, json.project_id);
    }

    // メニュー作成
    function onOpen() {
        SpreadsheetApp.getUi()
            .createMenu('キラキラ連携')
            .addItem('全データ取得 (Pull All)', 'syncAllFromFirestore')
            .addSeparator()
            .addItem('児童名簿を反映 (Push Children)', 'pushChildrenToFirestore')
            .addToUi();
    }

    // --- メイン関数 ---

    // 一括取得
    function syncAllFromFirestore() {
        const firestore = getFirestore();

        // 1. 児童データの取得 (キャッシュ作成のため必須)
        const childMap = syncChildren(firestore);

        // 2. 予約データの取得
        syncReservations(firestore, childMap);

        // 3. 入金データの取得
        syncPayments(firestore, childMap);

        Browser.msgBox("全データの同期が完了しました。");
    }

    // 児童名簿のみ送信
    function pushChildrenToFirestore() {
        syncToFirestore_Children();
    }


    // --- 個別ロジック ---

    // 1. Children (Sync & Return Map for Lookup)
    function syncChildren(firestore) {
        const sheet = getOrCreateSheet(SHEET_CHILDREN);
        const allDocs = firestore.getDocuments("children");

        const header = ["ID", "学年", "クラス", "氏名", "かな", "帰宅方法", "おやつ免除"];
        const rows = [];
        const childMap = {}; // ID -> Name map

        for (const doc of allDocs) {
            const data = doc.fields;
            const id = doc.name.split("/").pop();

            // Mapに保存
            const name = data.name && data.name.stringValue ? data.name.stringValue : "Unknown";
            childMap[id] = name;

            // おやつ免除
            let isExempt = "";
            if (data.snackConfig && data.snackConfig.mapValue && data.snackConfig.mapValue.fields && data.snackConfig.mapValue.fields.isExempt) {
                isExempt = data.snackConfig.mapValue.fields.isExempt.booleanValue ? "○" : "";
            }

            rows.push([
                id,
                data.grade && data.grade.integerValue ? data.grade.integerValue : (data.grade && data.grade.stringValue ? data.grade.stringValue : ""),
                data.className && data.className.stringValue ? data.className.stringValue : "",
                name,
                data.kana && data.kana.stringValue ? data.kana.stringValue : "",
                data.defaultReturnMethod && data.defaultReturnMethod.stringValue ? data.defaultReturnMethod.stringValue : "",
                isExempt
            ]);
        }

        updateSheet(sheet, header, rows);
        return childMap;
    }

    // 2. Reservations (Pull Only)
    function syncReservations(firestore, childMap) {
        const sheet = getOrCreateSheet(SHEET_RESERVATIONS);
        const allDocs = firestore.getDocuments("reservations");

        const header = ["ID", "日付", "時間", "児童名", "おやつ", "料金(目安)", "ステータス"];
        const rows = [];

        // 日付順にソートしたい場合はここでJavaScriptでソート可能ですが、
        // Firestoreからの順序は保証されないため、取得後にソート推奨。
        // ここでは単純に追加します。

        for (const doc of allDocs) {
            const data = doc.fields;
            const id = doc.name.split("/").pop();
            const childId = data.childId && data.childId.stringValue ? data.childId.stringValue : "";
            const childName = childMap[childId] || childId; // 名前解決

            rows.push([
                id,
                data.date && data.date.stringValue ? data.date.stringValue : "",
                data.time && data.time.stringValue ? data.time.stringValue : "",
                childName,
                data.hasSnack && data.hasSnack.booleanValue ? "あり" : "",
                data.fee && data.fee.integerValue ? data.fee.integerValue : "0",
                data.status && data.status.stringValue ? data.status.stringValue : ""
            ]);
        }

        // 日付の降順(新しい順)にソート
        rows.sort((a, b) => (a[1] < b[1] ? 1 : -1));

        updateSheet(sheet, header, rows);
    }

    // 3. Payments (Pull Only)
    function syncPayments(firestore, childMap) {
        const sheet = getOrCreateSheet(SHEET_PAYMENTS);
        const allDocs = firestore.getDocuments("payments");

        const header = ["ID", "報告日", "児童名", "金額", "ステータス"];
        const rows = [];

        for (const doc of allDocs) {
            const data = doc.fields;
            const id = doc.name.split("/").pop();
            const childId = data.childId && data.childId.stringValue ? data.childId.stringValue : "";
            const childName = childMap[childId] || childId;

            rows.push([
                id,
                data.date && data.date.stringValue ? data.date.stringValue : "",
                childName,
                data.amount && data.amount.integerValue ? data.amount.integerValue : "0",
                data.status && data.status.stringValue ? data.status.stringValue : ""
            ]);
        }

        // 日付の降順
        rows.sort((a, b) => (a[1] < b[1] ? 1 : -1));

        updateSheet(sheet, header, rows);
    }

    // --- Helper: Update Sheet ---
    function updateSheet(sheet, header, rows) {
        sheet.clear();
        sheet.getRange(1, 1, 1, header.length).setValues([header]).setBackground("#e5e7eb").setFontWeight("bold");
        if (rows.length > 0) {
            // 文字列フォーマットにしてIDの変形などを防ぐ
            sheet.getRange(2, 1, rows.length, header.length).setNumberFormat("@").setValues(rows);
        }
    }

    // --- Helper: Get or Create Sheet ---
    function getOrCreateSheet(name) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(name);
        if (!sheet) {
            sheet = ss.insertSheet(name);
        }
        return sheet;
    }

    // --- Push Logic (Children Only) ---
    function syncToFirestore_Children() {
        const firestore = getFirestore();
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CHILDREN);

        if (!sheet) {
            Browser.msgBox("エラー: シート '" + SHEET_CHILDREN + "' が見つかりません。");
            return;
        }

        const ui = SpreadsheetApp.getUi();
        const response = ui.alert('確認', '「' + SHEET_CHILDREN + '」シートの内容でアプリのデータを更新しますか？', ui.ButtonSet.YES_NO);
        if (response == ui.Button.NO) return;

        try {
            const lastRow = sheet.getLastRow();
            if (lastRow < 2) return;

            const range = sheet.getRange(2, 1, lastRow - 1, 7);
            const values = range.getValues();
            let updated = 0;
            let created = 0;

            for (let i = 0; i < values.length; i++) {
                const row = values[i];
                // ID, Grade, Class, Name, Kana, Method, Exempt
                const id = row[0].toString().trim();
                const grade = parseInt(row[1]) || 0;
                const className = row[2].toString();
                const name = row[3].toString();
                const kana = row[4].toString();
                const method = row[5].toString();
                const isExemptInput = row[6].toString().trim();

                if (!name) continue;

                const isExempt = isExemptInput === "○" || isExemptInput === "TRUE";

                const data = {
                    grade: grade,
                    className: className,
                    name: name,
                    kana: kana,
                    defaultReturnMethod: method,
                    snackConfig: {
                        isExempt: isExempt
                    }
                };

                if (id) {
                    firestore.updateDocument("children/" + id, data);
                    updated++;
                } else {
                    const doc = firestore.createDocument("children", data);
                    const newId = doc.name.split("/").pop();
                    sheet.getRange(i + 2, 1).setValue(newId);
                    created++;
                }
            }
            Browser.msgBox("完了: 更新 " + updated + "件 / 新規 " + created + "件");
        } catch (e) {
            Browser.msgBox("エラー: " + e.toString());
            console.error(e);
        }
    }
}
