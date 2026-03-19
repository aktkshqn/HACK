/**
 * FitSweets: メインエントリーポイント (TypeScript版)
 */

import { Auth } from './auth';
import { Exercise } from './exercise';
import { UI } from './ui';

document.addEventListener('DOMContentLoaded', () => {
    // 0. 全ページ共通のログインガード
    Auth.checkGuard();

    // -- 要素の取得 --
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn'); 
    const endBtn = document.getElementById('endBtn');
    const statusDisplay = document.querySelector('.mini-timer') as HTMLElement | null; 
    const caloriesDisplay = document.getElementById('current-kcal-value'); 
    const resultCaloriesDisplay = document.querySelector('.rectangle-kcalB');
    const aiCheerDisplay = document.getElementById('ai-cheer');
    const actionLabel = document.getElementById('action-label');

    // -- 認証処理 --
    if (loginBtn) loginBtn.addEventListener('click', () => Auth.login());
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => Auth.logout());

    // -- 1. スタート画面処理 --
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            localStorage.setItem('startTimeMillis', Date.now().toString());
            window.location.href = 'continuationmenu.html';
        });
    }

    // -- 2. 計測中画面処理 --
    if (window.location.pathname.endsWith('continuationmenu.html')) {
        let startTimeMillis = parseInt(localStorage.getItem('startTimeMillis') || Date.now().toString());
        let isPaused = false;
        let pausedElapsed = 0;

        const runUpdate = async () => {
            if (isPaused) return;
            const now = Date.now();
            const elapsed = now - startTimeMillis;
            
            UI.updateTimerDisplay(statusDisplay, elapsed);
            
            const kcal = await Exercise.fetchCalories(startTimeMillis, now);
            if (caloriesDisplay) caloriesDisplay.textContent = kcal.toFixed(1);
            localStorage.setItem('currentCalories', kcal.toFixed(1));
        };

        const timerId = setInterval(runUpdate, 1000);
        const cheerId = setInterval(() => {
            const kcal = localStorage.getItem('currentCalories') || '0';
            UI.updateAiCheer(kcal, aiCheerDisplay);
        }, 15000);

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                isPaused = !isPaused;
                if (isPaused) {
                    pausedElapsed = Date.now() - startTimeMillis;
                    localStorage.setItem('pausedElapsed', pausedElapsed.toString());
                    if (aiCheerDisplay) aiCheerDisplay.textContent = "一時停止中... 🧘";
                } else {
                    const savedPaused = parseInt(localStorage.getItem('pausedElapsed') || "0");
                    startTimeMillis = Date.now() - savedPaused;
                    localStorage.setItem('startTimeMillis', startTimeMillis.toString());
                }
                UI.toggleCircleState(stopBtn, actionLabel as HTMLElement | null, isPaused);
            });
        }

        if (endBtn) {
            endBtn.addEventListener('click', async () => {
                clearInterval(timerId);
                clearInterval(cheerId);
                if (caloriesDisplay) caloriesDisplay.textContent = "---";
                const finalKcal = await Exercise.fetchCalories(startTimeMillis, Date.now());
                await Exercise.saveRecord('test_user', finalKcal, startTimeMillis, Date.now());
                localStorage.setItem('finalCalories', finalKcal.toFixed(1));
                window.location.href = 'endmenu.html';
            });
        }
    }

    // -- 3. 結果画面処理 --
    if (window.location.pathname.endsWith('endmenu.html')) {
        const finalKcal = localStorage.getItem('finalCalories') || '0';
        if (resultCaloriesDisplay) resultCaloriesDisplay.textContent = `結果${finalKcal}kcal消費！`;
        
        const fetchSnacks = async () => {
            try {
                const res = await fetch('/api/gemini/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `${finalKcal}kcal消費しました。このカロリー分で食べられるコンビニのお菓子や飲み物を3つ教えてください。` })
                });
                const data = await res.json() as { response: string };
                const snacks = data.response.split('\n').filter(s => s.trim().length > 0);
                snacks.forEach((s, i) => {
                    const btn = document.getElementById(`snack${i+1}`);
                    if (btn) btn.textContent = s.replace(/^\d\.\s*/, '');
                });
            } catch (err) { console.error(err); }
        };
        fetchSnacks();
    }
});
