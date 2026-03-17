// ★ 自分のクライアントIDに変更してください
const CLIENT_ID = '794739380289-adumfdup62nm7qtt5dhih8s0p52dcae1.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read';

let tokenClient;
let accessToken = '';
let startTime, endTime;

// ページ読み込み時にライブラリを初期化
window.onload = () => {
    if (typeof google !== 'undefined') {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp) => {
                if (resp.access_token) {
                    accessToken = resp.access_token;
                    document.getElementById('auth_btn').innerText = "ログイン完了 ✅";
                    document.getElementById('start_btn').disabled = false;
                    document.getElementById('status').innerText = "「スタート」を押して計測開始！";
                }
            },
        });
    }
};

// 1. ログインボタン
document.getElementById('auth_btn').onclick = () => {
    if (tokenClient) tokenClient.requestAccessToken();
};

// 2. スタートボタン
document.getElementById('start_btn').onclick = () => {
    startTime = Date.now(); // 現在時刻をミリ秒で保持
    document.getElementById('start_btn').disabled = true;
    document.getElementById('stop_btn').disabled = false;
    document.getElementById('status').innerText = "計測中... 運動が終わったらストップを！";
    document.getElementById('result').innerText = "計測開始時刻: " + new Date(startTime).toLocaleTimeString();
};

// 3. ストップボタン
document.getElementById('stop_btn').onclick = async () => {
    endTime = Date.now();
    document.getElementById('stop_btn').disabled = true;
    document.getElementById('status').innerText = "Google Fitからデータを取得中...";

    await fetchCalories(startTime, endTime);
};

// Google Fit API から指定期間のカロリーを取得
async function fetchCalories(start, end) {
    try {
        const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "aggregateBy": [{ "dataTypeName": "com.google.calories.expended" }],
                "bucketByTime": { "durationMillis": end - start },
                "startTimeMillis": start,
                "endTimeMillis": end
            })
        });

        const data = await response.json();

        // カロリー値の取り出し（データがない場合は0をセット）
        let calories = 0;
        if (data.bucket && data.bucket[0].dataset[0].point.length > 0) {
            calories = data.bucket[0].dataset[0].point[0].value[0].fpVal;
        }

        document.getElementById('result').innerHTML = `
                <div style="font-size: 0.8em; color: #888;">計測時間: ${Math.round((end - start) / 1000)} 秒</div>
                <div style="font-size: 1.5em; color: #ea4335;">${calories.toFixed(2)} kcal</div>
            `;
        document.getElementById('status').innerText = "集計完了！";

        // ★ 次のステップでここに Gemini API の呼び出しを追加します
        console.log("取得したカロリー:", calories);

    } catch (error) {
        console.error(error);
        document.getElementById('status').innerText = "エラーが発生しました。";
    }
}