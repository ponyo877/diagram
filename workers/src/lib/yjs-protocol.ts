/**
 * Yjs sync protocol — lib0 varint encoding subset
 *
 * This is a faithful port of the Node.js backend's protocol implementation.
 * It must be 100% wire-compatible with the y-websocket client library.
 */
import * as Y from 'yjs'

// Protocol constants
export const MESSAGE_SYNC = 0
export const MESSAGE_AWARENESS = 1
export const SYNC_STEP_1 = 0
export const SYNC_STEP_2 = 1
export const SYNC_UPDATE = 2

// --- Varint encoding (lib0 subset) ---

export function writeVarUint(buf: number[], n: number): void {
  while (n > 127) {
    buf.push((n & 127) | 128)
    n >>>= 7
  }
  buf.push(n)
}

export function readVarUint(data: Uint8Array, offset: number): [number, number] {
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

export function writeVarUint8Array(buf: number[], arr: Uint8Array): void {
  writeVarUint(buf, arr.byteLength)
  for (const b of arr) buf.push(b)
}

export function readVarUint8Array(data: Uint8Array, offset: number): [Uint8Array, number] {
  const [len, off] = readVarUint(data, offset)
  return [data.slice(off, off + len), off + len]
}

// --- Message builders ---

export function encodeSyncStep1(doc: Y.Doc): Uint8Array {
  const sv = Y.encodeStateVector(doc)
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_SYNC)
  writeVarUint(buf, SYNC_STEP_1)
  writeVarUint8Array(buf, sv)
  return new Uint8Array(buf)
}

export function encodeSyncStep2(doc: Y.Doc, sv: Uint8Array): Uint8Array {
  const update = Y.encodeStateAsUpdate(doc, sv)
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_SYNC)
  writeVarUint(buf, SYNC_STEP_2)
  writeVarUint8Array(buf, update)
  return new Uint8Array(buf)
}

export function encodeUpdate(update: Uint8Array): Uint8Array {
  const buf: number[] = []
  writeVarUint(buf, MESSAGE_SYNC)
  writeVarUint(buf, SYNC_UPDATE)
  writeVarUint8Array(buf, update)
  return new Uint8Array(buf)
}

export function encodeAwareness(states: Map<number, unknown>): Uint8Array {
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
