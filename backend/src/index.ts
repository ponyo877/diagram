import Fastify from 'fastify'
import cors from '@fastify/cors'
import { WebSocketServer } from 'ws'
import diagramRoutes from './routes/diagrams'
import { db } from './db'
import { handleYjsConnection } from './websocket/yjsHandler'
import { startCleanupJob } from './cron/cleanup'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
})

const start = async () => {
  await app.register(cors, {
    origin: true,
  })

  await app.register(diagramRoutes, { prefix: '/api/diagrams' })

  const port = Number(process.env.PORT) || 3001

  try {
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Backend listening on port ${port}`)

    // Attach WebSocket server to the same HTTP server
    const wss = new WebSocketServer({ server: app.server })

    wss.on('connection', (ws, req) => {
      const url = req.url ?? ''
      console.log(`[ws] New connection: ${url}`)
      if (url.startsWith('/yjs')) {
        handleYjsConnection(ws, req, db).catch((err) => {
          console.error('[yjs] Connection handler error:', err)
          ws.close(1011, 'Internal error')
        })
      } else {
        ws.close(4404, 'Not found')
      }
    })

    wss.on('error', (err) => {
      console.error('[wss] Server error:', err)
    })

    console.log('WebSocket server attached (path: /yjs)')

    // Start 90-day cleanup job
    startCleanupJob(db)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
