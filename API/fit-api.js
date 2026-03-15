// Google Fit APIのエンドポイント
const GOOGLE_FIT_URL = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';
// ※ 実際はOAuthで取得したアクセストークンをここに入れる
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

/**
 * Google Fitから消費カロリーを取得する関数
 * @param {number} start - 開始時刻(ミリ秒)
 * @param {number} end - 終了時刻(ミリ秒)
 * @returns {Promise<number>} - 消費カロリー値
 */
export async function fetchCalories(start, end) {
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
    // データの階層を辿ってカロリー値（fpVal）を抽出
    return data.bucket[0].dataset[0].point[0].value[0].fpVal;
}