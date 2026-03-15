import { fetchCalories } from './fit-api.js';
import { getSnackRecommendation } from './gem-api.js';

// DOM要素の取得
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusDisplay = document.getElementById('status-message');
const caloriesDisplay = document.getElementById('calories');
const adviceDisplay = document.getElementById('gemini-advice');

// 共通変数：開始時刻
let startTimeMillis = 0;

// 計測開始イベント
startBtn.addEventListener('click', () => {
    startTimeMillis = Date.now();
    statusDisplay.textContent = "計測中... 運動を頑張ってください！";
});

// 計測終了イベント
stopBtn.addEventListener('click', async () => {
    try {
        statusDisplay.textContent = "データを集計・分析中...";
        const endTimeMillis = Date.now();

        // 1. カロリー取得
        const calories = await fetchCalories(startTimeMillis, endTimeMillis);
        caloriesDisplay.textContent = `${calories.toFixed(2)}`;

        // 2. AIへ提案依頼
        statusDisplay.textContent = "栄養士AIがお菓子を選んでいます...";
        const recommendation = await getSnackRecommendation(calories);

        // 3. 結果表示
        adviceDisplay.textContent = recommendation;
        statusDisplay.textContent = "完了しました！";
    } catch (error) {
        console.error(error);
        statusDisplay.textContent = "エラーが発生しました。APIキーなどを確認してください。";
    }
});