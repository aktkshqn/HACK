/**
 * Google Fitから消費カロリーを取得する関数（バックエンド経由）
 */
export async function fetchCalories(start, end) {
    const userId = localStorage.getItem('userId') || 'test_user';
    const params = new URLSearchParams({
        user_id: userId,
        startTimeMillis: start.toString(),
        endTimeMillis: end.toString()
    });

    try {
        const response = await fetch(`/api/google-fit/calories?${params}`);
        if (!response.ok) {
            // ログインしていない場合やエラーの場合はダミーへ（開発・テスト用）
            console.warn("Real Fit API failed, falling back to dummy.");
            return getDummyCalories(start, end);
        }
        const data = await response.json();
        return data.calories || 0;
    } catch (err) {
        console.error("Fit API fetch error:", err);
        return getDummyCalories(start, end);
    }
}

function getDummyCalories(start, end) {
    const elapsedSeconds = (end - start) / 1000;
    if (elapsedSeconds > 3600) return 450.0 + (Math.random() * 2);
    return elapsedSeconds * 0.15;
}

/**
 * バックエンドの D1 データベースに計測結果を保存する
 */
export async function saveExerciseRecord(userId, calories, startTime, endTime) {
    const body = {
        user_id: userId,
        activity_type: 'walking',
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        calories_burned: calories,
        notes: '運動後のデザート提案アプリより記録'
    };

    try {
        const response = await fetch('/api/exercise-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error("保存に失敗しました Status: " + response.status);
        
        const data = await response.json();
        console.log("D1に保存完了:", data);
        return data.id;
    } catch (error) {
        console.error("保存エラー:", error);
        throw error;
    }
}