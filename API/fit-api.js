const caloriesDisplay = document.getElementById('calories'); // 表示場所
const stopBtn = document.getElementById('stop-btn');         // ストップボタン

// Google Fit APIのURL
const GOOGLE_FIT_URL = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';

async function fetchCalories(startTimeMillis, endTimeMillis) {
    // APIに送るリクエストの設定
    const requestBody = {
        aggregateBy: [{
            dataTypeName: "com.google.calories.expended"
        }],
        bucketByTime: { durationMillis: (endTimeMillis - startTimeMillis) },
        startTimeMillis: startTimeMillis,
        endTimeMillis: endTimeMillis
    };

    try {
        const response = await fetch(GOOGLE_FIT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${YOUR_ACCESS_TOKEN}`, // ここに認証トークンが必要
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        // データの深い階層からカロリーを抜き出す（ここはAPIの構造に合わせる）
        const calories = data.bucket[0].dataset[0].point[0].value[0].fpVal;
        // 友達の作ったHTMLに反映！
        document.getElementById('calories').textContent = calories.toFixed(2);
    } catch (error) {
        console.error("データ取得に失敗...", error);
    }
}