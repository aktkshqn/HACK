/**
 * 運動記録・カロリー取得 API 通信 (TypeScript版)
 */

import { ExerciseRecord } from './types';

export const Exercise = {
    // 期間指定で消費カロリーを取得
    async fetchCalories(start: number, end: number): Promise<number> {
        const userId = localStorage.getItem('userId') || 'test_user';
        const url = `/api/google-fit/calories?user_id=${userId}&startTimeMillis=${start}&endTimeMillis=${end}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("カロリー取得エラー");
            const data: { calories: number } = await res.json();
            return data.calories;
        } catch (error) {
            console.error(error);
            return 0;
        }
    },

    // 運動記録を D1 に保存
    async saveRecord(userId: string, calories: number, start: number, end: number): Promise<boolean> {
        const body: ExerciseRecord = {
            user_id: userId,
            activity_type: 'walking',
            start_time: new Date(start).toISOString(),
            end_time: new Date(end).toISOString(),
            calories: calories
        };
        try {
            const res = await fetch('/api/exercise-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return res.ok;
        } catch (error) {
            console.error("記録保存エラー:", error);
            return false;
        }
    }
};
