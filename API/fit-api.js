// ==========================================
// 1. 準備：HTMLのパーツ（ID）をJSに紐付ける
// ==========================================
const startBtn = document.getElementById('start-btn'); // スタートボタン
const stopBtn = document.getElementById('stop-btn');   // ストップボタン
const caloriesDisplay = document.getElementById('calories'); // 表示場所

// Google Fit APIのURL
const GOOGLE_FIT_URL = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';

// タイマーの時間を保存しておく変数（中身が変わるので let を使う）
let startTimeMillis = 0;
let endTimeMillis = 0;

// ==========================================
// 2. ボタンを押した時の処理（イベントリスナー）
// ==========================================

// --- スタートボタンを押した時 ---
startBtn.addEventListener('click', () => {
    startTimeMillis = Date.now(); // 現在の時刻を記録
    console.log("計測開始:", startTimeMillis);
    // ※ここで友達が作ったタイマーを動かす処理を呼ぶとスムーズです
});

// --- ストップボタンを押した時 ---
stopBtn.addEventListener('click', async () => {
    endTimeMillis = Date.now(); // 終了した時刻を記録
    console.log("計測終了:", endTimeMillis);

    // あなたが作った「APIを叩く関数」を動かす！
    // 記録した「開始」と「終了」の時間を渡します
    await fetchCalories(startTimeMillis, endTimeMillis);
});

// ==========================================
// 3. APIと通信してデータを取ってくる関数
// ==========================================
async function fetchCalories(start, end) {
    const requestBody = {
        aggregateBy: [{
            dataTypeName: "com.google.calories.expended"
        }],
        bucketByTime: { durationMillis: (end - start) },
        startTimeMillis: start,
        endTimeMillis: end
    };

    try {
        const response = await fetch(GOOGLE_FIT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${YOUR_ACCESS_TOKEN}`, // ここを実際のトークンに変える
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // Googleから返ってきたデータからカロリーを抜き出す
        const calories = data.bucket[0].dataset[0].point[0].value[0].fpVal;

        // 友達の作ったHTML（ID: calories）に反映！
        caloriesDisplay.textContent = calories.toFixed(2);

    } catch (error) {
        console.error("データ取得に失敗...", error);
        caloriesDisplay.textContent = "エラー";
    }
}