const GOOGLE_FIT_URL = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

/**
 * Google Fitから消費カロリーを取得する関数
 * （現在はテスト用のダミーデータを返します）
 */
export async function fetchCalories(start, end) {
    const elapsedSeconds = (end - start) / 1000;
    
    // 待機画面などの場合はダミー初期値を返す
    if (elapsedSeconds > 3600) {
        return 450.0 + (Math.random() * 2); 
    }

    // 計測中：1秒あたり 0.15kcal 消費と仮定
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