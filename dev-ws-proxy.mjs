import { WebSocketServer } from 'ws';
import net from 'net';

const WS_PORT = parseInt(process.env.WS_PROXY_PORT || '5488', 10);
const PG_HOST = process.env.PG_HOST || process.env.PGHOST || 'localhost';
const PG_PORT = parseInt(process.env.PG_PORT || '5432', 10);

function startProxy() {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Another proxy instance is already running on this port — that's fine.
      // The Neon driver will connect to it. Exit cleanly so the parent npm
      // process continues without crashing.
      console.log(`[ws-proxy] Port ${WS_PORT} already in use — existing proxy will be used.`);
      process.exit(0);
    }
    console.error('[ws-proxy] Error:', err.message);
  });

  wss.on('listening', () => {
    console.log(`[ws-proxy] WebSocket-to-PostgreSQL proxy listening on port ${WS_PORT} -> ${PG_HOST}:${PG_PORT}`);
  });

  wss.on('connection', (ws) => {
    const socket = net.createConnection({ host: PG_HOST, port: PG_PORT }, () => {
      ws.on('message', (data) => {
        socket.write(data);
      });

      socket.on('data', (data) => {
        if (ws.readyState === 1) {
          ws.send(data);
        }
      });
    });

    socket.on('error', () => ws.close());
    socket.on('close', () => ws.close());
    ws.on('close', () => socket.destroy());
    ws.on('error', () => socket.destroy());
  });
}

startProxy();
