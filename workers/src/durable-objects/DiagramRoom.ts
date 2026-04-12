/**
 * DiagramRoom Durable Object
 *
 * 各ダイアグラムに1つのインスタンスが生成され、
 * WebSocket接続・Yjs同期・状態永続化を管理する。
 *
 * Hibernation API を使用:
 *   - WebSocket接続中でもDOがメモリから退避可能
 *   - 復帰時は D1 から Y.Doc を再ロード
 *   - alarm() API でデバウンスされたDB保存を実現
 */
import { DurableObject } from 'cloudflare:workers'
import * as Y from 'yjs'
import type { Env } from '../types'
import {
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  SYNC_STEP_1,
  SYNC_STEP_2,
  SYNC_UPDATE,
  encodeSyncStep1,
  encodeSyncStep2,
  encodeUpdate,
  encodeAwareness,
  readVarUint,
  readVarUint8Array,
  writeVarUint,
  writeVarUint8Array,
} from '../lib/yjs-protocol'

const MAX_CONNECTIONS = 10

export class DiagramRoom extends DurableObject<Env> {
  /** インメモリ Y.Doc — Hibernation復帰時は null になる */
  private doc: Y.Doc | null = null

  /** Awareness 状態（カーソル位置など） — 非永続 */
  private awareness: Map<number, unknown> = new Map()

  // ─── WebSocket Upgrade ───

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    // ダイアグラムID を URL から抽出し永続化
    const parts = url.pathname.split('/').filter(Boolean)
    const diagramId = parts[parts.length - 1]

    if (!diagramId || diagramId === 'yjs') {
      return new Response('Invalid diagram ID', { status: 400 })
    }

    // 初回のみ ID を DO Storage に保存（Hibernation 復帰用）
    const storedId = await this.ctx.storage.get<string>('diagramId')
    if (!storedId) {
      await this.ctx.storage.put('diagramId', diagramId)
    }

    // 接続数制限
    const existingWs = this.ctx.getWebSockets()
    if (existingWs.length >= MAX_CONNECTIONS) {
      return new Response('Too Many Connections', { status: 429 })
    }

    // WebSocket ペア作成
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Hibernation API でサーバーソケットを受理
    this.ctx.acceptWebSocket(server)

    // Y.Doc をロード（初回 or Hibernation復帰）
    await this.ensureDoc()

    // 新規クライアントに現在状態を送信
    server.send(encodeSyncStep1(this.doc!))

    if (this.awareness.size > 0) {
      server.send(encodeAwareness(this.awareness))
    }

    return new Response(null, { status: 101, webSocket: client })
  }

  // ─── Hibernation API: メッセージ受信 ───

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message === 'string') return

    const data = new Uint8Array(message)
    if (data.length === 0) return

    // Hibernation復帰時に doc を再ロード
    await this.ensureDoc()

    const [msgType, offset] = readVarUint(data, 0)

    if (msgType === MESSAGE_SYNC) {
      this.handleSyncMessage(ws, data, offset)
    } else if (msgType === MESSAGE_AWARENESS) {
      this.handleAwarenessMessage(ws, data, offset)
    }
  }

  // ─── Hibernation API: 切断 ───

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    ws.close(code, reason)

    const remaining = this.ctx.getWebSockets()
    if (remaining.length === 0) {
      // 全クライアント切断 → 最終保存
      await this.saveToDB()
      this.doc = null
      this.awareness.clear()
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[DiagramRoom] WebSocket error:', error)
    ws.close(1011, 'WebSocket error')
  }

  // ─── Alarm: デバウンスされた DB 保存 ───

  async alarm(): Promise<void> {
    await this.ensureDoc()
    await this.saveToDB()
  }

  // ─── 内部ロジック ───

  private handleSyncMessage(ws: WebSocket, data: Uint8Array, offset: number): void {
    const [syncType, off2] = readVarUint(data, offset)
    const [payload] = readVarUint8Array(data, off2)

    if (syncType === SYNC_STEP_1) {
      // クライアントのstate vector受信 → 不足分を返送
      const step2 = encodeSyncStep2(this.doc!, payload)
      ws.send(step2)
    } else if (syncType === SYNC_STEP_2 || syncType === SYNC_UPDATE) {
      // クライアントからの更新 → 適用＆ブロードキャスト
      Y.applyUpdate(this.doc!, payload)
      const updateMsg = encodeUpdate(payload)
      this.broadcast(updateMsg, ws)
      this.scheduleDbSave()
    }
  }

  private handleAwarenessMessage(ws: WebSocket, data: Uint8Array, offset: number): void {
    const [payload] = readVarUint8Array(data, offset)

    // Awareness メッセージをそのままブロードキャスト
    const buf: number[] = []
    writeVarUint(buf, MESSAGE_AWARENESS)
    writeVarUint8Array(buf, payload)
    this.broadcast(new Uint8Array(buf), ws)
  }

  private broadcast(msg: Uint8Array, except?: WebSocket): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except) {
        try {
          ws.send(msg)
        } catch {
          // 送信失敗は無視（次の close イベントでクリーンアップ）
        }
      }
    }
  }

  private async ensureDoc(): Promise<void> {
    if (this.doc) return

    this.doc = new Y.Doc()

    const diagramId = await this.ctx.storage.get<string>('diagramId')
    if (!diagramId) return

    try {
      const result = await this.env.DB.prepare(
        'SELECT yjs_state FROM diagrams WHERE id = ?',
      )
        .bind(diagramId)
        .first<{ yjs_state: ArrayBuffer | null }>()

      if (result?.yjs_state) {
        Y.applyUpdate(this.doc, new Uint8Array(result.yjs_state))
      }

      // アクセス日時を更新
      await this.env.DB.prepare(
        "UPDATE diagrams SET last_accessed_at = datetime('now') WHERE id = ?",
      )
        .bind(diagramId)
        .run()
    } catch (err) {
      console.error('[DiagramRoom] DB load error:', err)
    }
  }

  private async saveToDB(): Promise<void> {
    if (!this.doc) return

    const diagramId = await this.ctx.storage.get<string>('diagramId')
    if (!diagramId) return

    try {
      const state = Y.encodeStateAsUpdate(this.doc)
      await this.env.DB.prepare(
        "UPDATE diagrams SET yjs_state = ?, last_accessed_at = datetime('now') WHERE id = ?",
      )
        .bind(state, diagramId)
        .run()
    } catch (err) {
      console.error('[DiagramRoom] DB save error:', err)
    }
  }

  private async scheduleDbSave(): Promise<void> {
    // Alarm API でデバウンス（1秒後に保存）
    // 複数回呼ばれても最後の1回だけ実行される
    try {
      await this.ctx.storage.setAlarm(Date.now() + 1000)
    } catch {
      // alarm が既にセットされている場合など → 無視
    }
  }
}
