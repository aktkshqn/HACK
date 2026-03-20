import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { Env } from './types'

// 各機能のルートをインポート
import googleFit from './routes/google-fit'
import exercise from './routes/exercise'
import gemini from './routes/gemini'
import dev from './routes/dev'

// @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'

const app = new Hono<{ Bindings: Env }>()

// --- API ルートの登録 ---
app.route('/api/google-fit', googleFit)
app.route('/api/exercise-records', exercise)
app.route('/api/gemini', gemini)
app.route('/api/dev', dev)

// 互換性・エイリアスのためのルート (以前の /ai など)
app.get('/api/ai', (c) => c.redirect('/api/gemini/test'))

app.get('/api/migrate', (c) => c.redirect('/api/dev/migrate'))

// --- 静的ファイルとルーティング ---
// ディレクトリごとに明示的に静的ファイルを配信
app.use('/img/*', serveStatic({ root: './', manifest }))
app.use('/pages/*', serveStatic({ root: './', manifest }))
app.use('/js/*', serveStatic({ root: './', manifest }))
app.use('/css/*', serveStatic({ root: './', manifest }))
app.use('/login.html', serveStatic({ root: './', manifest }))
app.use('/callback.html', serveStatic({ root: './', manifest }))

app.get('/', (c) => c.redirect('/login.html'))

export default app
