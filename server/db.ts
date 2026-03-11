import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected pool error — client will be removed from pool:', err.message);
});

// Warm up the pool immediately so the first request doesn't hit a cold connection.
pool.connect().then(c => { c.query('SELECT 1').then(() => c.release()).catch(() => c.release()); }).catch(() => {});

// Keepalive: periodically run a lightweight query to prevent idle WebSocket connections
// from going stale (Neon's proxy can close idle WS connections after ~60s).
const KEEPALIVE_INTERVAL_MS = 45_000;
setInterval(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch {
    // Pool will evict the dead connection automatically
  }
}, KEEPALIVE_INTERVAL_MS);

export const db = drizzle({ client: pool, schema });