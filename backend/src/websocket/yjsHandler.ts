import * as Y from 'yjs'
import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Pool } from 'pg'

// Yjs sync protocol constants
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const SYNC_STEP_1 = 0
const SYNC_STEP_2 = 1
const SYNC_UPDATE = 2
const DEBOUNCE_MS = 1000

interface RoomState {
  doc: Y.Doc
  awareness: Map<number, unknown>
  conns: Set<WebSocket>
  saveTimer: ReturnType<typeof setTimeout> | null
}

const rooms = new Map<string, RoomState>()

// --- varint encoding (lib0 subset) ---
function writeVarUint(buf: number[], n: number) {
  while (n > 127) {
    buf.push((n & 127) | 128)
    n >>>= 7
  }
  buf.push(n)
}

function readVarUint(data: Uint8Array, offset: number): [number, number] {
  let result = 0
  let shift = 0
  let byte: number
  do {
    byte = data[offset++]
    result |= (byte & 127) << shift
    shift += 7
  } while (byte & 128)
  return [result, offset]
}

function writeVarUint8Array(buf: number[], arr: Uint8Array) {
  writeVarUint(buf, arr.byteLength)
  for (const b of arr) buf.push(b)
}

function readVarUint8Array(data: Uint8Array, offset: number): [Uint8Array, number] {
  const [len, off] = readVarUint(data, offset)
  return [data.slice(off, off + len), off + len]
}

// --- message builders ---
function encodeSyncStep1(doc: Y.Doc): Uint8Array {
  const sv = Y.encodeStateVector(doc)
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_SYNC)
  writeVarUint(buf, SYNC_STEP_1)
  writeVarUint8Array(buf, sv)
  return new Uint8Array(buf)
}

function encodeSyncStep2(doc: Y.Doc, sv: Uint8Array): Uint8Array {
  const update = Y.encodeStateAsUpdate(doc, sv)
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_SYNC)
  writeVarUint(buf, SYNC_STEP_2)
  writeVarUint8Array(buf, update)
  return new Uint8Array(buf)
}

function encodeUpdate(update: Uint8Array): Uint8Array {
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_SYNC)
  writeVarUint(buf, SYNC_UPDATE)
  writeVarUint8Array(buf, update)
  return new Uint8Array(buf)
}

function encodeAwareness(states: Map<number, unknown>): Uint8Array {
  const entries = Array.from(states.entries())
  const payload: number[] = []
  writeVarUint(payload, entries.length)
  for (const [clientId, state] of entries) {
    writeVarUint(payload, clientId)
    const json = JSON.stringify(state)
    const encoded = new TextEncoder().encode(json)
    writeVarUint8Array(payload, encoded)
    writeVarUint(payload, 0) // clock (simplified)
  }
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_AWARENESS)
  writeVarUint8Array(buf, new Uint8Array(payload))
  return new Uint8Array(buf)
}

function sendMsg(ws: WebSocket, msg: Uint8Array) {
  if (ws.readyState === ws.OPEN) {
    ws.send(msg)
  }
}

function broadcast(room: RoomState, msg: Uint8Array, except?: WebSocket) {
  for (const conn of room.conns) {
    if (conn !== except) sendMsg(conn, msg)
  }
}

async function loadFromDb(diagramId: string, doc: Y.Doc, pool: Pool) {
  try {
    const result = await pool.query(
      'SELECT yjs_state FROM diagrams WHERE id = $1',
      [diagramId],
    )
    if (result.rows[0]?.yjs_state) {
      Y.applyUpdate(doc, Buffer.from(result.rows[0].yjs_state))
    }
    await pool.query(
      'UPDATE diagrams SET last_accessed_at = NOW() WHERE id = $1',
      [diagramId],
    )
  } catch (err) {
    console.error('[yjs] DB load error:', err)
  }
}

