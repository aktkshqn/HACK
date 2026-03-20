/**
 * フロントエンド共通型定義
 */

export interface ExerciseRecord {
    id?: number;
    user_id: string;
    activity_type: string;
    start_time: string;
    end_time: string;
    calories_burned: number;
    notes?: string;
    created_at?: number;
}

export interface AuthResponse {
    success: boolean;
    authorizationUrl?: string;
}

export interface CheerResponse {
    message: string;
    items?: Array<{
        name: string;
        info: string;
        link: string;
    }>;
}
