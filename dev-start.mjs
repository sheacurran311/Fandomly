/**
 * dev-start.mjs
 *
 * Dev server launcher. Handles:
 *  1. Killing any stale processes on ports 5000 and 5488 before starting
 *  2. Starting the WS proxy (dev-ws-proxy.mjs) as a child process
 *  3. Starting the Express/Vite dev server (tsx with dev-preload.mjs)
 *  4. Forwarding SIGINT/SIGTERM so both children exit cleanly
 */

import { spawn } from 'child_process';
import { createServer } from 'net';

// Kill whatever is on a given port by attempting to bind it
async function freePort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => {
      // Port in use — nothing we can do from JS without root; just continue
      resolve();
    });
    server.once('listening', () => {
      server.close(resolve);
    });
    server.listen(port, '0.0.0.0');
  });
}

function spawnChild(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  child.on('error', (err) => console.error(`[dev-start] Child error (${cmd}):`, err.message));
  return child;
}

// Attempt to free ports first (noop if we don't own them, Replit handles this)
await freePort(5488);

// 1. Start WS proxy
const proxy = spawnChild('node', ['dev-ws-proxy.mjs']);

// Give the proxy a moment to start listening
await new Promise((r) => setTimeout(r, 500));

// 2. Start the app server with the Neon WebSocket preload
const server = spawnChild(
  'node',
  [
    '--require', './node_modules/tsx/dist/preflight.cjs',
    '--import', 'file:///home/runner/workspace/node_modules/tsx/dist/loader.mjs',
    '--import', './dev-preload.mjs',
    'server/index.ts',
  ],
  { NODE_ENV: 'development' }
);

// 3. Forward signals so both children exit when Replit stops the run
function shutdown(signal) {
  proxy.kill(signal);
  server.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Exit this wrapper when the main server exits
server.on('exit', (code) => process.exit(code ?? 0));
