/**
 * FitSweets: メインエントリーポイント (TypeScript版)
 */

import { Auth } from './auth';
import { Exercise } from './exercise';
import { UI } from './ui';
import { CheerResponse } from './types';

document.addEventListener('DOMContentLoaded', () => {
    // 0. 全ページ共通のログインガード & 表示モード設定
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html') || path === '/' || path === '';
    
    if (!isLoginPage && !Auth.isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    // 表示モード（PC版/スマホ版）の復元と切替ボタン生成
    const savedMode = localStorage.getItem('viewMode');
    if (savedMode === 'desktop') document.body.classList.add('is-desktop-mode');

    if (window.innerWidth >= 900) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'viewModeToggle';
        toggleBtn.innerHTML = document.body.classList.contains('is-desktop-mode') ? '📱 MOBILE VIEW' : '🖥️ PC VIEW';
        toggleBtn.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:1000; padding:10px 20px; border-radius:24px; border:none; background:#1e293b; color:white; cursor:pointer; font-weight:800; font-size:0.75rem; box-shadow:0 10px 30px rgba(0,0,0,0.3);';
        document.body.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
            const isDesktop = document.body.classList.toggle('is-desktop-mode');
            localStorage.setItem('viewMode', isDesktop ? 'desktop' : 'mobile');
            toggleBtn.innerHTML = isDesktop ? '📱 MOBILE VIEW' : '🖥️ PC VIEW';
        });
    }

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

    // --- 2. 記録中画面 (continuationmenu.html / workout) ---
    if (window.location.pathname.endsWith('continuationmenu.html')) {
        let startTimeMillis = parseInt(localStorage.getItem('startTimeMillis') || Date.now().toString());

        const runUpdate = async () => {
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
                const elapsed = Date.now() - startTimeMillis;
                localStorage.setItem('pausedElapsed', elapsed.toString());
                window.location.href = 'pause.html'; // 一時停止ページへ
            });
        }
    }

    // --- 3. 一時停止画面 (pause.html) ---
    if (window.location.pathname.endsWith('pause.html')) {
        const pausedElapsed = parseInt(localStorage.getItem('pausedElapsed') || "0");
        const currentKcal = localStorage.getItem('currentCalories') || "0.0";
        if (caloriesDisplay) caloriesDisplay.textContent = currentKcal;
        UI.updateTimerDisplay(statusDisplay, pausedElapsed);

        if (startBtn || document.getElementById('resumeBtn')) {
            const rBtn = startBtn || document.getElementById('resumeBtn');
            rBtn?.addEventListener('click', () => {
                const newStartTime = Date.now() - pausedElapsed;
                localStorage.setItem('startTimeMillis', newStartTime.toString());
                window.location.href = 'continuationmenu.html'; // 再開
            });
        }

        if (endBtn || document.getElementById('finishBtn')) {
            const fBtn = endBtn || document.getElementById('finishBtn');
            fBtn?.addEventListener('click', async (e) => {
                e.preventDefault();
                const kcal = parseFloat(localStorage.getItem('currentCalories') || "0");
                const startTime = parseInt(localStorage.getItem('startTimeMillis') || Date.now().toString());
                await Exercise.saveRecord('test_user', kcal, startTime, Date.now());
                localStorage.setItem('finalCalories', kcal.toString());
                window.location.href = 'endmenu.html';
            });
        }
    }

    // 0. 全ページ共通のログインガード & 表示モード設定
    // --- 4. 結果画面 (endmenu.html) ---
    if (window.location.pathname.endsWith('endmenu.html')) {
        const finalKcal = localStorage.getItem('finalCalories') || '0';
        if (resultCaloriesDisplay) resultCaloriesDisplay.textContent = `結果${finalKcal}kcal消費！`;
        
        const fetchSnacks = async () => {
            try {
                const res = await fetch('/api/gemini/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `${finalKcal}kcal消費しました。このカロリー分で食べられるコンビニのお菓子を3つ、具体的な商品名とリンクを含めてJSONで教えてください。` })
                });
                const data: CheerResponse = await res.json();
                if (data.items) {
                    data.items.forEach((item, i) => {
                        const btn = document.getElementById(`snack${i+1}`);
                        if (btn) {
                            btn.innerHTML = `<strong>${item.name}</strong><br><small>${item.info}</small><br><span style="font-size:0.7rem; color:blue;">近くの店舗で探す ➹</span>`;
                            btn.onclick = () => window.open(item.link, '_blank');
                        }
                    });
                }
            } catch (err) { console.error(err); }
        };
        fetchSnacks();
    }

    // --- 5. 過去ログ画面 (history.html) ---
    if (window.location.pathname.endsWith('history.html')) {
        const loadHistory = async () => {
            const userId = localStorage.getItem('userId') || 'test_user';
            const [summary, records] = await Promise.all([
                Exercise.getSummary(),
                Exercise.getAllRecords()
            ]);

            const todayEl = document.getElementById('today-total');
            const weeklyEl = document.getElementById('weekly-total');
            const praiseEl = document.getElementById('praise-message');
            const listEl = document.getElementById('history-list');

            if (todayEl) todayEl.textContent = summary.today_total.toFixed(0);
            if (weeklyEl) weeklyEl.textContent = summary.weekly_total.toFixed(0);

            // 履歴リストの描画
            if (listEl) {
                if (records.length === 0) {
                    listEl.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.8rem;">まだ記録がありません。運動を始めましょう！</p>';
                } else {
                    listEl.innerHTML = '';
                    records.forEach(r => {
                        const date = new Date(r.start_time).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const card = document.createElement('div');
                        card.className = 'summary-card';
                        card.style.borderWidth = '1px';
                        card.style.padding = '1rem';
                        card.style.textAlign = 'left';
                        card.style.display = 'flex';
                        card.style.justifyContent = 'space-between';
                        card.style.alignItems = 'center';
                        card.innerHTML = `
                            <div>
                                <div style="font-size: 0.8rem; font-weight: 800; color: #64748b;">${date}</div>
                                <div style="font-size: 0.7rem; color: #94a3b8;">${r.activity_type}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-dark);">${r.calories_burned.toFixed(1)} <small>kcal</small></div>
                            </div>
                        `;
                        listEl.appendChild(card);
                    });
                }
            }

            if (praiseEl) {
                const res = await fetch('/api/gemini/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `今日の累計は ${summary.today_total.toFixed(1)} kcal、過去の記録は ${records.length}件です。これまでの頑張りを熱く賞賛してください（メッセージのみJSONで返すこと）` })
                });
                const data: CheerResponse = await res.json();
                praiseEl.textContent = data.message;
            }
        };
        loadHistory();
    }

    // --- 6. デベロッパー画面 (dev.html) ---
    if (window.location.pathname.endsWith('dev.html')) {
        const tableBody = document.getElementById('db-body');
        const clearAllBtn = document.getElementById('clearAllBtn');

        const loadDb = async () => {
            const res = await fetch('/api/dev/all');
            const data = await res.json();
            if (tableBody) {
                tableBody.innerHTML = '';
                data.records.forEach((r: any) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${r.id}</td>
                        <td>${r.user_id}</td>
                        <td>${r.calories_burned}</td>
                        <td style="font-size: 0.6rem;">${r.start_time}</td>
                        <td>${r.duration_minutes?.toFixed(1)}</td>
                        <td><button class="btn-del" data-id="${r.id}">❌</button></td>
                    `;
                    tableBody.appendChild(tr);
                });

                document.querySelectorAll('.btn-del').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = (e.target as HTMLElement).getAttribute('data-id');
                        if (confirm(`ID ${id} を削除しますか？`)) {
                            await fetch(`/api/dev/record/${id}`, { method: 'DELETE' });
                            loadDb();
                        }
                    });
                });
            }
        };

        clearAllBtn?.addEventListener('click', async () => {
            if (confirm("全ての運動記録を完全に消去しますか？")) {
                await fetch('/api/dev/clear', { method: 'DELETE' });
                loadDb();
            }
        });

        loadDb();
    }
});
