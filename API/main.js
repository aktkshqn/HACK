// ==========================================
// 1. 各職人（APIファイル）から関数をインポート
// ==========================================
import { fetchCalories } from './fit-api.js';
import { getSnackRecommendation } from './gem-api.js';

// ==========================================
// 2. HTMLの表示場所とボタンを定義
// ==========================================
const stopBtn = document.getElementById('stop-btn');
const statusDisplay = document.getElementById('status-message'); // 進行状況を表示する場所
const caloriesDisplay = document.getElementById('calories');     // 消費カロリー表示場所
const adviceDisplay = document.getElementById('gemini-advice');   // お菓子提案表示場所

// ==========================================
// 3. 実行：ストップボタンを押した後の流れを定義
// ==========================================
stopBtn.addEventListener('click', async () => {

    // 進行状況をユーザーに伝える（安心感のため）
    statusDisplay.textContent = "データを取得中...";

    try {
        // ① Google Fit からカロリーを取得
        // ※開始・終了時刻は、fit-api.js 内で管理されている前提です
        const calories = await fetchCalories(startTimeMillis, endTimeMillis);

        // 画面にカロリーを表示
        caloriesDisplay.textContent = `${calories.toFixed(2)} kcal`;
        statusDisplay.textContent = "カロリー取得完了！お菓子を検討中...";

        // ② そのカロリーを元に Gemini からお菓子を提案してもらう
        const recommendation = await getSnackRecommendation(calories);

        // ③ 結果を画面に表示
        adviceDisplay.textContent = recommendation;
        statusDisplay.textContent = "提案が届きました！";

    } catch (error) {
        console.error("アプリ連携エラー:", error);
        statusDisplay.textContent = "エラーが発生しました。もう一度試してください。";
    }
});