#!/usr/bin/env node
/**
 * dev-start.mjs
 *
 * Single canonical dev server launcher. Used by both the workflow and
 * manual shell invocations (`./dev-start.mjs` from ~/workspace).
 *
 * Handles:
 *  1. Killing any stale tsx/server/proxy processes before starting
 *  2. Starting dev-ws-proxy.mjs as a managed child process
 *  3. Starting the Express/Vite server via tsx with dev-preload.mjs
 *  4. Forwarding SIGINT/SIGTERM so both children exit cleanly
 */

import { spawn, execSync } from 'child_process';

// --- 1. Kill stale processes by name (avoids fuser which segfaults on NixOS) ---
const stalePatterns = [
  "tsx.*server/index",
  "dev-ws-proxy",
  "node.*server/index",
];
for (const pattern of stalePatterns) {
  try { execSync(`pkill -f '${pattern}' 2>/dev/null`); } catch (_) { /* nothing to kill */ }
}

// Brief pause so the OS reclaims ports before we bind them
await new Promise((r) => setTimeout(r, 1500));

// --- 2. Start child processes ---
function spawnChild(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  child.on('error', (err) =>
    console.error(`[dev-start] Child error (${cmd}):`, err.message)
  );
  return child;
}

const proxy = spawnChild('node', ['dev-ws-proxy.mjs']);

// Give the proxy a moment to bind its port
await new Promise((r) => setTimeout(r, 500));

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

// --- 3. Forward signals so both children exit when the workflow stops ---
function shutdown(signal) {
  proxy.kill(signal);
  server.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('exit', (code) => process.exit(code ?? 0));
