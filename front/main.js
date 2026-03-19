import { fetchCalories, saveExerciseRecord } from './fit-api.js';
import { getSnackRecommendation } from './gem-api.js';

console.log("main.js loaded!"); // 確認用ログ

// 各ページに存在する要素を取得
const startBtn = document.getElementById('startBtn'); // startmenu.html用
const endBtn = document.getElementById('endBtn');     // continuationmenu.html用の赤い終了ボタン

// タイマーやカロリー表示用の要素
const statusDisplay = document.querySelector('.mini-timer'); 
const caloriesDisplay = document.getElementById('current-kcal-value'); // 統合サークル内
const resultCaloriesDisplay = document.querySelector('.rectangle-kcalB'); // endmenu.html用
const loginBtn = document.getElementById('loginBtn'); // login.html用
const logoutBtn = document.getElementById('logoutBtn'); // 共通
const authStatus = document.getElementById('authStatus');

// --- 0. ログイン状態の管理 ---
// (中略 - ログインガードなどは維持)
if (!localStorage.getItem('isLoggedIn') && !window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('callback.html')) {
    window.location.href = '/login.html';
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId') || 'test_user';
        try {
            await fetch('/api/google-fit/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
        } catch (err) { console.warn("Logout request failed, continuing local logout."); }
        localStorage.clear();
        window.location.href = '/login.html';
    });
}

if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/google-fit/auth-url');
            const data = await res.json();
            if (data.authorizationUrl) {
                localStorage.setItem('userId', 'test_user');
                window.location.href = data.authorizationUrl;
            }
        } catch (err) { console.error("ログインURL取得エラー", err); }
    });
}

let startTimeMillis = localStorage.getItem('startTimeMillis') ? parseInt(localStorage.getItem('startTimeMillis')) : 0;
let intervalId = null;

// --- 1. startmenu.html の処理 ---
if (startBtn) {
    startBtn.addEventListener('click', () => {
        localStorage.setItem('startTimeMillis', Date.now());
        window.location.href = 'continuationmenu.html';
    });
}

// --- 2. continuationmenu.html の処理 ---
if (window.location.pathname.endsWith('continuationmenu.html')) {
    const stopBtn = document.getElementById('stopBtn'); // 統合サークル
    const aiCheerDisplay = document.getElementById('ai-cheer');
    const actionLabel = document.getElementById('action-label');
    
    let isPaused = false;
    let cheerIntervalId = null;

    const updateAiCheer = async () => {
        if (isPaused) return; 
        const currentKcal = localStorage.getItem('currentCalories') || '0';
        const prompt = `あなたは熱血AIトレーナーです。ユーザーは現在運動中です。目標達成まであと少し！
消費カロリーは現在 ${currentKcal} kcal です。
ユーザーのモチベーションを最高に高める、熱く短い応援メッセージ（20文字以内）を送ってください。`;

        try {
            const res = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt })
            });
            if (res.ok) {
                const data = await res.json();
                if (aiCheerDisplay) aiCheerDisplay.textContent = data.response;
            }
        } catch (err) { console.warn("Ai cheer failed", err); }
    };
    
    cheerIntervalId = setInterval(updateAiCheer, 15000);

    const updateTimer = () => {
        if (isPaused) return;
        if (startTimeMillis > 0 && statusDisplay) {
            const elapsed = Date.now() - startTimeMillis;
            const totalSeconds = Math.floor(elapsed / 1000);
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            statusDisplay.textContent = `${minutes}:${seconds}`;
        }
    };

    const updateCalories = async () => {
        if (isPaused) return;
        if (startTimeMillis > 0) {
            try {
                const calories = await fetchCalories(startTimeMillis, Date.now());
                if (caloriesDisplay) caloriesDisplay.textContent = calories.toFixed(1);
                localStorage.setItem('currentCalories', calories.toFixed(1));
            } catch (err) { console.error("カロリー取得エラー", err); }
        }
    };

    updateTimer();
    updateCalories();
    
    const timerIntervalId = setInterval(updateTimer, 1000);
    intervalId = setInterval(updateCalories, 5000);

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (!isPaused) {
                isPaused = true;
                stopBtn.classList.add('is-paused');
                if (actionLabel) actionLabel.textContent = "TAP TO RESUME";
                localStorage.setItem('pausedElapsed', Date.now() - startTimeMillis);
                if (aiCheerDisplay) aiCheerDisplay.textContent = "一時停止中... 呼吸を整えましょう 🧘";
            } else {
                const pausedElapsed = parseInt(localStorage.getItem('pausedElapsed') || "0");
                startTimeMillis = Date.now() - pausedElapsed;
                localStorage.setItem('startTimeMillis', startTimeMillis);
                isPaused = false;
                stopBtn.classList.remove('is-paused');
                if (actionLabel) actionLabel.textContent = "TAP TO PAUSE";
                if (aiCheerDisplay) aiCheerDisplay.textContent = "トレーニング再開！🔥";
            }
        });
    }

    if (endBtn) {
        endBtn.addEventListener('click', async () => {
            clearInterval(timerIntervalId);
            clearInterval(intervalId);
            clearInterval(cheerIntervalId);
            try {
                if (caloriesDisplay) caloriesDisplay.textContent = "---";
                const finalCalories = await fetchCalories(startTimeMillis, Date.now());
                await saveExerciseRecord('test_user', finalCalories, startTimeMillis, Date.now());
                localStorage.setItem('finalCalories', finalCalories.toFixed(1));
                window.location.href = 'endmenu.html';
            } catch (error) { console.error(error); }
        });
    }
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