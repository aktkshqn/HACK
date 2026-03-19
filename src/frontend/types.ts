/**
 * フロントエンド共通型定義
 */

export interface ExerciseRecord {
    user_id: string;
    activity_type: string;
    start_time: string;
    end_time: string;
    calories: number;
}

export interface AuthResponse {
    success: boolean;
    authorizationUrl?: string;
}

export interface CheerResponse {
    response: string;
}
