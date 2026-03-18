import { fetchCalories, saveExerciseRecord } from './fit-api.js';
import { getSnackRecommendation } from './gem-api.js';

console.log("main.js loaded!"); // 確認用ログ

// 各ページに存在する要素を取得
const startBtn = document.getElementById('startBtn'); // startmenu.html用
const endBtn = document.getElementById('endBtn');     // continuationmenu.html用の赤い終了ボタン

// タイマーやカロリー表示用の要素（クラス名で取得）
const statusDisplay = document.querySelector('.rectangle-timer'); 
const caloriesDisplay = document.querySelector('.rectangle-kcal'); // continuationmenu.html用
const resultCaloriesDisplay = document.querySelector('.rectangle-kcalB'); // endmenu.html用

let startTimeMillis = localStorage.getItem('startTimeMillis') ? parseInt(localStorage.getItem('startTimeMillis')) : 0;
let intervalId = null;

// --- 1. startmenu.html の処理 ---
if (startBtn) {
    console.log("startBtn found, adding click listener"); // 確認用ログ
    startBtn.addEventListener('click', () => {
        console.log("startBtn clicked!"); // 確認用ログ
        // スタート時間を保存して次のページへ
        localStorage.setItem('startTimeMillis', Date.now());
        window.location.href = 'continuationmenu.html';
    });
}

// --- 2. continuationmenu.html の処理 ---
if (endBtn) {
    
    // タイマー（00:00）を更新する関数
    const updateTimer = () => {
        console.log("updateTimer called. startTimeMillis:", startTimeMillis, "statusDisplay:", statusDisplay);
        if (startTimeMillis > 0 && statusDisplay) {
            const elapsed = Date.now() - startTimeMillis;
            const totalSeconds = Math.floor(elapsed / 1000);
            
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            
            statusDisplay.textContent = `${minutes}:${seconds}`;
            console.log(`Timer updated: ${minutes}:${seconds}`);
        } else {
            console.log("updateTimer failed condition. startTimeMillis > 0:", startTimeMillis > 0, "statusDisplay exists:", !!statusDisplay);
        }
    };

    // 初回読み込み時にすぐカロリーを更新する関数
    const updateCalories = async () => {
        const now = Date.now();
        if (startTimeMillis > 0) {
            try {
                const calories = await fetchCalories(startTimeMillis, now);
                // 取得したカロリー（小数点以下2桁）をリアルタイムで反映する
                if (caloriesDisplay) caloriesDisplay.textContent = `現在${calories.toFixed(2)}kcal消費中！`;
            } catch (err) {
                console.error("カロリー取得エラー", err);
            }
        }
    };

    // ページが開かれたらタイマーとカロリーをすぐ実行
    updateTimer();
    updateCalories();
    
    // タイマーは1秒ごと、カロリーは5秒ごとに更新
    const timerIntervalId = setInterval(updateTimer, 1000);
    intervalId = setInterval(updateCalories, 5000);

    // 終了（赤いボタン）が押されたら結果画面へ
    endBtn.addEventListener('click', async () => {
        clearInterval(timerIntervalId);
        clearInterval(intervalId);
        
        try {
            if (caloriesDisplay) caloriesDisplay.textContent = "最終結果を取得中...";
            const finalCalories = await fetchCalories(startTimeMillis, Date.now());
            
            // 1. D1データベースに保存
            const userId = 'test_user'; // デモ用。必要に応じて変更
            await saveExerciseRecord(userId, finalCalories, startTimeMillis, Date.now());

            // 2. 結果を保存して移動
            localStorage.setItem('finalCalories', finalCalories);
            window.location.href = 'endmenu.html';
        } catch (error) {
            console.error("保存＋遷移エラー:", error);
            if (caloriesDisplay) caloriesDisplay.textContent = "保存中にエラーが発生しました";
        }
    });
}

// --- 3. endmenu.html の処理 ---
if (resultCaloriesDisplay) {
    // 結果カロリーの表示
    const finalCal = localStorage.getItem('finalCalories') || 0;
    resultCaloriesDisplay.textContent = `結果${parseFloat(finalCal).toFixed(2)}kcal消費！`;

    // 3つのお菓子を表示するボタンを取得
    const snack1Btn = document.getElementById('snack1');
    const snack2Btn = document.getElementById('snack2');
    const snack3Btn = document.getElementById('snack3');

    // AIへの提案依頼
    async function fetchAdvice() {
        try {
            // 取得中メッセージ
            if(snack1Btn) snack1Btn.textContent = "AIが考えています...";
            if(snack2Btn) snack2Btn.textContent = "AIが考えています...";
            if(snack3Btn) snack3Btn.textContent = "AIが考えています...";

            // Gemini APIを呼び出し（配列が返ってくる）
            const recommendations = await getSnackRecommendation(parseFloat(finalCal));
            
            // 配列の内容を各ボタンに割り当て
            if(snack1Btn) snack1Btn.textContent = recommendations[0] || "提案1を取得できませんでした";
            if(snack2Btn) snack2Btn.textContent = recommendations[1] || "提案2を取得できませんでした";
            if(snack3Btn) snack3Btn.textContent = recommendations[2] || "提案3を取得できませんでした";
            
        } catch (error) {
            console.error("AI提案取得エラー", error);
            if(snack1Btn) snack1Btn.textContent = "エラーが発生しました";
            if(snack2Btn) snack2Btn.textContent = "エラーが発生しました";
            if(snack3Btn) snack3Btn.textContent = "エラーが発生しました";
        }
    }
    
    fetchAdvice();
}