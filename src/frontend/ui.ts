/**
 * UI 操作・AI 応援コメント・タイマー表示 (TypeScript版)
 */

import { CheerResponse } from './types';

export const UI = {
    // タイマー表示（00:00）の更新
    updateTimerDisplay(container: HTMLElement | null, elapsed: number): void {
        if (!container) return;
        const totalSeconds = Math.floor(elapsed / 1000);
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const secs = String(totalSeconds % 60).padStart(2, '0');
        container.textContent = `${mins}:${secs}`;
    },

    // 応援コメントの取得
    async updateAiCheer(kcal: string, container: HTMLElement | null): Promise<void> {
        if (!container) return;
        const prompt = `あなたは熱血AIトレーナーです。ユーザーは現在運動中です。目標達成まであと少し！
消費カロリーは現在 ${kcal} kcal です。
ユーザーのモチベーションを最高に高める、熱く短い応援メッセージ（20文字以内）を送ってください。`;

        try {
            const res = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt })
            });
            if (res.ok) {
                const data: CheerResponse = await res.json();
                container.textContent = data.response;
            }
        } catch (err) { console.warn("Ai cheer failed", err); }
    },

    // 統合サークルのステータス切り替え
    toggleCircleState(btn: HTMLElement | null, label: HTMLElement | null, isPaused: boolean): void {
        if (!btn) return;
        if (isPaused) {
            btn.classList.add('is-paused');
            if (label) label.textContent = "TAP TO RESUME";
        } else {
            btn.classList.remove('is-paused');
            if (label) label.textContent = "TAP TO PAUSE";
        }
    }
};
