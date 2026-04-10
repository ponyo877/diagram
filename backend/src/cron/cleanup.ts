import type { Pool } from 'pg'

const INTERVAL_MS = 24 * 60 * 60 * 1000 // 1 day

export function startCleanupJob(pool: Pool) {
  const run = async () => {
    try {
      const result = await pool.query(
        `DELETE FROM diagrams WHERE last_accessed_at < NOW() - INTERVAL '90 days'`,
      )
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[cleanup] Deleted ${result.rowCount} expired diagrams`)
      }
    } catch (err) {
      console.error('[cleanup] Error during cleanup:', err)
    }
  }

  // Run once at startup, then every 24h
  run()
  setInterval(run, INTERVAL_MS)
}
