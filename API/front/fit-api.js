const GOOGLE_FIT_URL = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

/**
 * Google Fitから消費カロリーを取得する関数（現在はテスト用のダミーデータを返します）
 */
export async function fetchCalories(start, end) {
    // 実際のAPI通信の部分はコメントアウトしておきます
    /*
    const requestBody = {
        aggregateBy: [{ dataTypeName: "com.google.calories.expended" }],
        bucketByTime: { durationMillis: (end - start) },
        startTimeMillis: start,
        endTimeMillis: end
    };

    const response = await fetch(GOOGLE_FIT_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error("Fit API通信エラー");

    const data = await response.json();
    const point = data?.bucket?.[0]?.dataset?.[0]?.point?.[0];
    if (!point) return 0;
    
    return point.value[0].fpVal;
    */

    // --- ここからテスト用のダミーデータ生成 ---
    
    // startとendの差分（ミリ秒）を秒に変換
    const elapsedSeconds = (end - start) / 1000;
    
    // もし差分が大きすぎる場合（例: 今日の0時から計算した場合は開始前の待機画面）
    if (elapsedSeconds > 3600) {
        // スタート画面用には適当な初期値（例: 450kcal）を返す
        return 450.0 + (Math.random() * 2); 
    }

    // 計測中画面用：1秒あたり約0.15kcal消費しているような計算
    const dummyCalories = elapsedSeconds * 0.15;
    
    return dummyCalories;
}