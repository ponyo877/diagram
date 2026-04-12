import type { DiagramRoom } from './durable-objects/DiagramRoom'

export interface Env {
  DB: D1Database
  DIAGRAM_ROOM: DurableObjectNamespace<DiagramRoom>
}
