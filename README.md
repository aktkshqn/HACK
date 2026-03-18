```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

D1 + Google Fit用APIエンドポイント

1. `GET /migrate`: D1テーブルを作成します（初回のみ実行）。
2. `GET /google-fit/auth-url`: Google OAuth2認証URLを返します。
3. `POST /google-fit/token`:
   - JSON body: `{ "user_id": "...", "code": "..." }`
   - Google Fitのアクセストークンを取得し、`google_fit_tokens`に保存します。
4. `GET /exercise-records?user_id=...`: 運動記録一覧を取得。
5. `POST /exercise-records`:
   - JSON body例:
     `{ "user_id": "u1", "activity_type": "running", "start_time": "2026-03-17T08:00:00Z", "end_time": "2026-03-17T08:30:00Z", "calories_burned": 250, "notes": "morning run" }`
6. `GET /exercise-records/:id?user_id=...`: 単一レコード取得。