async function saveToDb(diagramId: string, doc: Y.Doc, pool: Pool) {
  try {
    const state = Y.encodeStateAsUpdate(doc)
    await pool.query(
      'UPDATE diagrams SET yjs_state = $1, last_accessed_at = NOW() WHERE id = $2',
      [Buffer.from(state), diagramId],
    )
  } catch (err) {
    console.error('[yjs] DB save error:', err)
  }
}

function scheduleDbSave(diagramId: string, doc: Y.Doc, pool: Pool) {
  const room = rooms.get(diagramId)
  if (!room) return
  if (room.saveTimer) clearTimeout(room.saveTimer)
  room.saveTimer = setTimeout(() => {
    saveToDb(diagramId, doc, pool)
    room.saveTimer = null
  }, DEBOUNCE_MS)
}

export async function handleYjsConnection(ws: WebSocket, req: IncomingMessage, pool: Pool) {
  // Extract diagramId from URL: /yjs/DIAGRAM_ID
  const parts = (req.url ?? '').split('/').filter(Boolean)
  const diagramId = parts[parts.length - 1]

  if (!diagramId || diagramId === 'yjs') {
    ws.close(4000, 'Invalid diagram ID')
    return
  }

  // Get or create room
  let room = rooms.get(diagramId)
  const isNew = !room
  if (!room) {
    room = {
      doc: new Y.Doc(),
      awareness: new Map(),
      conns: new Set(),
      saveTimer: null,
    }
    rooms.set(diagramId, room)
  }

  // Load from DB on first connection to this room
  if (isNew) {
    await loadFromDb(diagramId, room.doc, pool)
  }

  // Connection limit: max 10
  if (room.conns.size >= 10) {
    ws.close(4429, 'Too Many Connections')
    return
  }

  room.conns.add(ws)
  ws.binaryType = 'arraybuffer'

  // Send sync step 1 to new client
  sendMsg(ws, encodeSyncStep1(room.doc))

  // Send current awareness to new client
  if (room.awareness.size > 0) {
    sendMsg(ws, encodeAwareness(room.awareness))
  }

  ws.on('message', (rawMsg: ArrayBuffer | Buffer) => {
    const data = rawMsg instanceof ArrayBuffer ? new Uint8Array(rawMsg) : new Uint8Array(rawMsg)
    if (data.length === 0) return

    let [msgType, offset] = readVarUint(data, 0)

    if (msgType === MESSAGE_SYNC) {
      const [syncType, off2] = readVarUint(data, offset)
      const [payload] = readVarUint8Array(data, off2)

      if (syncType === SYNC_STEP_1) {
        // Client sent its state vector → respond with missing updates
        const step2 = encodeSyncStep2(room!.doc, payload)
        sendMsg(ws, step2)
      } else if (syncType === SYNC_STEP_2 || syncType === SYNC_UPDATE) {
        // Client sent updates → apply and broadcast
        Y.applyUpdate(room!.doc, payload)
        const updateMsg = encodeUpdate(payload)
        broadcast(room!, updateMsg, ws)
        scheduleDbSave(diagramId, room!.doc, pool)
      }
    } else if (msgType === MESSAGE_AWARENESS) {
      // Awareness update: parse and broadcast as-is
      const [payload] = readVarUint8Array(data, offset)
      // Simple parse: just re-broadcast the awareness message
      const buf: number[] = []
      writeVarUint(buf, MESSAGE_AWARENESS)
      writeVarUint8Array(buf, payload)
      const msg = new Uint8Array(buf)
      broadcast(room!, msg, ws)
    }
  })

  ws.on('close', () => {
    room!.conns.delete(ws)
    if (room!.conns.size === 0) {
      // All clients left: save final state and clean up room
      if (room!.saveTimer) {
        clearTimeout(room!.saveTimer)
        room!.saveTimer = null
      }
      saveToDb(diagramId, room!.doc, pool)
      rooms.delete(diagramId)
    }
  })

  ws.on('error', (err) => {
    console.error('[yjs] WebSocket error:', err)
    room!.conns.delete(ws)
  })
}
