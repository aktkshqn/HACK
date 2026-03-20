/**
 * 認証関連のロジック (TypeScript版)
 */

import { AuthResponse } from './types';

export const Auth = {
    // ログインURLを取得してリダイレクト
    async login(): Promise<void> {
        try {
            const res = await fetch('/api/google-fit/auth-url');
            if (!res.ok) throw new Error("Auth URL fetch failed");
            const data: AuthResponse = await res.json();
            if (data.authorizationUrl) {
                localStorage.setItem('userId', 'test_user');
                window.location.href = data.authorizationUrl;
            }
        } catch (err) {
            console.error("ログインURL取得エラー", err);
        }
    },

    // ログアウト処理
    async logout(): Promise<void> {
        const userId = localStorage.getItem('userId') || 'test_user';
        try {
            await fetch('/api/google-fit/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
        } catch (err) { console.warn("Logout request failed", err); }
        
        localStorage.clear();
        window.location.href = '/login.html';
    },

    isLoggedIn(): boolean {
        return localStorage.getItem('isLoggedIn') === 'true';
    },

    // ログインガード
    checkGuard(): void {
        const path = window.location.pathname;
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const isPublicPage = path.endsWith('login.html') || path.endsWith('callback.html');
        
        // 未ログインで保護、ページならログイン画面へ
        if (!isLoggedIn && !isPublicPage) {
            window.location.href = '/login.html';
        }
        
        // ログイン済みなのにログイン画面にいるならスタート画面へ
        if (isLoggedIn && path.endsWith('login.html')) {
            window.location.href = '/pages/startmenu.html';
        }
    }
};
