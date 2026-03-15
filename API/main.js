import { fetchCalories } from './fit-api.js';
import { getSnackRecommendation } from './gem-api.js';

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusDisplay = document.getElementById('status-message');
const caloriesDisplay = document.getElementById('calories');
const adviceDisplay = document.getElementById('gemini-advice');

let startTimeMillis = 0;
let intervalId = null; // リアルタイム更新のタイマー管理用

// 開始処理
startBtn.addEventListener('click', () => {
    startTimeMillis = Date.now();
    statusDisplay.textContent = "計測中... リアルタイム集計中！";

    // 5秒ごとにカロリーを更新するタイマーを開始
    intervalId = setInterval(async () => {
        const now = Date.now();
        const calories = await fetchCalories(startTimeMillis, now);
        caloriesDisplay.textContent = `${calories.toFixed(2)}`;
    }, 5000);
});

// 終了処理
stopBtn.addEventListener('click', async () => {
    // 1. リアルタイム更新を止める
    clearInterval(intervalId);

    try {
        statusDisplay.textContent = "最終結果を分析中...";
        const finalCalories = await fetchCalories(startTimeMillis, Date.now());

        // 2. AIへ提案依頼
        statusDisplay.textContent = "栄養士AIがお菓子を選んでいます...";
        const recommendation = await getSnackRecommendation(finalCalories);

        // 3. 結果表示
        adviceDisplay.textContent = recommendation;
        statusDisplay.textContent = "完了しました！";
    } catch (error) {
        statusDisplay.textContent = "エラーが発生しました。";
        console.error(error);
    }
});