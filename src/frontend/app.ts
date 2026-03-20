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

    // 0.5. 背景画像のランダム切り替え (PC版左パネル用)
    const leftPanel = document.querySelector('.left-panel') as HTMLElement | null;
    if (leftPanel) {
        const bgImages = [
            '/img/dumbbell_1.jpg',
            '/img/dumbbell_2.jpg',
            '/img/jogging.jpg',
            '/img/press.jpg',
            '/img/run.jpg'
        ];
        
        const updateBg = () => {
            const randomImg = bgImages[Math.floor(Math.random() * bgImages.length)];
            // モノトーン調を維持するため、グレースケールのオーバーレイと組み合わせる
            leftPanel.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), grayscale(100%) url('${randomImg}')`;
            // 注意: CSS filter ではなく、ブラウザ互換性の高い background-image の複数指定や blend-mode を利用
            leftPanel.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${randomImg}')`;
            // filter は CSS 側にかけてあるので、こちらでは URL の更新のみ
        };
        updateBg();
        setInterval(updateBg, 6000); // 6秒おきに切り替え
    }

    // --- モバイルメニューの開閉ロジック ---
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('is-active');
        });
        // 画面のどこかをクリックしたらメニューを閉じる
        document.addEventListener('click', () => navMenu.classList.remove('is-active'));
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
        const finalKcalEl = document.getElementById('final-kcal');
        const praiseEl = document.getElementById('praise-message');
        const aiEvalEl = document.getElementById('ai-evaluation');

        if (finalKcalEl) finalKcalEl.textContent = finalKcal;
        
        const fetchGohans = async () => {
            try {
                const res = await fetch('/api/gemini/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `${finalKcal}kcal消費しました。Gohan-Fit コンシェルジュとして賞賛と、最高のご褒美レストランを3つ提案してください。` })
                });
                const data: CheerResponse = await res.json();
                
                if (praiseEl) praiseEl.textContent = data.message;
                
                if (data.items) {
                    data.items.forEach((item, i) => {
                        const btn = document.getElementById(`snack${i+1}`);
                        if (btn) {
                            btn.innerHTML = `
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                    <strong style="font-size: 1.1rem; color: var(--text-main);">${item.name}</strong>
                                    <span style="font-size: 0.7rem; background: var(--border-color, #e2e8f0); padding: 2px 8px; border-radius: 10px;">REWARD ${i+1}</span>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.5rem;">${item.info}</div>
                                <div style="text-align: right; font-size: 0.8rem; font-weight: 800; color: var(--primary);">詳しくみる ↗</div>
                            `;
                            btn.onclick = () => window.open(item.link, '_blank');
                        }
                    });
                }
            } catch (err) { console.error(err); }
        };
        fetchGohans();
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
