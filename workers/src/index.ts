/**
 * Diagramer — Cloudflare Worker Entry Point
 *
 * 3つの責務:
 *   1. REST API (Hono)    — POST/GET /api/diagrams
 *   2. WebSocket routing  — /yjs/:id → DiagramRoom Durable Object
 *   3. Cron trigger       — 90日クリーンアップ
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'

// Durable Object を re-export（wrangler がバンドルに含める）
export { DiagramRoom } from './durable-objects/DiagramRoom'

const app = new Hono<{ Bindings: Env }>()

// ─── CORS ───
app.use('/api/*', cors({ origin: '*' }))

// ─── REST API ───

// POST /api/diagrams — 新規ダイアグラム作成
app.post('/api/diagrams', async (c) => {
  const id = crypto.randomUUID()

  await c.env.DB.prepare('INSERT INTO diagrams (id) VALUES (?)')
    .bind(id)
    .run()

  return c.json({ id }, 201)
})

// GET /api/diagrams/:id — 存在確認
app.get('/api/diagrams/:id', async (c) => {
  const { id } = c.req.param()

  const row = await c.env.DB.prepare(
    'SELECT id, created_at FROM diagrams WHERE id = ?',
  )
    .bind(id)
    .first<{ id: string; created_at: string }>()

  if (!row) {
    return c.json({ error: 'Diagram not found' }, 404)
  }

  // アクセス日時を更新
  await c.env.DB.prepare(
    "UPDATE diagrams SET last_accessed_at = datetime('now') WHERE id = ?",
  )
    .bind(id)
    .run()

  return c.json({ id: row.id, createdAt: row.created_at })
})

// ─── Version History ───

// GET /api/diagrams/:id/versions — バージョン一覧取得
app.get('/api/diagrams/:id/versions', async (c) => {
  const { id } = c.req.param()
  const result = await c.env.DB.prepare(
    'SELECT id, created_at, author_name, label, is_auto FROM diagram_versions WHERE diagram_id = ? ORDER BY created_at DESC LIMIT 100',
  ).bind(id).all<{ id: string; created_at: string; author_name: string | null; label: string | null; is_auto: number }>()
  return c.json({ versions: result.results })
})

// POST /api/diagrams/:id/versions — 手動スナップショット作成
app.post('/api/diagrams/:id/versions', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<{ label?: string; authorName?: string }>().catch(() => ({}))

  // Get current yjs_state from DO via storage query
  const doId = c.env.DIAGRAM_ROOM.idFromName(id)
  const stub = c.env.DIAGRAM_ROOM.get(doId)
  const stateRes = await stub.fetch(new Request('https://internal/snapshot', { method: 'POST' }))
  const stateBuf = await stateRes.arrayBuffer()
  if (!stateBuf.byteLength) return c.json({ error: 'Empty state' }, 400)

  const versionId = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO diagram_versions (id, diagram_id, yjs_state, author_name, label, is_auto) VALUES (?, ?, ?, ?, ?, 0)',
  ).bind(versionId, id, stateBuf, body.authorName ?? null, body.label ?? null).run()

  return c.json({ id: versionId }, 201)
})

// GET /api/diagrams/:id/versions/:versionId — 特定バージョン取得 (binary)
app.get('/api/diagrams/:id/versions/:versionId', async (c) => {
  const { versionId } = c.req.param()
  const row = await c.env.DB.prepare(
    'SELECT yjs_state FROM diagram_versions WHERE id = ?',
  ).bind(versionId).first<{ yjs_state: ArrayBuffer }>()
  if (!row) return c.json({ error: 'Version not found' }, 404)
  return new Response(row.yjs_state, { headers: { 'Content-Type': 'application/octet-stream' } })
})

// POST /api/diagrams/:id/restore/:versionId — 復元
app.post('/api/diagrams/:id/restore/:versionId', async (c) => {
  const { id, versionId } = c.req.param()
  const row = await c.env.DB.prepare(
    'SELECT yjs_state FROM diagram_versions WHERE id = ? AND diagram_id = ?',
  ).bind(versionId, id).first<{ yjs_state: ArrayBuffer }>()
  if (!row) return c.json({ error: 'Version not found' }, 404)

  const doId = c.env.DIAGRAM_ROOM.idFromName(id)
  const stub = c.env.DIAGRAM_ROOM.get(doId)
  await stub.fetch(new Request('https://internal/restore', {
    method: 'POST',
    body: row.yjs_state,
  }))

  return c.json({ ok: true })
})

// ─── WebSocket → Durable Object ───

// /yjs/:id へのリクエストを DiagramRoom DO にルーティング
app.get('/yjs/:id', async (c) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426)
  }

  const { id } = c.req.param()

  // ダイアグラムID から Durable Object ID を生成（同じ diagram → 同じ DO）
  const doId = c.env.DIAGRAM_ROOM.idFromName(id)
  const stub = c.env.DIAGRAM_ROOM.get(doId)

  // リクエストをそのまま DO に転送
  return stub.fetch(c.req.raw)
})

// ─── Scheduled (Cron) ───

const scheduled: ExportedHandler<Env>['scheduled'] = async (event, env, ctx) => {
  try {
    const result = await env.DB.prepare(
      "DELETE FROM diagrams WHERE last_accessed_at < datetime('now', '-90 days')",
    ).run()

    if (result.meta.changes > 0) {
      console.log(`[cleanup] Deleted ${result.meta.changes} expired diagrams`)
    }
  } catch (err) {
    console.error('[cleanup] Error:', err)
  }
}

// ─── Export ───

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Env>
